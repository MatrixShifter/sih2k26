"""Vigilance and relationship detection action logs."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class VigilanceAction(Base):
    __tablename__ = "vigilance_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    officer_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    officer_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
