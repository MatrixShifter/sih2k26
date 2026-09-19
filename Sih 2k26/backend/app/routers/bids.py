"""Bid applications: create, list, verify, score, officer decisions, reports, assistant."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_bidder, require_officer
from app.core.errors import raise_api
from app.models.bid_application import BidApplication, BidStatus, VerificationStatus
from app.models.bidder import Bidder
from app.models.compliance import ComplianceCheck, Recommendation, RiskLevel
from app.models.tender import Tender
from app.models.user import User, UserRole
from app.schemas.domain import (
    AssistantIn,
    AssistantOut,
    AuditLogOut,
    BidCreate,
    BidDetail,
    BidListItem,
    ComplianceCheckOut,
    OfficerDecisionIn,
    PaginatedAudit,
    PaginatedBids,
    RequirementOverrideIn,
)
from app.services import audit_service, notify
from app.services.access import get_bid_or_404, latest_check, to_detail
from app.services.assistant import answer as assistant_answer
from app.services.report_service import render_html
from app.services.verification_service import run_verification
from app.utils.ids import bid_reference

router = APIRouter(tags=["bids"])


def _to_list_item(bid: BidApplication, check: ComplianceCheck | None) -> BidListItem:
    return BidListItem(
        id=bid.id,
        reference_code=bid.reference_code,
        tender_id=bid.tender_id,
        gem_bid_number=bid.tender.gem_bid_number,
        title=bid.tender.title,
        department=bid.tender.department,
        estimated_value_inr=bid.tender.estimated_value_inr,
        closing_date=bid.tender.closing_date,
        status=bid.status,
        verification_status=bid.verification_status,
        bidder_id=bid.bidder_id,
        bidder_legal_name=bid.bidder.legal_name if bid.bidder else "",
        overall_score=float(check.overall_score) if check else None,
        risk_level=check.risk_level if check else None,
        recommendation=check.recommendation if check else None,
        updated_at=bid.updated_at,
        created_at=bid.created_at,
    )


def _filtered_bid_query(
    db: Session,
    user: User,
    *,
    q: str | None,
    status_filter: BidStatus | None,
    risk: RiskLevel | None,
    verification: VerificationStatus | None,
    score_min: float | None,
    score_max: float | None,
    date_from: datetime | None,
    date_to: datetime | None,
    tender_id: int | None,
):
    latest = (
        select(ComplianceCheck.bid_id, func.max(ComplianceCheck.id).label("max_id"))
        .group_by(ComplianceCheck.bid_id)
        .subquery()
    )
    stmt = (
        select(BidApplication, ComplianceCheck)
        .join(Bidder, Bidder.id == BidApplication.bidder_id)
        .join(Tender, Tender.id == BidApplication.tender_id)
        .outerjoin(latest, latest.c.bid_id == BidApplication.id)
        .outerjoin(ComplianceCheck, ComplianceCheck.id == latest.c.max_id)
        .options(selectinload(BidApplication.bidder), selectinload(BidApplication.tender))
    )
    if user.role == UserRole.BIDDER:
        stmt = stmt.where(BidApplication.bidder_id == user.bidder_id)
    if status_filter:
        stmt = stmt.where(BidApplication.status == status_filter)
    if verification:
        stmt = stmt.where(BidApplication.verification_status == verification)
    if tender_id:
        stmt = stmt.where(BidApplication.tender_id == tender_id)
    if risk:
        stmt = stmt.where(ComplianceCheck.risk_level == risk)
    if score_min is not None:
        stmt = stmt.where(ComplianceCheck.overall_score >= score_min)
    if score_max is not None:
        stmt = stmt.where(ComplianceCheck.overall_score <= score_max)
    if date_from:
        stmt = stmt.where(BidApplication.updated_at >= date_from)
    if date_to:
        stmt = stmt.where(BidApplication.updated_at <= date_to)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                BidApplication.reference_code.ilike(like),
                Tender.gem_bid_number.ilike(like),
                Tender.title.ilike(like),
                Tender.department.ilike(like),
                Bidder.legal_name.ilike(like),
            )
        )
    return stmt


@router.get("/bids", response_model=PaginatedBids)
@router.get("/officer/bids", response_model=PaginatedBids)
def list_bids(
    q: str | None = Query(default=None),
    status_filter: BidStatus | None = Query(default=None, alias="status"),
    risk: RiskLevel | None = Query(default=None),
    verification: VerificationStatus | None = Query(default=None),
    score_min: float | None = Query(default=None),
    score_max: float | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    tender_id: int | None = Query(default=None),
    sort: str = Query(default="updated_at"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaginatedBids:
    stmt = _filtered_bid_query(
        db,
        user,
        q=q,
        status_filter=status_filter,
        risk=risk,
        verification=verification,
        score_min=score_min,
        score_max=score_max,
        date_from=date_from,
        date_to=date_to,
        tender_id=tender_id,
    )
    count_stmt = select(func.count()).select_from(stmt.with_only_columns(BidApplication.id).order_by(None).subquery())
    total = db.scalar(count_stmt) or 0
    order_col = BidApplication.updated_at.desc()
    if sort == "score":
        order_col = ComplianceCheck.overall_score.desc().nullslast()
    elif sort == "risk":
        order_col = ComplianceCheck.risk_level.asc().nullslast()
    elif sort == "created_at":
        order_col = BidApplication.created_at.desc()
    rows = db.execute(stmt.order_by(order_col).offset(skip).limit(limit)).all()
    return PaginatedBids(items=[_to_list_item(bid, check) for bid, check in rows], total=total)


@router.post("/bids", response_model=BidDetail, status_code=201)
def create_bid(payload: BidCreate, db: Session = Depends(get_db), user: User = Depends(require_bidder)) -> BidDetail:
    if not user.bidder_id:
        raise_api(400, "BIDDER_PROFILE_INCOMPLETE", "Bidder profile is incomplete.")
    tender = db.get(Tender, payload.tender_id)
    if tender is None:
        raise_api(404, "TENDER_NOT_FOUND", "The requested tender could not be found.")
    existing = db.scalar(
        select(BidApplication).where(
            BidApplication.tender_id == tender.id,
            BidApplication.bidder_id == user.bidder_id,
        )
    )
    if existing:
        raise_api(409, "BID_EXISTS", "An application for this tender already exists.")
    bid = BidApplication(
        reference_code=bid_reference(tender.gem_bid_number, user.bidder_id),
        tender_id=tender.id,
        bidder_id=user.bidder_id,
        status=BidStatus.DRAFT,
        verification_status=VerificationStatus.PENDING,
    )
    db.add(bid)
    db.flush()
    audit_service.record(
        db,
        action="bid.create",
        entity_type="bid",
        entity_id=bid.id,
        bid_id=bid.id,
        actor_user_id=user.id,
        actor_role=user.role.value,
        result="created",
        detail=f"Opened application {bid.reference_code} against {tender.gem_bid_number}",
    )
    db.commit()
    return to_detail(db, get_bid_or_404(db, bid.id, user))


@router.get("/bids/{bid_id}", response_model=BidDetail)
def get_bid(bid_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> BidDetail:
    return to_detail(db, get_bid_or_404(db, bid_id, user))


@router.post("/bids/{bid_id}/verify", response_model=ComplianceCheckOut)
def trigger_verification(
    bid_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ComplianceCheck:
    bid = get_bid_or_404(db, bid_id, user)
    check = run_verification(db, bid, user)
    db.commit()
    db.refresh(check)
    return check


@router.get("/bids/{bid_id}/verification")
def get_verification(bid_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    bid = get_bid_or_404(db, bid_id, user)
    check = latest_check(db, bid.id)
    results = [
        {
            "id": row.id,
            "check_key": row.check_key,
            "source": row.source,
            "status": row.status,
            "simulated": row.simulated,
            "summary": row.summary,
            "payload": row.payload,
        }
        for row in (bid.verification_results or [])
    ]
    return {
        "simulated_verification": True,
        "verification_status": bid.verification_status.value,
        "results": results,
        "latest_check": ComplianceCheckOut.model_validate(check) if check else None,
    }


@router.get("/bids/{bid_id}/score")
def get_score(bid_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    bid = get_bid_or_404(db, bid_id, user)
    check = latest_check(db, bid.id)
    if check is None:
        raise_api(404, "SCORE_NOT_FOUND", "No compliance score has been calculated for this bid.")
    return {
        "overall_score": float(check.overall_score),
        "confidence": float(check.confidence),
        "score_breakdown": check.score_breakdown,
        "summary": check.summary,
        "simulated_verification": True,
    }


@router.get("/bids/{bid_id}/risk")
def get_risk(bid_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    bid = get_bid_or_404(db, bid_id, user)
    check = latest_check(db, bid.id)
    if check is None:
        raise_api(404, "RISK_NOT_FOUND", "No risk assessment has been calculated for this bid.")
    return {
        "risk_level": check.risk_level.value,
        "risk_factors": check.risk_factors,
        "contradictions": check.contradictions,
        "related_bidders": check.related_bidders,
        "simulated_verification": True,
    }


def _apply_decision(
    db: Session,
    bid: BidApplication,
    officer: User,
    status: BidStatus,
    payload: OfficerDecisionIn,
    ai_rec: Recommendation | None,
) -> BidApplication:
    needs_override = False
    if ai_rec:
        mapped = {
            BidStatus.APPROVED: Recommendation.APPROVE,
            BidStatus.REJECTED: Recommendation.REJECT,
            BidStatus.CLARIFICATION: Recommendation.REQUEST_CLARIFICATION,
        }
        if mapped.get(status) != ai_rec:
            needs_override = True
    if needs_override and not (payload.override_reason and payload.override_reason.strip()):
        raise_api(
            422,
            "OVERRIDE_REASON_REQUIRED",
            "An override reason is required when the officer decision differs from the AI recommendation.",
        )
    bid.status = status
    bid.decision_notes = payload.notes
    bid.override_reason = payload.override_reason.strip() if needs_override else payload.override_reason
    bid.decided_by_user_id = officer.id
    bid.decided_at = datetime.now(timezone.utc)
    audit_service.record(
        db,
        action=f"bid.{status.value}",
        entity_type="bid",
        entity_id=bid.id,
        bid_id=bid.id,
        actor_user_id=officer.id,
        actor_role=officer.role.value,
        result=status.value,
        detail=payload.notes,
        extra={
            "ai_recommendation": ai_rec.value if ai_rec else None,
            "override_reason": bid.override_reason,
            "officer_id": officer.id,
        },
    )
    kind = {
        BidStatus.APPROVED: ("bid_approved", "Bid approved"),
        BidStatus.REJECTED: ("bid_rejected", "Bid rejected"),
        BidStatus.CLARIFICATION: ("clarification_requested", "Clarification requested"),
    }[status]
    notify.notify_users(
        db,
        kind=kind[0],
        title=kind[1],
        body=f"{bid.reference_code}: {payload.notes[:180]}",
        bid_id=bid.id,
        bidder_id=bid.bidder_id,
        officer=True,
    )
    return bid


@router.post("/bids/{bid_id}/approve", response_model=BidDetail)
def approve_bid(
    bid_id: int,
    payload: OfficerDecisionIn,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> BidDetail:
    bid = get_bid_or_404(db, bid_id, officer)
    check = latest_check(db, bid.id)
    _apply_decision(db, bid, officer, BidStatus.APPROVED, payload, check.recommendation if check else None)
    db.commit()
    return to_detail(db, get_bid_or_404(db, bid_id, officer))


@router.post("/bids/{bid_id}/reject", response_model=BidDetail)
def reject_bid(
    bid_id: int,
    payload: OfficerDecisionIn,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> BidDetail:
    bid = get_bid_or_404(db, bid_id, officer)
    check = latest_check(db, bid.id)
    _apply_decision(db, bid, officer, BidStatus.REJECTED, payload, check.recommendation if check else None)
    db.commit()
    return to_detail(db, get_bid_or_404(db, bid_id, officer))


@router.post("/bids/{bid_id}/clarification", response_model=BidDetail)
def request_clarification(
    bid_id: int,
    payload: OfficerDecisionIn,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> BidDetail:
    bid = get_bid_or_404(db, bid_id, officer)
    check = latest_check(db, bid.id)
    _apply_decision(db, bid, officer, BidStatus.CLARIFICATION, payload, check.recommendation if check else None)
    db.commit()
    return to_detail(db, get_bid_or_404(db, bid_id, officer))


@router.post("/bids/{bid_id}/requirements/{req_id}/override", response_model=BidDetail)
def override_requirement(
    bid_id: int,
    req_id: int,
    payload: RequirementOverrideIn,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> BidDetail:
    bid = get_bid_or_404(db, bid_id, officer)
    check = latest_check(db, bid.id)
    if check is None:
        raise_api(404, "CHECK_NOT_FOUND", "No compliance check found for this bid. Run verification first.")
    
    req_list = list(check.requirement_results or [])
    target = next((r for r in req_list if r.get("requirement_id") == req_id), None)
    if target is None:
        raise_api(404, "REQUIREMENT_NOT_FOUND", f"Requirement #{req_id} not found in compliance results.")
    
    old_status = target.get("status") or target.get("comparison_result")
    now_iso = datetime.now(timezone.utc).isoformat()
    
    target["reviewer_status"] = "OVERRIDDEN"
    target["comparison_result"] = payload.new_status
    target["status"] = payload.new_status
    target["risk"] = "LOW" if payload.new_status in {"COMPLIANT", "PASS"} else "HIGH"
    target["officer_override"] = {
        "overridden": True,
        "previous_status": old_status,
        "new_status": payload.new_status,
        "reason": payload.reason,
        "notes": payload.notes,
        "officer_name": officer.full_name,
        "timestamp": now_iso,
    }
    
    # Recalculate passed ratio and overall score
    passed_count = sum(1 for r in req_list if r.get("status") in {"COMPLIANT", "PASS"})
    total_count = max(len(req_list), 1)
    
    # Re-evaluate overall score proportionally
    new_score = round((passed_count / total_count) * 100.0, 1)
    check.overall_score = new_score
    check.requirement_results = req_list
    
    # Re-evaluate recommendation
    failed_mandatory = [r for r in req_list if r.get("mandatory") and r.get("status") in {"FAIL", "MISSING", "NON-COMPLIANT", "EXPIRED", "MISMATCH"}]
    if not failed_mandatory and new_score >= 80:
        check.risk_level = RiskLevel.LOW
        check.recommendation = Recommendation.APPROVE
    elif not failed_mandatory and new_score >= 60:
        check.risk_level = RiskLevel.MEDIUM
        check.recommendation = Recommendation.REQUEST_CLARIFICATION
    
    audit_service.record(
        db,
        action="requirement.override",
        entity_type="compliance_check",
        entity_id=check.id,
        bid_id=bid.id,
        actor_user_id=officer.id,
        actor_role=officer.role.value,
        result=payload.new_status,
        detail=f"Officer override req #{req_id} from {old_status} to {payload.new_status}. Reason: {payload.reason}",
        extra={
            "requirement_id": req_id,
            "old_status": old_status,
            "new_status": payload.new_status,
            "reason": payload.reason,
            "notes": payload.notes,
            "recalculated_score": new_score,
        },
    )
    db.commit()
    return to_detail(db, get_bid_or_404(db, bid.id, officer))


@router.get("/bids/{bid_id}/audit-log", response_model=PaginatedAudit)
def bid_audit_log(
    bid_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaginatedAudit:
    from app.models.audit import AuditLog

    get_bid_or_404(db, bid_id, user)
    rows = list(
        db.scalars(select(AuditLog).options(selectinload(AuditLog.actor)).where(AuditLog.bid_id == bid_id).order_by(AuditLog.created_at.asc()))
    )
    items = [
        AuditLogOut(
            id=row.id,
            actor_user_id=row.actor_user_id,
            actor_name=row.actor.full_name if row.actor else None,
            actor_role=row.actor_role,
            action=row.action,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            bid_id=row.bid_id,
            result=row.result,
            detail=row.detail,
            extra=row.extra,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return PaginatedAudit(items=items, total=len(items))


@router.get("/bids/{bid_id}/report")
def bid_report(bid_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> HTMLResponse:
    bid = get_bid_or_404(db, bid_id, user)
    check = latest_check(db, bid.id)
    from app.models.audit import AuditLog

    last_audit = db.scalar(select(AuditLog.id).where(AuditLog.bid_id == bid.id).order_by(AuditLog.id.desc()).limit(1))
    html = render_html(bid, check, last_audit)
    return HTMLResponse(content=html, headers={"Content-Disposition": f'inline; filename="complygem-{bid.reference_code}.html"'})


@router.post("/bids/{bid_id}/assistant", response_model=AssistantOut)
def bid_assistant(
    bid_id: int,
    payload: AssistantIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AssistantOut:
    bid = get_bid_or_404(db, bid_id, user)
    check = latest_check(db, bid.id)
    text = assistant_answer(payload.question, bid, check)
    grounded = "do not contain enough evidence" not in text.lower()
    return AssistantOut(answer=text, grounded=grounded)
