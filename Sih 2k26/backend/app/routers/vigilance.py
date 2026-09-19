"""Vigilance and relationship detection API routes."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.audit import AuditLog
from app.models.user import User
from app.models.vigilance import VigilanceAction
from app.services.relationship_detector import detect_bidder_relationships

router = APIRouter(prefix="/vigilance", tags=["vigilance"])


class VigilanceActionPayload(BaseModel):
    alert_id: str = Field(..., description="Unique alert ID e.g. rel_4_11")
    action: str = Field(..., description="ACKNOWLEDGE, INVESTIGATE, DISMISS, ESCALATE")
    reason: Optional[str] = Field(None, description="Mandatory reason for DISMISS or ESCALATE")
    notes: Optional[str] = Field(None, description="Optional officer audit notes")


@router.get("/relationships")
def get_relationships(
    tender_id: Optional[int] = Query(None, description="Optional filter by tender ID"),
    risk_level: Optional[str] = Query(None, description="Optional filter by risk level: HIGH, MEDIUM, LOW"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve cross-bidder vigilance relationship alerts and interactive graph data."""
    data = detect_bidder_relationships(db, tender_id=tender_id)

    if risk_level:
        target = risk_level.upper()
        data["alerts"] = [a for a in data["alerts"] if a["risk_level"] == target]
        data["total_alerts"] = len(data["alerts"])

    return data


@router.post("/action")
def record_vigilance_action(
    payload: VigilanceActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Record an officer determination (Acknowledge, Investigate, Dismiss with reason, Escalate)."""
    valid_actions = {"ACKNOWLEDGE", "INVESTIGATE", "DISMISS", "ESCALATE"}
    act_upper = payload.action.upper()
    if act_upper not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{payload.action}'. Must be one of {valid_actions}",
        )

    # Mandatory reason check for DISMISS
    if act_upper == "DISMISS" and (not payload.reason or len(payload.reason.strip()) < 5):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A substantive justification reason (at least 5 characters) is mandatory when dismissing a vigilance alert.",
        )

    # Record in vigilance_actions table
    action_record = VigilanceAction(
        alert_id=payload.alert_id,
        action=act_upper,
        officer_id=current_user.id,
        officer_name=current_user.full_name or current_user.email,
        reason=payload.reason.strip() if payload.reason else None,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(action_record)

    # Log to immutable audit_logs
    audit_entry = AuditLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        action=f"VIGILANCE_{act_upper}",
        entity_type="vigilance_alert",
        entity_id=None,
        result=act_upper,
        detail=(
            f"Procurement officer {current_user.full_name} ({current_user.email}) recorded '{act_upper}' "
            f"on vigilance alert '{payload.alert_id}'."
            + (f" Reason: {payload.reason.strip()}." if payload.reason else "")
            + (f" Notes: {payload.notes.strip()}" if payload.notes else "")
        ),
        extra={
            "alert_id": payload.alert_id,
            "action": act_upper,
            "reason": payload.reason,
            "notes": payload.notes,
        },
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(action_record)

    return {
        "status": "success",
        "action_id": action_record.id,
        "alert_id": payload.alert_id,
        "action": act_upper,
        "officer_name": action_record.officer_name,
        "created_at": action_record.created_at.isoformat(),
    }


@router.get("/actions")
def get_vigilance_actions(
    alert_id: Optional[str] = Query(None, description="Optional alert ID filter"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Fetch history of vigilance audit actions performed by procurement officers."""
    stmt = select(VigilanceAction).order_by(VigilanceAction.id.desc())
    if alert_id:
        stmt = stmt.where(VigilanceAction.alert_id == alert_id)

    actions = db.scalars(stmt).all()
    return [
        {
            "id": a.id,
            "alert_id": a.alert_id,
            "action": a.action,
            "officer_id": a.officer_id,
            "officer_name": a.officer_name,
            "reason": a.reason,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in actions
    ]
