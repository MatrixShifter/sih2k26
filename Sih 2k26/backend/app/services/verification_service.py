"""Run simulated OCR, portal stubs, integrity, scoring and persist results."""

from __future__ import annotations

import re

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models.bid_application import BidApplication, BidStatus, VerificationStatus
from app.models.bidder import Bidder
from app.models.compliance import ComplianceCheck, Recommendation, RiskLevel
from app.models.document import Document, DocumentStatus
from app.models.tender import Tender
from app.models.user import User
from app.models.verification_result import VerificationResult
from app.services import (
    bidder_similarity,
    compliance_engine,
    digilocker_service,
    document_integrity,
    epfo_service,
    esic_service,
    gst_service,
    mca_service,
    nsic_service,
    startup_india_service,
    udyam_service,
)
from app.services.ai_verification import extract_document
from app.services.audit_service import record as audit_record
from app.services.notify import notify_users

PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


def _pan_check(pan: str | None) -> dict:
    if not pan:
        return {"simulated": True, "source": "NSDL_PAN", "status": "missing", "summary": "PAN not furnished."}
    ok = bool(PAN_RE.match(pan))
    return {
        "simulated": True,
        "source": "NSDL_PAN",
        "status": "pass" if ok else "fail",
        "pan": pan,
        "summary": f"Simulated PAN format check for {pan}: {'valid' if ok else 'invalid'}.",
    }


