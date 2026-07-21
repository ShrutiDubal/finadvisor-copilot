import json
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.agent import AgentRunRequest
from app.schemas.chat import ChatRequest
from app.schemas.guardrail import GuardrailCheckRequest
from app.schemas.rag import RetrieveRequest
from app.db.session import get_db
from app.deps.auth import get_current_user
from app.models.audit_log import AuditLog
from app.models.chat_message import ChatMessage
from app.models.user import User
from app.services.compliance_guardrail import build_safe_fallback, detect_guardrail_hit
from app.services.agent_service import run_agent_pipeline
from app.services.rag_service import rag_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/status")
def chat_status():
    return {"message": "Chat router ready for Phase 6 pipeline with RAG initialized"}


@router.get("/history")
def chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
) -> dict:
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.id.asc())
        .limit(limit)
        .all()
    )
    return {
        "messages": [
            {
                "id": m.id,
                "query": m.query,
                "response": m.response,
                "agent_used": m.agent_used,
                "guardrail_triggered": m.guardrail_triggered,
            }
            for m in messages
        ]
    }


@router.post("/retrieve")
def retrieve_context(payload: RetrieveRequest):
    results = rag_service.retrieve(payload.query, payload.top_k)
    return {"query": payload.query, "results": results}


@router.post("/guardrail-check")
def guardrail_check(payload: GuardrailCheckRequest):
    retrieved = rag_service.retrieve(payload.query, top_k=3)
    guardrail_hit = detect_guardrail_hit(payload.query)
    if guardrail_hit:
        safe_response = build_safe_fallback(retrieved)
        return {
            "guardrail_triggered": True,
            "response": safe_response,
            "retrieved_docs": retrieved,
        }

    return {
        "guardrail_triggered": False,
        "message": "No restricted compliance phrase detected. Continue to routing.",
        "retrieved_docs": retrieved,
    }


@router.post("/agent-run")
def run_agent(payload: AgentRunRequest) -> dict[str, Any]:
    result = run_agent_pipeline(
        query=payload.query,
        agent_selection=payload.agent,
        top_k=payload.top_k,
    )
    return result


@router.post("")
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    retrieved_docs = rag_service.retrieve(payload.query, top_k=payload.top_k)
    guardrail_triggered = detect_guardrail_hit(payload.query)

    if guardrail_triggered:
        agent_used = "guardrail_blocked"
        response_text = build_safe_fallback(retrieved_docs)
    else:
        agent_result = run_agent_pipeline(
            query=payload.query,
            agent_selection=payload.agent,
            top_k=payload.top_k,
        )
        agent_used = str(agent_result["agent_used"])
        retrieved_docs = list(agent_result["retrieved_docs"])
        response_text = str(agent_result["response"])

        if detect_guardrail_hit(response_text):
            guardrail_triggered = True
            response_text = build_safe_fallback(retrieved_docs)

    audit = AuditLog(
        query=payload.query,
        agent=agent_used,
        retrieved_docs=json.dumps(retrieved_docs),
        guardrail_hit=guardrail_triggered,
        response=response_text,
    )
    db.add(audit)

    chat_message = ChatMessage(
        user_id=current_user.id,
        query=payload.query,
        agent_used=agent_used,
        response=response_text,
        guardrail_triggered=guardrail_triggered,
    )
    db.add(chat_message)
    db.commit()

    return {
        "query": payload.query,
        "agent_used": agent_used,
        "guardrail_triggered": guardrail_triggered,
        "response": response_text,
        "retrieved_docs": retrieved_docs,
    }
