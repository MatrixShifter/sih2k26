"""Searchable verification audit trail."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.audit import AuditLog
from app.models.bid_application import BidApplication
from app.models.user import User, UserRole
from app.schemas.domain import AuditLogOut, PaginatedAudit

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=PaginatedAudit)
def list_audit_logs(
    q: str | None = Query(default=None),
    action: str | None = Query(default=None),
    role: str | None = Query(default=None),
    bid_id: int | None = Query(default=None),
    result: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaginatedAudit:
    stmt = select(AuditLog).options(selectinload(AuditLog.actor))
    if user.role == UserRole.BIDDER:
        own_bids = select(BidApplication.id).where(BidApplication.bidder_id == user.bidder_id)
        stmt = stmt.where(or_(AuditLog.actor_user_id == user.id, AuditLog.bid_id.in_(own_bids)))
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if role:
        stmt = stmt.where(AuditLog.actor_role == role)
    if bid_id:
        stmt = stmt.where(AuditLog.bid_id == bid_id)
    if result:
        stmt = stmt.where(AuditLog.result == result)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(AuditLog.detail.ilike(like), AuditLog.action.ilike(like)))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).offset(skip).limit(limit)).all()
    items = [
        AuditLogOut(
            id=row.id,
            sequence_number=row.sequence_number or row.id,
            actor_user_id=row.actor_user_id,
            actor_name=row.actor.full_name if row.actor else None,
            actor_role=row.actor_role,
            action=row.action,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            bid_id=row.bid_id,
            result=row.result,
            detail=row.detail,
            previous_value=row.previous_value,
            new_value=row.new_value,
            reason=row.reason,
            previous_event_hash=row.previous_event_hash,
            event_hash=row.event_hash,
            extra=row.extra,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return PaginatedAudit(items=items, total=total)


@router.get("/verify-integrity")
def verify_integrity(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Verify cryptographic hash chaining and data integrity across all audit events."""
    from app.services.audit_service import verify_audit_integrity
    return verify_audit_integrity(db)


@router.post("/backfill-chain")
def backfill_chain(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Backfills and seals the cryptographic hash chain for all existing audit events."""
    from app.services.audit_service import backfill_event_chain
    count = backfill_event_chain(db)
    return {"status": "success", "events_chained": count}


@router.post("/simulate-tampering")
def simulate_tampering(
    event_id: int = Query(..., description="ID of the audit event to simulate altering"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Controlled demonstration endpoint: alters an audit record's detail to test verification detection."""
    event = db.scalar(select(AuditLog).where(AuditLog.id == event_id))
    if not event:
        return {"status": "error", "message": "Event not found"}
    
    event.detail = f"{event.detail} [MODIFIED BY UNAUTHORIZED SQL INJECTION ATTACK]"
    db.commit()
    return {
        "status": "tampered",
        "message": f"Event #{event_id} details altered. Run 'Verify Audit Integrity' to observe detection.",
    }


@router.post("/restore-chain")
def restore_chain(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Restores and reseals the entire cryptographic audit trail after testing."""
    from app.services.audit_service import backfill_event_chain
    # Clean up test modifications
    events = db.scalars(select(AuditLog)).all()
    for ev in events:
        if ev.detail and "[MODIFIED BY UNAUTHORIZED" in ev.detail:
            ev.detail = ev.detail.split(" [MODIFIED BY UNAUTHORIZED")[0]
    db.commit()
    count = backfill_event_chain(db)
    return {"status": "restored", "events_resealed": count}
