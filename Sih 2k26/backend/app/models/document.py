"""Eligibility documents uploaded against a bid application."""

import enum
from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.dbtypes import str_enum


class DocumentType(str, enum.Enum):
    UDYAM = "udyam"
    GST = "gst"
    PAN = "pan"
    MCA21 = "mca21"
    EPFO = "epfo"
    ESIC = "esic"
    DIGILOCKER = "digilocker"
    NSIC = "nsic"
    STARTUP_INDIA = "startup_india"
    FINANCIAL = "financial"
    EXPERIENCE = "experience"
    WORK_ORDER = "work_order"
    OEM = "oem"
    TECHNICAL = "technical"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    VERIFIED = "verified"
    FAILED = "failed"


class ExpiryState(str, enum.Enum):
    VALID = "valid"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    UNKNOWN = "unknown"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bidder_id: Mapped[int] = mapped_column(ForeignKey("bidders.id"), nullable=False, index=True)
    bid_id: Mapped[int] = mapped_column(ForeignKey("bid_applications.id"), nullable=False, index=True)
    document_type: Mapped[DocumentType] = mapped_column(str_enum(DocumentType, "document_type"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[DocumentStatus] = mapped_column(
        str_enum(DocumentStatus, "document_status"),
        default=DocumentStatus.UPLOADED,
    )
    issued_name: Mapped[Optional[str]] = mapped_column(String(255))
    expiry_date: Mapped[Optional[date]] = mapped_column(Date)
    expiry_state: Mapped[str] = mapped_column(String(20), default="unknown")
    integrity_status: Mapped[str] = mapped_column(String(20), default="pending")
    sha256_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_doc_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    validation_results: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    extracted_fields: Mapped[Optional[Any]] = mapped_column(JSON)
    uploaded_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    bidder = relationship("Bidder", back_populates="documents")
    bid = relationship("BidApplication", back_populates="documents")
    uploaded_by = relationship("User")
