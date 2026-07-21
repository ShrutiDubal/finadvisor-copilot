from typing import Literal

from pydantic import BaseModel, Field

AgentType = Literal["auto", "portfolio", "client_research", "market_context"]


class AgentRunRequest(BaseModel):
    query: str = Field(min_length=2)
    agent: AgentType = "auto"
    top_k: int = Field(default=3, ge=1, le=10)
