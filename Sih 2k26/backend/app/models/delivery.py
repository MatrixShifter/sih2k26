"""Post-award delivery verification and asset management models."""

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DeliveryBatch(Base):
    __tablename__ = "delivery_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), nullable=False, index=True)
    awarded_bidder_id: Mapped[int] = mapped_column(ForeignKey("bidders.id"), nullable=False, index=True)
    batch_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    po_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    total_units: Mapped[int] = mapped_column(Integer, default=500)
    verified_units: Mapped[int] = mapped_column(Integer, default=0)
    failed_units: Mapped[int] = mapped_column(Integer, default=0)
    delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delivery_location: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="RECEIVED")  # RECEIVED, INSPECTION_IN_PROGRESS, ACCEPTED, FLAGGED_MISMATCH
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tender = relationship("Tender")
    awarded_bidder = relationship("Bidder")
    assets = relationship("ProductAsset", back_populates="batch", cascade="all, delete-orphan")


class ProductAsset(Base):
    __tablename__ = "product_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("delivery_batches.id"), nullable=False, index=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), nullable=False, index=True)
    asset_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    serial_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    qr_code_data: Mapped[str] = mapped_column(Text, nullable=False)
    model_number: Mapped[str] = mapped_column(String(100), nullable=False)
    oem: Mapped[str] = mapped_column(String(100), nullable=False)
    warranty: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Specifications
    expected_spec: Mapped[Any] = mapped_column(JSON, nullable=False)
    actual_spec: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    
    # Verification status
    inspection_status: Mapped[str] = mapped_column(String(30), default="PENDING")  # PENDING, PASS, MISMATCH, NEEDS_PHYSICAL_INSPECTION
    mismatch_details: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    inspection_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    batch = relationship("DeliveryBatch", back_populates="assets")
    tender = relationship("Tender")
    verified_by = relationship("User")


class PhysicalInspectionRequest(Base):
    __tablename__ = "physical_inspection_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    serial_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    requested_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    requested_by_name: Mapped[str] = mapped_column(String(120), nullable=False)
    target_components: Mapped[Any] = mapped_column(JSON, nullable=False)  # e.g. ["SSD", "RAM"]
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN")  # OPEN, IN_PROGRESS, RESOLVED, REJECTED
    findings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class InspectionCase(Base):
    __tablename__ = "inspection_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    tender_id: Mapped[int] = mapped_column(ForeignKey("tenders.id"), nullable=False, index=True)
    tender_title: Mapped[str] = mapped_column(String(255), nullable=False)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("bidders.id"), nullable=False, index=True)
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("delivery_batches.id"), nullable=False, index=True)
    batch_number: Mapped[str] = mapped_column(String(50), nullable=False)
    asset_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    serial_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    model_number: Mapped[str] = mapped_column(String(100), nullable=False)
    oem: Mapped[str] = mapped_column(String(100), nullable=False)
    
    detected_issue: Mapped[str] = mapped_column(Text, nullable=False)
    expected_spec: Mapped[Any] = mapped_column(JSON, nullable=False)
    observed_spec: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    
    inspector_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    inspector_name: Mapped[str] = mapped_column(String(120), nullable=False)
    inspection_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    checklist: Mapped[Any] = mapped_column(JSON, nullable=False)  # List of 13 checklist items
    evidence_photos: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)  # List of photo URLs / captions
    officer_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Final Decision: PENDING, ACCEPT, REJECT, RETEST, HOLD, REQUEST_CLARIFICATION
    final_decision: Mapped[str] = mapped_column(String(40), default="PENDING")
    decision_justification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
