from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(Text, nullable=False)
    agent = Column(String, nullable=False)
    retrieved_docs = Column(Text, nullable=False, default="[]")
    guardrail_hit = Column(Boolean, default=False, nullable=False)
    response = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
