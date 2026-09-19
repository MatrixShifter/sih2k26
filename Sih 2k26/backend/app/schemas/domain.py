"""Bidder, tender, bid, document, compliance, and audit schemas."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.bid_application import BidStatus, VerificationStatus
from app.models.compliance import Recommendation, RiskLevel
from app.models.document import DocumentStatus, DocumentType


class BidderOut(BaseModel):
    id: int
    legal_name: str
    trade_name: Optional[str]
    registered_address: str
    state: str
    pincode: str
    contact_email: EmailStr
    contact_phone: str
    director_name: Optional[str]
    annual_turnover_inr: Optional[Decimal]
    years_experience: Optional[int]
    udyam_number: Optional[str]
    gstin: Optional[str]
    pan: Optional[str]
    cin: Optional[str]
    nsic_registration: Optional[str]
    dpiit_startup_number: Optional[str]
    epfo_code: Optional[str]
    esic_code: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class RequirementOut(BaseModel):
    id: int
    requirement: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: str
    mandatory: bool
    required_value: Optional[str] = None
    comparison_operator: Optional[str] = ">="
    weight: Optional[float] = 10.0
    threshold: Optional[float] = None
    currency: Optional[str] = None
    evidence_types: Optional[list[str]] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class RequirementCreateIn(BaseModel):
    requirement: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: str = "TECHNICAL"
    mandatory: bool = True
    required_value: Optional[str] = None
    comparison_operator: Optional[str] = ">="
    weight: Optional[float] = 10.0
    threshold: Optional[float] = None
    currency: Optional[str] = None
    evidence_types: Optional[list[str]] = None
    notes: Optional[str] = None


class RequirementUpdateIn(BaseModel):
    requirement: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    mandatory: Optional[bool] = None
    required_value: Optional[str] = None
    comparison_operator: Optional[str] = None
    weight: Optional[float] = None
    threshold: Optional[float] = None
    currency: Optional[str] = None
    evidence_types: Optional[list[str]] = None
    notes: Optional[str] = None


class RequirementOverrideIn(BaseModel):
    new_status: str  # e.g. "COMPLIANT", "NON-COMPLIANT", "NEEDS REVIEW"
    reason: str
    notes: Optional[str] = None


class BidderCreateIn(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    registered_address: str
    state: str
    pincode: str
    contact_email: EmailStr
    contact_phone: str
    director_name: Optional[str] = None
    annual_turnover_inr: Optional[Decimal] = None
    years_experience: Optional[int] = None
    udyam_number: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    cin: Optional[str] = None
    nsic_registration: Optional[str] = None
    dpiit_startup_number: Optional[str] = None
    epfo_code: Optional[str] = None
    esic_code: Optional[str] = None


class BidderUpdateIn(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    registered_address: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    director_name: Optional[str] = None
    annual_turnover_inr: Optional[Decimal] = None
    years_experience: Optional[int] = None
    udyam_number: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    cin: Optional[str] = None
    nsic_registration: Optional[str] = None
    dpiit_startup_number: Optional[str] = None
    epfo_code: Optional[str] = None
    esic_code: Optional[str] = None


class TenderCreate(BaseModel):
    gem_bid_number: str
    title: str
    department: str
    category: str
    estimated_value_inr: Decimal
    closing_date: date
    description: str
    source_text: Optional[str] = None


class TenderUpdateIn(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    category: Optional[str] = None
    estimated_value_inr: Optional[Decimal] = None
    closing_date: Optional[date] = None
    description: Optional[str] = None
    source_text: Optional[str] = None


class DocumentFieldsUpdateIn(BaseModel):
    extracted_fields: dict[str, Any]
    integrity_status: Optional[str] = None
    expiry_date: Optional[date] = None


class TenderOut(BaseModel):
    id: int
    gem_bid_number: str
    title: str
    department: str
    category: str
    estimated_value_inr: Decimal
    closing_date: date
    description: str
    requirements: list[RequirementOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: int
    bidder_id: int
    bid_id: int
    document_type: DocumentType
    original_filename: str
    content_type: str
    file_size_bytes: int
    status: DocumentStatus
    issued_name: Optional[str]
    expiry_date: Optional[date]
    expiry_state: str
    integrity_status: str
    sha256_hash: Optional[str] = None
    version: int = 1
    is_duplicate: bool = False
    duplicate_of_doc_id: Optional[int] = None
    validation_results: Optional[dict[str, Any]] = None
    extracted_fields: Optional[dict[str, Any]] = None
    uploaded_by_user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplianceCheckOut(BaseModel):
    id: int
    bidder_id: int
    tender_id: int
    bid_id: int
    overall_score: float
    confidence: float
    risk_level: RiskLevel
    recommendation: Recommendation
    summary: str
    score_breakdown: dict[str, Any]
    requirement_results: list[dict[str, Any]]
    contradictions: list[dict[str, Any]]
    risk_factors: list[dict[str, Any]]
    related_bidders: list[dict[str, Any]]
    findings: list[dict[str, Any]]
    triggered_by_user_id: Optional[int]
    created_at: datetime
    simulated_verification: bool = True

    model_config = {"from_attributes": True}

    @field_validator("overall_score", "confidence", mode="before")
    @classmethod
    def _num(cls, value: object) -> float:
        return float(value)


class BidListItem(BaseModel):
    id: int
    reference_code: str
    tender_id: int
    gem_bid_number: str
    title: str
    department: str
    estimated_value_inr: Decimal
    closing_date: date
    status: BidStatus
    verification_status: VerificationStatus
    bidder_id: int
    bidder_legal_name: str
    overall_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    recommendation: Optional[Recommendation] = None
    updated_at: datetime
    created_at: datetime


class BidDetail(BaseModel):
    id: int
    reference_code: str
    status: BidStatus
    verification_status: VerificationStatus
    decision_notes: Optional[str]
    override_reason: Optional[str]
    decided_at: Optional[datetime]
    tender: TenderOut
    bidder: BidderOut
    documents: list[DocumentOut]
    latest_check: Optional[ComplianceCheckOut]
    verification_results: list[dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime
    simulated_verification: bool = True


class BidCreate(BaseModel):
    tender_id: int


class OfficerDecisionIn(BaseModel):
    notes: str = Field(min_length=8, max_length=4000)
    override_reason: Optional[str] = Field(default=None, max_length=4000)


class AssistantIn(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class AssistantOut(BaseModel):
    answer: str
    grounded: bool = True


class AuditLogOut(BaseModel):
    id: int
    sequence_number: Optional[int] = None
    actor_user_id: Optional[int]
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int]
    bid_id: Optional[int]
    result: Optional[str]
    detail: str
    previous_value: Optional[Any] = None
    new_value: Optional[Any] = None
    reason: Optional[str] = None
    previous_event_hash: Optional[str] = None
    event_hash: Optional[str] = None
    extra: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    kind: str
    bid_id: Optional[int]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedBids(BaseModel):
    items: list[BidListItem]
    total: int


class PaginatedAudit(BaseModel):
    items: list[AuditLogOut]
    total: int


class OfficerKpis(BaseModel):
    total_bids: int
    pending_verification: int
    verified: int
    high_risk: int
    average_score: float
    awaiting_officer_action: int
    expiring_certificates: int
    total_tenders: int = 0
    active_tenders: int = 0
    completed_tenders: int = 0
    total_bidders: int = 0
    documents_uploaded: int = 0
    documents_processed: int = 0
    pending_reviews: int = 0
    high_risk_bidders: int = 0
    compliance_distribution: dict[str, int] = {}
    risk_distribution: dict[str, int] = {}
    recent_activity: list[dict[str, Any]] = []


class CompareOut(BaseModel):
    tender: TenderOut
    bids: list[BidDetail]
