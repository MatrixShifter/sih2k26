"""Structured eligibility requirements extracted from a tender."""

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TenderRequirement(Base):
    __tablename__ = "tender_requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), nullable=False, index=True)
    requirement: Mapped[str] = mapped_column(String(500), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    mandatory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    required_value: Mapped[Optional[str]] = mapped_column(String(255))
    comparison_operator: Mapped[Optional[str]] = mapped_column(String(20), default=">=")
    weight: Mapped[Optional[float]] = mapped_column(default=10.0)
    threshold: Mapped[Optional[float]] = mapped_column()
    currency: Mapped[Optional[str]] = mapped_column(String(8))
    evidence_types: Mapped[Optional[Any]] = mapped_column(JSON)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tender = relationship("Tender", back_populates="requirements")
