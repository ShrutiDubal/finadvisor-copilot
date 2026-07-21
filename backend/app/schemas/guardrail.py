from pydantic import BaseModel, Field


class GuardrailCheckRequest(BaseModel):
    query: str = Field(min_length=2)
