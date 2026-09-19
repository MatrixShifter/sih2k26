"""Tamper-evident, cryptographically chained audit logging and verification service.

Every governance, AI evaluation, and human decision action creates a chained audit block.
Event N cryptographically references the SHA-256 hash of Event N-1.

IMPORTANT: System uses tamper-evident Merkle-style cryptographic chaining.
Do not claim blockchain unless actual decentralized blockchain infrastructure exists.
"""

from __future__ import annotations

from datetime import datetime
import hashlib
import json
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit import AuditLog

GENESIS_HASH = "0" * 64


def compute_canonical_event_hash(
    seq: int,
    action: str,
    entity_type: str,
    entity_id: Optional[int],
    actor_user_id: Optional[int],
    actor_role: Optional[str],
    detail: str,
    previous_value: Any,
    new_value: Any,
    reason: Optional[str],
    previous_event_hash: str,
) -> str:
    """Computes deterministic SHA-256 fingerprint for an audit event block."""
    canonical_payload = {
        "action": action,
        "actor_role": actor_role,
        "actor_user_id": actor_user_id,
        "detail": detail,
        "entity_id": entity_id,
        "entity_type": entity_type,
        "new_value": new_value,
        "prev_hash": previous_event_hash,
        "previous_value": previous_value,
        "reason": reason,
        "seq": seq,
    }
    encoded = json.dumps(canonical_payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def record(
    db: Session,
    *,
    action: str,
    entity_type: str,
    detail: str,
    actor_user_id: Optional[int] = None,
    actor_role: Optional[str] = None,
    entity_id: Optional[int] = None,
    bid_id: Optional[int] = None,
    result: Optional[str] = None,
    previous_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    reason: Optional[str] = None,
    extra: Optional[dict[str, Any]] = None,
) -> AuditLog:
    """Records an audit event, cryptographically chained to the previous event hash."""

    # Retrieve last recorded event to obtain previous hash
    last_event = db.scalar(
        select(AuditLog).order_by(AuditLog.id.desc()).limit(1)
    )

    if last_event and last_event.event_hash:
        previous_event_hash = last_event.event_hash
        seq = (last_event.sequence_number or last_event.id) + 1
    else:
        previous_event_hash = GENESIS_HASH
        seq = (last_event.id + 1) if last_event else 1

    event_hash = compute_canonical_event_hash(
        seq=seq,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        detail=detail,
        previous_value=previous_value,
        new_value=new_value,
        reason=reason,
        previous_event_hash=previous_event_hash,
    )

    row = AuditLog(
        sequence_number=seq,
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        bid_id=bid_id,
        result=result,
        detail=detail,
        previous_value=previous_value,
        new_value=new_value,
        reason=reason,
        extra=extra,
        previous_event_hash=previous_event_hash,
        event_hash=event_hash,
    )
    db.add(row)
    db.flush()
    return row


def backfill_event_chain(db: Session) -> int:
    """Ensures all historical audit rows form an unbroken cryptographic chain from Genesis."""
    events = db.scalars(select(AuditLog).order_by(AuditLog.id.asc())).all()
    if not events:
        return 0

    expected_prev_hash = GENESIS_HASH
    updated_count = 0

    for idx, event in enumerate(events, start=1):
        recompute_needed = (
            event.event_hash is None
            or event.previous_event_hash != expected_prev_hash
            or event.sequence_number != idx
        )

        if recompute_needed:
            event.sequence_number = idx
            event.previous_event_hash = expected_prev_hash
            event.event_hash = compute_canonical_event_hash(
                seq=idx,
                action=event.action,
                entity_type=event.entity_type,
                entity_id=event.entity_id,
                actor_user_id=event.actor_user_id,
                actor_role=event.actor_role,
                detail=event.detail,
                previous_value=event.previous_value,
                new_value=event.new_value,
                reason=event.reason,
                previous_event_hash=expected_prev_hash,
            )
            updated_count += 1

        expected_prev_hash = event.event_hash

    if updated_count > 0:
        db.commit()

    return updated_count


def verify_audit_integrity(db: Session) -> Dict[str, Any]:
    """Verifies the complete tamper-evident audit trail chain from Genesis to Head."""
    events = db.scalars(select(AuditLog).order_by(AuditLog.id.asc())).all()

    if not events:
        return {
            "is_valid": True,
            "status": "VERIFIED_INTACT",
            "total_events": 0,
            "genesis_hash": GENESIS_HASH,
            "head_hash": GENESIS_HASH,
            "verified_at": datetime.utcnow().isoformat(),
            "broken_chain_count": 0,
            "discrepancies": [],
            "chain_summary": [],
        }

    expected_prev_hash = GENESIS_HASH
    discrepancies: List[Dict[str, Any]] = []
    chain_summary: List[Dict[str, Any]] = []

    for event in events:
        seq = event.sequence_number or event.id
        
        # 1. Check link to previous hash
        link_intact = (event.previous_event_hash == expected_prev_hash)
        
        # 2. Recompute expected hash
        expected_hash = compute_canonical_event_hash(
            seq=seq,
            action=event.action,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            actor_user_id=event.actor_user_id,
            actor_role=event.actor_role,
            detail=event.detail,
            previous_value=event.previous_value,
            new_value=event.new_value,
            reason=event.reason,
            previous_event_hash=event.previous_event_hash or expected_prev_hash,
        )
        
        hash_intact = (event.event_hash == expected_hash)

        if not link_intact or not hash_intact:
            discrepancies.append({
                "event_id": event.id,
                "sequence": seq,
                "action": event.action,
                "link_intact": link_intact,
                "hash_intact": hash_intact,
                "stored_hash": event.event_hash,
                "computed_hash": expected_hash,
                "stored_prev_hash": event.previous_event_hash,
                "expected_prev_hash": expected_prev_hash,
            })

        # Advance pointer
        expected_prev_hash = event.event_hash or expected_hash

    is_valid = len(discrepancies) == 0
    head_event = events[-1]

    # Generate summary for visual verification
    recent_events = events[-8:]
    for ev in recent_events:
        chain_summary.append({
            "id": ev.id,
            "sequence": ev.sequence_number or ev.id,
            "action": ev.action,
            "actor_role": ev.actor_role or "SYSTEM",
            "actor_name": ev.actor.full_name if ev.actor else "System",
            "short_hash": (ev.event_hash or "")[:12],
            "short_prev_hash": (ev.previous_event_hash or "")[:12],
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
        })

    return {
        "is_valid": is_valid,
        "status": "VERIFIED_INTACT" if is_valid else "INTEGRITY_COMPROMISED",
        "total_events": len(events),
        "genesis_hash": GENESIS_HASH,
        "head_hash": head_event.event_hash if head_event else GENESIS_HASH,
        "verified_at": datetime.utcnow().isoformat(),
        "broken_chain_count": len(discrepancies),
        "discrepancies": discrepancies,
        "chain_summary": chain_summary,
    }
