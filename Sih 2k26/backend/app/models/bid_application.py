"""A bidder's application against a GeM tender."""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.dbtypes import str_enum


class BidStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    CLARIFICATION = "clarification"
    APPROVED = "approved"
    REJECTED = "rejected"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"


class BidApplication(Base):
    __tablename__ = "bid_applications"
    __table_args__ = (UniqueConstraint("tender_id", "bidder_id", name="uq_bid_tender_bidder"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), nullable=False, index=True)
    bidder_id: Mapped[int] = mapped_column(ForeignKey("bidders.id"), nullable=False, index=True)
    status: Mapped[BidStatus] = mapped_column(str_enum(BidStatus, "bid_status"), default=BidStatus.SUBMITTED)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        str_enum(VerificationStatus, "verification_status"),
        default=VerificationStatus.PENDING,
    )
    decision_notes: Mapped[Optional[str]] = mapped_column(Text)
    override_reason: Mapped[Optional[str]] = mapped_column(Text)
    decided_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tender = relationship("Tender", back_populates="applications")
    bidder = relationship("Bidder", back_populates="applications")
    documents = relationship("Document", back_populates="bid", cascade="all, delete-orphan")
    compliance_checks = relationship("ComplianceCheck", back_populates="bid", cascade="all, delete-orphan")
    verification_results = relationship("VerificationResult", back_populates="bid", cascade="all, delete-orphan")
    decided_by = relationship("User")
