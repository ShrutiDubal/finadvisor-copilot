from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user
from app.db.session import get_db
from app.models.chat_message import ChatMessage
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/status")
def logs_status(current_user: User = Depends(get_current_user)):
    return {
        "message": "Logs router protected and ready for audit retrieval",
        "user": current_user.email,
    }


@router.get("")
def get_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.timestamp.desc())
        .all()
    )
    return [
        {
            "id": item.id,
            "query": item.query,
            "agent_used": item.agent_used,
            "response": item.response,
            "guardrail_triggered": item.guardrail_triggered,
            "timestamp": item.timestamp,
        }
        for item in messages
    ]
