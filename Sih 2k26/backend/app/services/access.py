"""Load bid applications with RBAC."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import raise_api
from app.models.bid_application import BidApplication
from app.models.compliance import ComplianceCheck
from app.models.tender import Tender
from app.models.user import User, UserRole
from app.models.verification_result import VerificationResult
from app.schemas.domain import BidDetail, BidderOut, ComplianceCheckOut, DocumentOut, RequirementOut, TenderOut


def get_bid_or_404(db: Session, bid_id: int, user: User) -> BidApplication:
    bid = db.scalar(
        select(BidApplication)
        .options(
            selectinload(BidApplication.bidder),
            selectinload(BidApplication.documents),
            selectinload(BidApplication.tender).selectinload(Tender.requirements),
            selectinload(BidApplication.verification_results),
            selectinload(BidApplication.compliance_checks),
        )
        .where(BidApplication.id == bid_id)
    )
    if bid is None:
        raise_api(404, "BID_NOT_FOUND", "The requested bid application could not be found.")
    if user.role == UserRole.BIDDER and bid.bidder_id != user.bidder_id:
        raise_api(403, "FORBIDDEN", "You can only access your own bid packets.")
    return bid


def latest_check(db: Session, bid_id: int) -> ComplianceCheck | None:
    return db.scalar(
        select(ComplianceCheck).where(ComplianceCheck.bid_id == bid_id).order_by(ComplianceCheck.created_at.desc()).limit(1)
    )


def to_detail(db: Session, bid: BidApplication) -> BidDetail:
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
            "created_at": row.created_at.isoformat(),
        }
        for row in (bid.verification_results or [])
    ]
    return BidDetail(
        id=bid.id,
        reference_code=bid.reference_code,
        status=bid.status,
        verification_status=bid.verification_status,
        decision_notes=bid.decision_notes,
        override_reason=bid.override_reason,
        decided_at=bid.decided_at,
        tender=TenderOut(
            id=bid.tender.id,
            gem_bid_number=bid.tender.gem_bid_number,
            title=bid.tender.title,
            department=bid.tender.department,
            category=bid.tender.category,
            estimated_value_inr=bid.tender.estimated_value_inr,
            closing_date=bid.tender.closing_date,
            description=bid.tender.description,
            requirements=[RequirementOut.model_validate(r) for r in bid.tender.requirements],
            created_at=bid.tender.created_at,
        ),
        bidder=BidderOut.model_validate(bid.bidder),
        documents=[DocumentOut.model_validate(d) for d in bid.documents],
        latest_check=ComplianceCheckOut.model_validate(check) if check else None,
        verification_results=results,
        created_at=bid.created_at,
        updated_at=bid.updated_at,
    )