def run_verification(db: Session, bid: BidApplication, actor: User) -> ComplianceCheck:
    bid = db.scalar(
        select(BidApplication)
        .options(
            selectinload(BidApplication.bidder),
            selectinload(BidApplication.documents),
            selectinload(BidApplication.tender).selectinload(Tender.requirements),
        )
        .where(BidApplication.id == bid.id)
    )
    assert bid is not None
    bidder = bid.bidder
    documents = list(bid.documents)
    requirements = list(bid.tender.requirements)

    for doc in documents:
        fields = extract_document(doc, bidder)
        doc.extracted_fields = fields
        doc.issued_name = fields.get("company_name")
        if fields.get("expiry_date"):
            from datetime import date as date_cls

            try:
                doc.expiry_date = date_cls.fromisoformat(str(fields["expiry_date"])[:10])
            except ValueError:
                doc.expiry_date = None
        from app.services.compliance_engine import _expiry_state

        doc.expiry_state = _expiry_state(fields.get("expiry_date"))

        # Compute SHA-256 binary hash if not already present
        if not doc.sha256_hash:
            doc.sha256_hash = document_integrity.compute_file_hash(doc.stored_path)

        # Run document integrity with duplicate detection across bid documents
        integrity = document_integrity.analyse_integrity(doc, fields, all_documents=documents)
        doc.integrity_status = integrity["integrity_status"]
        doc.is_duplicate = integrity.get("is_duplicate", False)
        doc.duplicate_of_doc_id = integrity.get("duplicate_of_doc_id")

        # Run 10-step Advanced Document Verification (Phase 3)
        from app.services.document_verifier import verify_document_advanced
        val_result = verify_document_advanced(
            document=doc,
            bidder=bidder,
            all_documents=documents,
            tender_requirements=requirements,
        )
        doc.validation_results = val_result
        doc.status = DocumentStatus.VERIFIED

    portal = {
        "gst": gst_service.verify_gstin(bidder.gstin, bidder.legal_name),
        "udyam": udyam_service.verify_udyam(bidder.udyam_number, bidder.legal_name),
        "mca": mca_service.verify_cin(bidder.cin, bidder.legal_name),
        "epfo": epfo_service.verify_epfo(bidder.epfo_code),
        "esic": esic_service.verify_esic(bidder.esic_code),
        "nsic": nsic_service.verify_nsic(bidder.nsic_registration),
        "startup": startup_india_service.verify_dpiit(bidder.dpiit_startup_number),
        "digilocker": digilocker_service.verify_issued_uri(any(d.document_type.value == "digilocker" for d in documents), bidder.id),
        "pan": _pan_check(bidder.pan),
    }

    db.execute(delete(VerificationResult).where(VerificationResult.bid_id == bid.id))
    for key, payload in portal.items():
        db.add(
            VerificationResult(
                bid_id=bid.id,
                check_key=key,
                source=payload.get("source", key),
                status=payload.get("status", "unknown"),
                simulated=True,
                summary=payload.get("summary", ""),
                payload=payload,
            )
        )
        audit_record(
            db,
            action=f"verify.{key}",
            entity_type="bid",
            entity_id=bid.id,
            bid_id=bid.id,
            actor_user_id=actor.id,
            actor_role=actor.role.value,
            result=payload.get("status"),
            detail=payload.get("summary", key),
            extra={"simulated": True},
        )

    integrity_by_doc = {
        doc.id: document_integrity.analyse_integrity(doc, doc.extracted_fields or {}, all_documents=documents) for doc in documents
    }
    others = list(db.scalars(select(Bidder).where(Bidder.id != bidder.id)))
    related = bidder_similarity.find_related(bidder, others)

    result = compliance_engine.evaluate(
        bidder=bidder,
        bid=bid,
        documents=documents,
        requirements=requirements,
        portal=portal,
        integrity_by_doc=integrity_by_doc,
        related=related,
    )

    check = ComplianceCheck(
        bidder_id=bidder.id,
        tender_id=bid.tender_id,
        bid_id=bid.id,
        overall_score=result["overall_score"],
        confidence=result["confidence"],
        risk_level=RiskLevel(result["risk_level"]),
        recommendation=Recommendation(result["recommendation"]),
        summary=result["summary"],
        score_breakdown={
            "weights": compliance_engine.WEIGHTS,
            "earned": result["score_breakdown"],
            "lines": result["explanations"],
            "officer_actions": result.get("officer_actions", []),
            "failed_requirements": result.get("failed_requirements", []),
        },
        requirement_results=result["requirement_results"],
        contradictions=result["contradictions"],
        risk_factors=result["risk_factors"],
        related_bidders=result["related_bidders"],
        findings=result["findings"],
        triggered_by_user_id=actor.id,
    )
    db.add(check)
    bid.verification_status = VerificationStatus.VERIFIED
    if bid.status.value in {"submitted", "draft"}:
        bid.status = BidStatus.UNDER_REVIEW
    db.flush()

    audit_record(
        db,
        action="compliance.score",
        entity_type="bid",
        entity_id=bid.id,
        bid_id=bid.id,
        actor_user_id=actor.id,
        actor_role=actor.role.value,
        result=str(result["overall_score"]),
        detail=f"Compliance score {result['overall_score']} risk {result['risk_level']} recommend {result['recommendation']}",
        extra={"check_id": check.id},
    )
    if result["contradictions"]:
        audit_record(
            db,
            action="compliance.contradiction",
            entity_type="bid",
            entity_id=bid.id,
            bid_id=bid.id,
            actor_user_id=actor.id,
            actor_role=actor.role.value,
            result="detected",
            detail=f"{len(result['contradictions'])} contradiction(s) detected",
        )
    notify_users(
        db,
        kind="verification_completed",
        title="Verification completed",
        body=f"{bid.reference_code}: score {result['overall_score']}, risk {result['risk_level']}.",
        bid_id=bid.id,
        officer=True,
        bidder_id=bidder.id,
    )
    if result["risk_level"] == "high":
        notify_users(
            db,
            kind="high_risk",
            title="High-risk bid",
            body=f"{bid.reference_code} is scored HIGH risk and needs officer review.",
            bid_id=bid.id,
            officer=True,
        )
    if result["failed_requirements"]:
        notify_users(
            db,
            kind="missing_document",
            title="Eligibility gaps on packet",
            body="; ".join(result["failed_requirements"][:4]),
            bid_id=bid.id,
            bidder_id=bidder.id,
        )
    return check
