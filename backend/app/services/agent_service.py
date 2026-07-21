from typing import Dict, List, Literal

from app.services.agent_router import classify_query
from app.services.llm_service import generate_with_gemini
from app.services.rag_service import rag_service

AgentType = Literal["portfolio", "client_research", "market_context"]

DOMAIN_HINTS: dict[AgentType, str] = {
    "portfolio": "portfolio exposure risk holdings allocation",
    "client_research": "client profile goals suitability history",
    "market_context": "fund factsheet market summary performance rates",
}


def run_agent_pipeline(
    query: str, agent_selection: Literal["auto", "portfolio", "client_research", "market_context"], top_k: int
) -> Dict[str, object]:
    agent_used: AgentType = (
        classify_query(query) if agent_selection == "auto" else agent_selection
    )
    retrieved_docs = rag_service.retrieve(query, top_k=top_k)
    response = generate_with_gemini(query, retrieved_docs)
    return {
        "agent_used": agent_used,
        "retrieved_docs": retrieved_docs,
        "response": response,
    }
