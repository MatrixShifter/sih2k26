"""Simulated document-integrity indicators.

This is NOT a forensic authentication or digital-signature validation system.
TODO: Replace heuristics with a document-intelligence / DSC verification pipeline.
"""

from __future__ import annotations

from datetime import date, timedelta

from app.models.document import Document


import hashlib
from pathlib import Path


def compute_file_hash(stored_path: str | None, raw_bytes: bytes | None = None) -> str:
    """Compute SHA-256 hash of document binary content."""
    if raw_bytes is not None:
        return hashlib.sha256(raw_bytes).hexdigest()
    if stored_path and Path(stored_path).exists():
        hasher = hashlib.sha256()
        with open(stored_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    # Deterministic fallback hash based on filename / mock
    return hashlib.sha256(str(stored_path or "fallback_doc").encode("utf-8")).hexdigest()


def analyse_integrity(
    document: Document,
    extracted: dict,
    all_documents: list[Document] | None = None,
) -> dict:
    reasons: list[str] = []
    name = (document.original_filename or "").lower()

    # 1. SHA-256 Hash check
    file_hash = document.sha256_hash or compute_file_hash(document.stored_path)

    # 2. Duplicate Detection
    is_duplicate = False
    duplicate_doc_id = None
    if all_documents:
        for other in all_documents:
            if other.id != document.id and other.sha256_hash and file_hash:
                if other.sha256_hash == file_hash:
                    is_duplicate = True
                    duplicate_doc_id = other.id
                    reasons.append(f"Identical file binary hash detected (duplicate of document #{other.id} - '{other.original_filename}').")
                    break

    # 3. Filename heuristics
    if "scan_copy" in name or "whatsapp" in name:
        reasons.append("Filename resembles an informal mobile scan or unsanctioned messaging app copy (simulated metadata heuristic).")
    if extracted.get("modified_after_issue"):
        reasons.append("Extracted issue date is later than the stated modified timestamp (simulated tampering anomaly).")
    if document.document_type.value in {"gst", "udyam", "pan"} and not extracted.get("certificate_number") and not extracted.get("pan") and not extracted.get("gstin") and not extracted.get("udyam_number"):
        reasons.append("Expected mandatory identifier field was not extractable.")

    # 4. Expiry evaluation
    expiry = extracted.get("expiry_date")
    if expiry:
        try:
            exp = date.fromisoformat(str(expiry)[:10])
            if exp < date.today():
                reasons.append("Certificate expiry date is in the past (document expired).")
            elif exp < date.today() + timedelta(days=30):
                reasons.append("Certificate expires within 30 days.")
        except ValueError:
            reasons.append("Expiry date could not be parsed.")

    if extracted.get("force_suspicious"):
        reasons.append(extracted.get("integrity_note") or "Seeded suspicious indicator for demo.")

    if not reasons:
        return {
            "integrity_status": "CLEAN",
            "risk": "LOW",
            "simulated": True,
            "sha256_hash": file_hash,
            "is_duplicate": False,
            "duplicate_of_doc_id": None,
            "reasons": ["No simulated integrity anomalies or binary discrepancies on this artefact."],
        }
    high = any("past" in r.lower() or "suspicious" in r.lower() or "tampering" in r.lower() for r in reasons)
    return {
        "integrity_status": "SUSPICIOUS",
        "risk": "HIGH" if high else "MEDIUM",
        "simulated": True,
        "sha256_hash": file_hash,
        "is_duplicate": is_duplicate,
        "duplicate_of_doc_id": duplicate_doc_id,
        "reasons": reasons,
    }
