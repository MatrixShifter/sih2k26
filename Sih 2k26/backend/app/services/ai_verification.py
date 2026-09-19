"""Simulated OCR field extraction from uploaded bid artefacts.

TODO: Replace `_ocr_extract` with a real OCR / document-intelligence call on stored_path.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.models.bidder import Bidder
from app.models.document import Document, DocumentType


def _ocr_extract(document: Document, bidder: Bidder) -> dict[str, Any]:
    """Pretend OCR ran on document.stored_path."""
    existing = document.extracted_fields or {}
    if existing:
        return dict(existing)

    base: dict[str, Any] = {
        "company_name": bidder.legal_name,
        "address": bidder.registered_address,
        "directors": bidder.director_name,
        "simulated_ocr": True,
    }
    dtype = document.document_type
    if dtype == DocumentType.PAN:
        base.update({"pan": bidder.pan, "certificate_number": bidder.pan})
    elif dtype == DocumentType.GST:
        base.update(
            {
                "gstin": bidder.gstin,
                "certificate_number": bidder.gstin,
                "expiry_date": (date.today() + timedelta(days=400)).isoformat(),
            }
        )
    elif dtype == DocumentType.UDYAM:
        base.update({"udyam_number": bidder.udyam_number, "certificate_number": bidder.udyam_number})
    elif dtype == DocumentType.MCA21:
        base.update({"cin": bidder.cin, "certificate_number": bidder.cin})
    elif dtype == DocumentType.FINANCIAL:
        base.update({
            "turnover": float(bidder.annual_turnover_inr or 0),
            "fiscal_years_audited": 3,
            "net_worth_positive": True,
            "auditor_udin": "23458921AAAAAA9999",
        })
    elif dtype == DocumentType.EXPERIENCE or dtype == DocumentType.WORK_ORDER:
        base.update({
            "years_experience": bidder.years_experience,
            "institutional_client_count": 4 if (bidder.years_experience or 0) >= 3 else 1,
            "client_types": ["Central Govt", "State PSUs", "Autonomous Bodies"],
        })
    elif dtype == DocumentType.OEM:
        base.update({
            "certificate_number": f"OEM-{bidder.id}-2026",
            "oem_name": "Intel/HP/Dell OEM Alliance",
            "authorization_valid_until": (date.today() + timedelta(days=730)).isoformat(),
            "tender_specific_authorization": True,
            "warranty_commitment_years": 3,
        })
    elif dtype == DocumentType.TECHNICAL:
        # Technical datasheet / standard specifications
        base.update({
            "certificate_number": f"SPEC-TECH-{bidder.id}-2026",
            "cpu": "Intel Core i5-12400 (12th Gen, 6 Cores, up to 4.40 GHz)",
            "cpu_model": "Intel Core i5",
            "ram_gb": 16,
            "ram_display": "16 GB DDR4 3200MHz",
            "ssd_gb": 512,
            "storage_display": "512 GB M.2 NVMe PCIe SSD",
            "display_inch": 15.6,
            "display_resolution": "1920x1080 FHD Anti-Glare",
            "warranty_years": 3,
            "standards_compliance": ["BIS IS 13252", "EPEAT Silver", "Energy Star 8.0", "RoHS"],
        })
    return base


def extract_document(document: Document, bidder: Bidder) -> dict[str, Any]:
    return _ocr_extract(document, bidder)
