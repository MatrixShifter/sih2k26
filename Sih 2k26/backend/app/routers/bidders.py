"""Bidder directory, profile details, and registration."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_officer
from app.core.errors import raise_api
from app.models.bid_application import BidApplication
from app.models.bidder import Bidder
from app.models.compliance import ComplianceCheck
from app.models.document import Document
from app.models.user import User
from app.schemas.domain import BidderCreateIn, BidderOut, BidderUpdateIn
from app.services import audit_service

router = APIRouter(prefix="/bidders", tags=["bidders"])


@router.get("")
def list_bidders(
    q: str | None = Query(default=None),
    state: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(Bidder).order_by(Bidder.legal_name.asc())
    if q:
        query = f"%{q.strip()}%"
        stmt = stmt.where(
            (Bidder.legal_name.ilike(query))
            | (Bidder.gstin.ilike(query))
            | (Bidder.pan.ilike(query))
            | (Bidder.udyam_number.ilike(query))
        )
    if state:
        stmt = stmt.where(Bidder.state.ilike(f"%{state.strip()}%"))

    bidders = list(db.scalars(stmt))
    results = []
    for b in bidders:
        total_bids = db.scalar(select(func.count(BidApplication.id)).where(BidApplication.bidder_id == b.id)) or 0
        total_docs = db.scalar(select(func.count(Document.id)).where(Document.bidder_id == b.id)) or 0
        
        # Latest compliance check
        latest_cc = db.scalar(
            select(ComplianceCheck)
            .where(ComplianceCheck.bidder_id == b.id)
            .order_by(ComplianceCheck.id.desc())
            .limit(1)
        )
        
        results.append({
            "id": b.id,
            "legal_name": b.legal_name,
            "trade_name": b.trade_name,
            "registered_address": b.registered_address,
            "state": b.state,
            "pincode": b.pincode,
            "contact_email": b.contact_email,
            "contact_phone": b.contact_phone,
            "director_name": b.director_name,
            "annual_turnover_inr": float(b.annual_turnover_inr) if b.annual_turnover_inr else None,
            "years_experience": b.years_experience,
            "udyam_number": b.udyam_number,
            "gstin": b.gstin,
            "pan": b.pan,
            "cin": b.cin,
            "nsic_registration": b.nsic_registration,
            "dpiit_startup_number": b.dpiit_startup_number,
            "epfo_code": b.epfo_code,
            "esic_code": b.esic_code,
            "created_at": b.created_at.isoformat(),
            "total_bids": int(total_bids),
            "total_documents": int(total_docs),
            "latest_score": float(latest_cc.overall_score) if latest_cc else None,
            "latest_risk": latest_cc.risk_level.value if latest_cc else None,
            "latest_recommendation": latest_cc.recommendation.value if latest_cc else None,
        })
    return results


@router.get("/{bidder_id}")
def get_bidder_detail(
    bidder_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    bidder = db.scalar(select(Bidder).where(Bidder.id == bidder_id))
    if bidder is None:
        raise_api(404, "BIDDER_NOT_FOUND", "The requested bidder does not exist.")

    bids = list(
        db.scalars(
            select(BidApplication)
            .options(selectinload(BidApplication.tender))
            .where(BidApplication.bidder_id == bidder.id)
            .order_by(BidApplication.id.desc())
        )
    )
    docs = list(
        db.scalars(
            select(Document)
            .where(Document.bidder_id == bidder.id)
            .order_by(Document.id.desc())
        )
    )

    bid_items = []
    for b in bids:
        latest_cc = db.scalar(
            select(ComplianceCheck)
            .where(ComplianceCheck.bid_id == b.id)
            .order_by(ComplianceCheck.id.desc())
            .limit(1)
        )
        bid_items.append({
            "id": b.id,
            "reference_code": b.reference_code,
            "tender_id": b.tender_id,
            "tender_title": b.tender.title if b.tender else "",
            "tender_gem_bid_number": b.tender.gem_bid_number if b.tender else "",
            "status": b.status.value,
            "verification_status": b.verification_status.value,
            "score": float(latest_cc.overall_score) if latest_cc else None,
            "risk_level": latest_cc.risk_level.value if latest_cc else None,
            "recommendation": latest_cc.recommendation.value if latest_cc else None,
            "created_at": b.created_at.isoformat(),
        })

    doc_items = [
        {
            "id": d.id,
            "bid_id": d.bid_id,
            "document_type": d.document_type.value,
            "original_filename": d.original_filename,
            "content_type": d.content_type,
            "file_size_bytes": d.file_size_bytes,
            "status": d.status.value,
            "integrity_status": d.integrity_status,
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
            "expiry_state": d.expiry_state.value if hasattr(d.expiry_state, "value") else str(d.expiry_state),
            "extracted_fields": d.extracted_fields,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]

    return {
        "bidder": {
            "id": bidder.id,
            "legal_name": bidder.legal_name,
            "trade_name": bidder.trade_name,
            "registered_address": bidder.registered_address,
            "state": bidder.state,
            "pincode": bidder.pincode,
            "contact_email": bidder.contact_email,
            "contact_phone": bidder.contact_phone,
            "director_name": bidder.director_name,
            "annual_turnover_inr": float(bidder.annual_turnover_inr) if bidder.annual_turnover_inr else None,
            "years_experience": bidder.years_experience,
            "udyam_number": bidder.udyam_number,
            "gstin": bidder.gstin,
            "pan": bidder.pan,
            "cin": bidder.cin,
            "nsic_registration": bidder.nsic_registration,
            "dpiit_startup_number": bidder.dpiit_startup_number,
            "epfo_code": bidder.epfo_code,
            "esic_code": bidder.esic_code,
            "created_at": bidder.created_at.isoformat(),
        },
        "bids": bid_items,
        "documents": doc_items,
    }


@router.post("", status_code=201)
def create_bidder(
    payload: BidderCreateIn,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> dict:
    existing = db.scalar(select(Bidder).where(Bidder.pan == payload.pan))
    if existing:
        raise_api(409, "BIDDER_EXISTS", f"A bidder with PAN {payload.pan} already exists.")

    bidder = Bidder(**payload.model_dump())
    db.add(bidder)
    db.flush()
    audit_service.record(
        db,
        action="bidder.create",
        entity_type="bidder",
        entity_id=bidder.id,
        actor_user_id=officer.id,
        actor_role=officer.role.value,
        detail=f"Registered bidder: {bidder.legal_name} (PAN: {bidder.pan})",
    )
    db.commit()
    db.refresh(bidder)
    return {"id": bidder.id, "legal_name": bidder.legal_name, "message": "Bidder registered successfully."}


@router.put("/{bidder_id}")
def update_bidder(
    bidder_id: int,
    payload: BidderUpdateIn,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> dict:
    bidder = db.scalar(select(Bidder).where(Bidder.id == bidder_id))
    if bidder is None:
        raise_api(404, "BIDDER_NOT_FOUND", "The requested bidder does not exist.")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(bidder, field, val)

    audit_service.record(
        db,
        action="bidder.update",
        entity_type="bidder",
        entity_id=bidder.id,
        actor_user_id=officer.id,
        actor_role=officer.role.value,
        detail=f"Updated bidder {bidder.legal_name} fields: {list(data.keys())}",
    )
    db.commit()
    db.refresh(bidder)
    return {"id": bidder.id, "legal_name": bidder.legal_name, "message": "Bidder details updated successfully."}


@router.delete("/{bidder_id}")
def delete_bidder(
    bidder_id: int,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> dict:
    bidder = db.scalar(select(Bidder).where(Bidder.id == bidder_id))
    if bidder is None:
        raise_api(404, "BIDDER_NOT_FOUND", "The requested bidder does not exist.")

    legal_name = bidder.legal_name
    
    # Cascade clean associated documents, compliance checks, and bids safely
    bids = list(db.scalars(select(BidApplication).where(BidApplication.bidder_id == bidder_id)))
    for b in bids:
        db.delete(b)
    
    db.delete(bidder)
    audit_service.record(
        db,
        action="bidder.delete",
        entity_type="bidder",
        entity_id=bidder_id,
        actor_user_id=officer.id,
        actor_role=officer.role.value,
        detail=f"Deleted vendor {legal_name} and cascade cleaned {len(bids)} associated bids",
    )
    db.commit()
    return {"message": f"Bidder {legal_name} deleted successfully."}
