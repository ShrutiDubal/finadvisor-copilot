from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func

from app.db.base import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    query = Column(Text, nullable=False)
    agent_used = Column(String, nullable=False)
    response = Column(Text, nullable=False)
    guardrail_triggered = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
