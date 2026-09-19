"""API Router for SIH 2026 Demonstration Mode."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.tender import Tender
from app.services.demo_seeder import seed_demo_environment, DEMO_TENDER_BID_NUM

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/seed")
def seed_demo(db: Session = Depends(get_db)):
    """Idempotently seeds the 4 fictional bidders, tender, and demonstration data."""
    result = seed_demo_environment(db)
    return {
        "status": "success",
        "message": "SIH Demonstration Mode environment seeded successfully.",
        "data": result,
    }


@router.get("/status")
def demo_status(db: Session = Depends(get_db)):
    """Returns current status of demonstration environment."""
    tender = db.scalar(select(Tender).where(Tender.gem_bid_number == DEMO_TENDER_BID_NUM))
    if not tender:
        return {"active": False, "message": "Demo tender not yet seeded"}

    return {
        "active": True,
        "tender_id": tender.id,
        "gem_bid_number": tender.gem_bid_number,
        "title": tender.title,
        "estimated_value_inr": tender.estimated_value_inr,
        "requirements_count": len(tender.requirements),
        "fictional_disclaimer": "ALL DATA IN THIS MODULE IS STRICTLY FICTIONAL FOR SIH EVALUATION",
    }
