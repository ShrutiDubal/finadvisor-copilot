from pydantic import BaseModel, Field


class RetrieveRequest(BaseModel):
    query: str = Field(min_length=2)
    top_k: int = Field(default=3, ge=1, le=10)
