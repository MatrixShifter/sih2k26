"""Officer KPIs, comparison, and expiry alerts."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import require_officer
from app.core.errors import raise_api
from app.models.bid_application import BidApplication, BidStatus, VerificationStatus
from app.models.compliance import ComplianceCheck, RiskLevel
from app.models.audit import AuditLog
from app.models.bidder import Bidder
from app.models.document import Document, DocumentStatus
from app.models.tender import Tender
from app.models.user import User
from app.schemas.domain import CompareOut, OfficerKpis, TenderOut
from app.services.access import get_bid_or_404, to_detail

router = APIRouter(prefix="/officer", tags=["officer"])


@router.get("/kpis", response_model=OfficerKpis)
def kpis(db: Session = Depends(get_db), _officer: User = Depends(require_officer)) -> OfficerKpis:
    total = db.scalar(select(func.count()).select_from(BidApplication)) or 0
    pending = db.scalar(
        select(func.count()).select_from(BidApplication).where(BidApplication.verification_status == VerificationStatus.PENDING)
    ) or 0
    verified = db.scalar(
        select(func.count()).select_from(BidApplication).where(BidApplication.verification_status == VerificationStatus.VERIFIED)
    ) or 0
    latest = (
        select(ComplianceCheck.bid_id, func.max(ComplianceCheck.id).label("max_id")).group_by(ComplianceCheck.bid_id).subquery()
    )
    high = (
        db.scalar(
            select(func.count())
            .select_from(ComplianceCheck)
            .join(latest, latest.c.max_id == ComplianceCheck.id)
            .where(ComplianceCheck.risk_level == RiskLevel.HIGH)
        )
        or 0
    )
    avg = (
        db.scalar(
            select(func.avg(ComplianceCheck.overall_score)).select_from(ComplianceCheck).join(latest, latest.c.max_id == ComplianceCheck.id)
        )
        or 0
    )
    awaiting = (
        db.scalar(
            select(func.count())
            .select_from(BidApplication)
            .where(
                BidApplication.verification_status == VerificationStatus.VERIFIED,
                BidApplication.status.in_([BidStatus.SUBMITTED, BidStatus.UNDER_REVIEW, BidStatus.CLARIFICATION]),
            )
        )
        or 0
    )
    soon = date.today() + timedelta(days=30)
    expiring = (
        db.scalar(
            select(func.count())
            .select_from(Document)
            .where(Document.expiry_date.is_not(None), Document.expiry_date <= soon, Document.expiry_date >= date.today())
        )
        or 0
    )
    
    # Real database aggregations
    tot_tenders = db.scalar(select(func.count(Tender.id))) or 0
    act_tenders = db.scalar(select(func.count(Tender.id)).where(Tender.closing_date >= date.today())) or 0
    comp_tenders = db.scalar(select(func.count(Tender.id)).where(Tender.closing_date < date.today())) or 0
    tot_bidders = db.scalar(select(func.count(Bidder.id))) or 0
    docs_uploaded = db.scalar(select(func.count(Document.id))) or 0
    docs_processed = db.scalar(select(func.count(Document.id)).where(Document.status == DocumentStatus.VERIFIED)) or 0
    
    # Distribution charts from latest checks
    checks_scores = db.scalars(
        select(ComplianceCheck.overall_score).join(latest, latest.c.max_id == ComplianceCheck.id)
    ).all()
    score_dist = {
        "high_80_100": sum(1 for s in checks_scores if s and s >= 80),
        "mid_60_79": sum(1 for s in checks_scores if s and 60 <= s < 80),
        "low_below_60": sum(1 for s in checks_scores if s and s < 60),
    }

    checks_risks = db.scalars(
        select(ComplianceCheck.risk_level).join(latest, latest.c.max_id == ComplianceCheck.id)
    ).all()
    risk_dist = {
        "low": sum(1 for r in checks_risks if r == RiskLevel.LOW),
        "medium": sum(1 for r in checks_risks if r == RiskLevel.MEDIUM),
        "high": sum(1 for r in checks_risks if r == RiskLevel.HIGH),
        "critical": 0,
    }

    # Recent activity directly from audit_logs
    audit_rows = db.scalars(
        select(AuditLog).order_by(AuditLog.id.desc()).limit(8)
    ).all()
    activity = [
        {
            "id": a.id,
            "action": a.action,
            "detail": a.detail,
            "actor_role": a.actor_role or "SYSTEM",
            "created_at": a.created_at.isoformat(),
        }
        for a in audit_rows
    ]

    return OfficerKpis(
        total_bids=int(total),
        pending_verification=int(pending),
        verified=int(verified),
        high_risk=int(high),
        average_score=round(float(avg or 0), 1),
        awaiting_officer_action=int(awaiting),
        expiring_certificates=int(expiring),
        total_tenders=int(tot_tenders),
        active_tenders=int(act_tenders),
        completed_tenders=int(comp_tenders),
        total_bidders=int(tot_bidders),
        documents_uploaded=int(docs_uploaded),
        documents_processed=int(docs_processed),
        pending_reviews=int(awaiting),
        high_risk_bidders=int(high),
        compliance_distribution=score_dist,
        risk_distribution=risk_dist,
        recent_activity=activity,
    )


@router.get("/compare", response_model=CompareOut)
def compare(
    tender_id: int = Query(...),
    bid_ids: str = Query(..., description="Comma-separated bid application IDs"),
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> CompareOut:
    tender = db.scalar(select(Tender).options(selectinload(Tender.requirements)).where(Tender.id == tender_id))
    if tender is None:
        raise_api(404, "TENDER_NOT_FOUND", "The requested tender could not be found.")
    ids = [int(part) for part in bid_ids.split(",") if part.strip().isdigit()]
    if len(ids) < 2:
        raise_api(400, "COMPARE_MIN", "Select at least two bid applications for the same tender.")
    details = []
    for bid_id in ids:
        bid = get_bid_or_404(db, bid_id, officer)
        if bid.tender_id != tender_id:
            raise_api(400, "COMPARE_TENDER_MISMATCH", "All compared bids must belong to the selected tender.")
        details.append(to_detail(db, bid))
    return CompareOut(tender=TenderOut.model_validate(tender), bids=details)


@router.get("/anomalies")
def list_anomalies(
    severity: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _officer: User = Depends(require_officer),
) -> list[dict]:
    latest = (
        select(ComplianceCheck.bid_id, func.max(ComplianceCheck.id).label("max_id"))
        .group_by(ComplianceCheck.bid_id)
        .subquery()
    )
    checks = list(
        db.scalars(
            select(ComplianceCheck)
            .join(latest, latest.c.max_id == ComplianceCheck.id)
            .options(
                selectinload(ComplianceCheck.bid).selectinload(BidApplication.bidder),
                selectinload(ComplianceCheck.bid).selectinload(BidApplication.tender),
            )
        )
    )

    anomalies = []
    for c in checks:
        bid = c.bid
        bidder = bid.bidder if bid else None
        tender = bid.tender if bid else None

        # 1. Contradictions (Name / Address / Entity mismatches)
        for contra in (c.contradictions or []):
            sev = contra.get("severity", "MEDIUM").upper()
            if severity and sev != severity.upper():
                continue
            anomalies.append({
                "id": f"contra-{c.id}-{contra.get('field', 'item')}",
                "category": "CONTRADICTION",
                "type": "Cross-Document Discrepancy",
                "title": f"Mismatched {contra.get('field', 'field')}: {contra.get('note', '')}",
                "severity": sev,
                "bid_id": c.bid_id,
                "bid_reference": bid.reference_code if bid else "",
                "bidder_name": bidder.legal_name if bidder else "",
                "tender_gem_number": tender.gem_bid_number if tender else "",
                "detail": f"Left ({contra.get('left', {}).get('source')}): '{contra.get('left', {}).get('value')}' vs Right ({contra.get('right', {}).get('source')}): '{contra.get('right', {}).get('value')}'",
                "timestamp": c.created_at.isoformat(),
            })

        # 2. Risk factors (Expired GST, turnover deficit, format fail)
        for rf in (c.risk_factors or []):
            sev = rf.get("severity", "MEDIUM").upper()
            if severity and sev != severity.upper():
                continue
            anomalies.append({
                "id": f"rf-{c.id}-{rf.get('code', 'risk')}",
                "category": "RISK_SIGNAL",
                "type": rf.get("code", "ANOMALY"),
                "title": rf.get("code", "Risk Factor").replace("_", " ").title(),
                "severity": sev,
                "bid_id": c.bid_id,
                "bid_reference": bid.reference_code if bid else "",
                "bidder_name": bidder.legal_name if bidder else "",
                "tender_gem_number": tender.gem_bid_number if tender else "",
                "detail": rf.get("detail", ""),
                "timestamp": c.created_at.isoformat(),
            })

    # 3. Suspicious / expired documents
    docs = list(
        db.scalars(
            select(Document)
            .options(
                selectinload(Document.bid).selectinload(BidApplication.tender),
                selectinload(Document.bidder),
            )
            .where(
                (Document.integrity_status == "SUSPICIOUS")
                | (Document.expiry_date < date.today())
            )
        )
    )
    for doc in docs:
        is_exp = doc.expiry_date and doc.expiry_date < date.today()
        sev = "CRITICAL" if is_exp else "HIGH"
        if severity and sev != severity.upper():
            continue
        msg = f"Certificate expired on {doc.expiry_date}" if is_exp else "Forensic heuristic flagged informal/manipulated scan artefact"
        anomalies.append({
            "id": f"doc-{doc.id}",
            "category": "DOCUMENT_INTEGRITY",
            "type": "Expired Artefact" if is_exp else "Suspicious Document File",
            "title": f"{doc.document_type.value.upper()}: {doc.original_filename}",
            "severity": sev,
            "bid_id": doc.bid_id,
            "bid_reference": doc.bid.reference_code if doc.bid else "",
            "bidder_name": doc.bidder.legal_name if doc.bidder else "",
            "tender_gem_number": doc.bid.tender.gem_bid_number if (doc.bid and doc.bid.tender) else "",
            "detail": msg,
            "timestamp": doc.created_at.isoformat(),
        })

    return anomalies

