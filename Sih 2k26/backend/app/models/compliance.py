"""AI verification outcome for a bid application."""

import enum
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.dbtypes import str_enum


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Recommendation(str, enum.Enum):
    APPROVE = "approve"
    REQUEST_CLARIFICATION = "request_clarification"
    REJECT = "reject"


class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bidder_id: Mapped[int] = mapped_column(ForeignKey("bidders.id"), nullable=False, index=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), nullable=False, index=True)
    bid_id: Mapped[int] = mapped_column(ForeignKey("bid_applications.id"), nullable=False, index=True)
    overall_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(5, 2), default=80)
    risk_level: Mapped[RiskLevel] = mapped_column(str_enum(RiskLevel, "risk_level"), nullable=False)
    recommendation: Mapped[Recommendation] = mapped_column(str_enum(Recommendation, "recommendation"), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    score_breakdown: Mapped[Any] = mapped_column(JSON, nullable=False)
    requirement_results: Mapped[Any] = mapped_column(JSON, nullable=False)
    contradictions: Mapped[Any] = mapped_column(JSON, nullable=False)
    risk_factors: Mapped[Any] = mapped_column(JSON, nullable=False)
    related_bidders: Mapped[Any] = mapped_column(JSON, default=list)
    findings: Mapped[Any] = mapped_column(JSON, nullable=False)
    triggered_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    bidder = relationship("Bidder", back_populates="compliance_checks")
    bid = relationship("BidApplication", back_populates="compliance_checks")
    triggered_by = relationship("User")
