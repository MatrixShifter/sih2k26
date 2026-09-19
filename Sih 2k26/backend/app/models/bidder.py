"""Registered GeM sellers / MSME bidders."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Bidder(Base):
    __tablename__ = "bidders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    trade_name: Mapped[Optional[str]] = mapped_column(String(255))
    registered_address: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(String(80), nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    director_name: Mapped[Optional[str]] = mapped_column(String(255))
    annual_turnover_inr: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    years_experience: Mapped[Optional[int]] = mapped_column(Integer)
    udyam_number: Mapped[Optional[str]] = mapped_column(String(32), index=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(15), index=True)
    pan: Mapped[Optional[str]] = mapped_column(String(10), index=True)
    cin: Mapped[Optional[str]] = mapped_column(String(21))
    nsic_registration: Mapped[Optional[str]] = mapped_column(String(40))
    dpiit_startup_number: Mapped[Optional[str]] = mapped_column(String(40))
    epfo_code: Mapped[Optional[str]] = mapped_column(String(40))
    esic_code: Mapped[Optional[str]] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    users = relationship("User", back_populates="bidder")
    applications = relationship("BidApplication", back_populates="bidder", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="bidder", cascade="all, delete-orphan")
    compliance_checks = relationship("ComplianceCheck", back_populates="bidder", cascade="all, delete-orphan")
