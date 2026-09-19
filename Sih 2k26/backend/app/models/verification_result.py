"""Per-document / per-check verification artefacts."""

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bid_id: Mapped[int] = mapped_column(ForeignKey("bid_applications.id"), nullable=False, index=True)
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("documents.id"))
    check_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    simulated: Mapped[bool] = mapped_column(default=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[Optional[Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    bid = relationship("BidApplication", back_populates="verification_results")
