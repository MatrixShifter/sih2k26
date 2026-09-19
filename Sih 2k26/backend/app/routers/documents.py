"""Upload, list, replace, delete and download bid documents."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_officer
from app.core.errors import raise_api
from app.models.document import Document, DocumentStatus, DocumentType
from app.models.user import User, UserRole
from app.schemas.domain import DocumentFieldsUpdateIn, DocumentOut
from app.services import audit_service
from app.services.access import get_bid_or_404
from app.services.files import store_bytes, validate_upload

router = APIRouter(tags=["documents"])
settings = get_settings()


def _assert_doc_access(doc: Document, user: User) -> None:
    if user.role == UserRole.BIDDER and doc.bidder_id != user.bidder_id:
        raise_api(403, "FORBIDDEN", "You can only access your own documents.")


@router.get("/documents")
def list_all_documents(
    q: str | None = None,
    document_type: str | None = None,
    status: str | None = None,
    integrity: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    from sqlalchemy import select
    from app.models.bidder import Bidder
    from app.models.bid_application import BidApplication
    from app.models.tender import Tender

    stmt = (
        select(Document, Bidder, BidApplication, Tender)
        .join(Bidder, Bidder.id == Document.bidder_id)
        .join(BidApplication, BidApplication.id == Document.bid_id)
        .join(Tender, Tender.id == BidApplication.tender_id)
        .order_by(Document.id.desc())
    )
    if user.role == UserRole.BIDDER:
        stmt = stmt.where(Document.bidder_id == user.bidder_id)
    if document_type:
        stmt = stmt.where(Document.document_type == document_type)
    if status:
        stmt = stmt.where(Document.status == status)
    if integrity:
        stmt = stmt.where(Document.integrity_status == integrity)
    if q:
        search = f"%{q.strip()}%"
        stmt = stmt.where(
            (Document.original_filename.ilike(search))
            | (Bidder.legal_name.ilike(search))
            | (Tender.gem_bid_number.ilike(search))
        )

    rows = db.execute(stmt).all()
    results = []
    for doc, bidder, bid, tender in rows:
        results.append({
            "id": doc.id,
            "bid_id": doc.bid_id,
            "bid_reference": bid.reference_code,
            "tender_id": tender.id,
            "tender_gem_bid_number": tender.gem_bid_number,
            "tender_title": tender.title,
            "bidder_id": bidder.id,
            "bidder_legal_name": bidder.legal_name,
            "document_type": doc.document_type.value,
            "original_filename": doc.original_filename,
            "content_type": doc.content_type,
            "file_size_bytes": doc.file_size_bytes,
            "status": doc.status.value,
            "integrity_status": doc.integrity_status,
            "sha256_hash": doc.sha256_hash,
            "version": doc.version if hasattr(doc, "version") and doc.version is not None else 1,
            "is_duplicate": bool(getattr(doc, "is_duplicate", False)),
            "duplicate_of_doc_id": getattr(doc, "duplicate_of_doc_id", None),
            "validation_results": getattr(doc, "validation_results", None),
            "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
            "expiry_state": doc.expiry_state.value if hasattr(doc.expiry_state, "value") else str(doc.expiry_state),
            "extracted_fields": doc.extracted_fields,
            "created_at": doc.created_at.isoformat(),
        })
    return results


@router.get("/bids/{bid_id}/documents", response_model=list[DocumentOut])
def list_bid_documents(
    bid_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Document]:
    bid = get_bid_or_404(db, bid_id, user)
    return list(bid.documents)


@router.post("/bids/{bid_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_bid_document(
    bid_id: int,
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Document:
    bid = get_bid_or_404(db, bid_id, user)
    if user.role == UserRole.BIDDER and not user.bidder_id:
        raise_api(400, "BIDDER_PROFILE_INCOMPLETE", "Bidder profile is incomplete.")
    raw = await file.read()
    validate_upload(file.filename, file.content_type, len(raw))

    existing = next((d for d in bid.documents if d.document_type == document_type), None)
    doc = existing or Document(
        bidder_id=bid.bidder_id,
        bid_id=bid.id,
        document_type=document_type,
        original_filename=file.filename or "upload.bin",
        stored_path="",
        content_type=file.content_type or "application/octet-stream",
        file_size_bytes=len(raw),
        status=DocumentStatus.UPLOADED,
        uploaded_by_user_id=user.id,
    )
    from app.services.document_integrity import compute_file_hash
    file_hash = compute_file_hash(None, raw_bytes=raw)

    if existing:
        if existing.stored_path:
            old = Path(existing.stored_path)
            if old.exists():
                old.unlink(missing_ok=True)
        doc.original_filename = file.filename or doc.original_filename
        doc.content_type = file.content_type or doc.content_type
        doc.file_size_bytes = len(raw)
        doc.sha256_hash = file_hash
        doc.version = (doc.version or 1) + 1
        doc.status = DocumentStatus.UPLOADED
        doc.integrity_status = "pending"
        doc.extracted_fields = None
        action = "document.replace"
    else:
        doc.sha256_hash = file_hash
        doc.version = 1
        db.add(doc)
        db.flush()
        action = "document.upload"

    doc.stored_path = store_bytes(bid.bidder_id, bid.id, doc.id, file.filename or "upload.bin", raw)
    db.flush()

    # Automatically extract & run document verification
    try:
        from app.services.ai_verification import extract_document
        from app.services.document_integrity import analyse_integrity
        from app.services.document_verifier import verify_document_advanced

        doc.extracted_fields = extract_document(doc, bid.bidder)
        doc.issued_name = doc.extracted_fields.get("company_name")
        integ = analyse_integrity(doc, doc.extracted_fields, all_documents=list(bid.documents))
        doc.integrity_status = integ["integrity_status"]
        doc.is_duplicate = integ.get("is_duplicate", False)
        doc.duplicate_of_doc_id = integ.get("duplicate_of_doc_id")
        doc.validation_results = verify_document_advanced(
            document=doc,
            bidder=bid.bidder,
            all_documents=list(bid.documents),
            tender_requirements=list(bid.tender.requirements),
        )
        doc.status = DocumentStatus.VERIFIED
    except Exception:
        pass

    audit_service.record(
        db,
        action=action,
        entity_type="document",
        entity_id=doc.id,
        bid_id=bid.id,
        actor_user_id=user.id,
        actor_role=user.role.value,
        result="uploaded",
        detail=f"{document_type.value} ({doc.original_filename}, SHA256: {file_hash[:8]}..., v{doc.version})",
    )
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    doc = db.get(Document, document_id)
    if doc is None:
        raise_api(404, "DOCUMENT_NOT_FOUND", "The requested document could not be found.")
    _assert_doc_access(doc, user)
    get_bid_or_404(db, doc.bid_id, user)
    path = Path(doc.stored_path) if doc.stored_path else None
    db.delete(doc)
    audit_service.record(
        db,
        action="document.delete",
        entity_type="document",
        entity_id=document_id,
        bid_id=doc.bid_id,
        actor_user_id=user.id,
        actor_role=user.role.value,
        result="deleted",
        detail=f"Removed {doc.document_type.value}",
    )
    db.commit()
    if path and path.exists():
        path.unlink(missing_ok=True)


@router.get("/documents/{document_id}/file")
def download_document(
    document_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> FileResponse:
    doc = db.get(Document, document_id)
    if doc is None:
        raise_api(404, "DOCUMENT_NOT_FOUND", "The requested document could not be found.")
    _assert_doc_access(doc, user)
    get_bid_or_404(db, doc.bid_id, user)
    path = Path(doc.stored_path)
    if not path.exists():
        raise_api(404, "FILE_MISSING", "The stored file is no longer available on this server.")
    return FileResponse(path, media_type=doc.content_type, filename=doc.original_filename)


@router.put("/documents/{document_id}/extracted-fields")
def update_extracted_fields(
    document_id: int,
    payload: DocumentFieldsUpdateIn,
    db: Session = Depends(get_db),
    officer: User = Depends(require_officer),
) -> dict:
    doc = db.get(Document, document_id)
    if doc is None:
        raise_api(404, "DOCUMENT_NOT_FOUND", "The requested document could not be found.")

    doc.extracted_fields = payload.extracted_fields
    if payload.integrity_status:
        doc.integrity_status = payload.integrity_status
    if payload.expiry_date:
        doc.expiry_date = payload.expiry_date

    audit_service.record(
        db,
        action="document.edit_extraction",
        entity_type="document",
        entity_id=doc.id,
        bid_id=doc.bid_id,
        actor_user_id=officer.id,
        actor_role=officer.role.value,
        detail=f"Officer manually updated extracted OCR fields for {doc.document_type.value} ({doc.original_filename})",
        extra={"fields": list(payload.extracted_fields.keys())},
    )
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id,
        "document_type": doc.document_type.value,
        "extracted_fields": doc.extracted_fields,
        "integrity_status": doc.integrity_status,
        "message": "Extracted fields updated and logged to audit trail successfully."
    }
