"""Immutable, cryptographically chained tamper-evident audit trail."""

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sequence_number: Mapped[Optional[int]] = mapped_column(Integer, index=True, nullable=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), index=True)
    actor_role: Mapped[Optional[str]] = mapped_column(String(60))
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)
    bid_id: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    result: Mapped[Optional[str]] = mapped_column(String(40), index=True)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Value transitions and justification
    previous_value: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    new_value: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra: Mapped[Optional[Any]] = mapped_column(JSON)
    
    # Cryptographic chaining (SHA-256)
    previous_event_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    event_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    actor = relationship("User")
