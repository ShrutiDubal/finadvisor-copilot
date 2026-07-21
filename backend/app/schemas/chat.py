from typing import Literal

from pydantic import BaseModel, Field

AgentPreference = Literal["auto", "portfolio", "client_research", "market_context"]


class ChatRequest(BaseModel):
    query: str = Field(min_length=2)
    agent: AgentPreference = "auto"
    top_k: int = Field(default=3, ge=1, le=10)
