"""Simulated AI extraction of GeM tender eligibility requirements.

TODO: Replace this rule/template extractor with a document-intelligence / LLM
pipeline (Azure DI, Gemini, or an on-prem model) that reads the actual GeM PDF/ATC.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from app.models.tender import Tender


DEFAULT_MEDICAL_SOURCE = """
GeM Bid Number: GEM/2026/B/4589217
Title: Supply of Medical Diagnostic Equipment
Department: Government Health Services
Tender Value: INR 48,50,000
Bid closing date: 30 October 2026

Eligibility (ATC):
1. Valid GST registration (active).
2. Valid PAN of the bidding entity.
3. Active Udyam / MSME registration. MSE purchase preference applies.
4. Minimum average annual turnover of INR 1,00,00,000 in the last three financial years.
5. Minimum three years of relevant experience in supply of diagnostic equipment to government or large hospitals.
6. OEM authorisation certificate for quoted makes (or in-house OEM declaration).
7. Valid technical / BIS / CDSCO certification for quoted equipment as applicable.
8. Bidder shall not have been debarred or have major GeM / CVC compliance violations in the last three years.
9. EPFO and ESIC coverage where employee threshold is met.
"""


DEFAULT_LAPTOP_SOURCE = """
GeM Bid Number: GEM/2026/B/9082341
Title: Supply of 20,000 Laptops for Government Institutions
Department: Department of Electronics and Information Technology
Tender Value: INR 100,00,00,000
Bid closing date: 15 December 2026

Eligibility & Technical Specifications (ATC):
1. CPU: Intel Core i5 (11th Gen or higher) or equivalent.
2. RAM: Minimum 16 GB DDR4/DDR5 RAM.
3. Storage: Minimum 512 GB NVMe SSD.
4. Display: Minimum 15.6 inch Full HD (1920x1080) Anti-glare display.
5. Warranty: Minimum 3 years comprehensive on-site OEM warranty.
6. Valid GST registration (active status).
7. Valid PAN of the bidding entity.
8. Minimum average annual turnover of INR 50,00,00,000 in the last three financial years.
9. Audited financial balance sheets for the last 3 financial years.
10. Minimum 3 years of relevant experience in supply of IT hardware/laptops to government or PSUs.
11. Past completion certificates for institutional or government computer equipment supplies.
12. Valid OEM Manufacturer Authorisation Form (MAF) specific to this bid.
"""


def extract_requirements(tender: Tender, source_text: str | None = None) -> list[dict[str, Any]]:
    """Return structured requirements. Configurable tender requirement rule system."""
    raw_text = (source_text or tender.source_text or "")
    text = (raw_text or DEFAULT_MEDICAL_SOURCE).lower()
    value = float(tender.estimated_value_inr)
    is_laptop = any(k in text for k in ["laptop", "core i5", "ssd", "ram", "display", "notebook", "intel"])

    if is_laptop:
        turnover = 500_000_000 if "50 crore" in text or "50,00,00,000" in text or value >= 100_000_000 else 100_000_000
        return [
            {
                "requirement": "CPU >= Intel Core i5 or equivalent",
                "title": "Processor Specification",
                "description": "Processor must be Intel Core i5 11th Gen or higher, or equivalent AMD Ryzen 5 processor.",
                "category": "TECHNICAL",
                "mandatory": True,
                "required_value": "Intel Core i5 or equivalent",
                "comparison_operator": ">=",
                "weight": 10.0,
                "threshold": None,
                "currency": None,
                "evidence_types": ["technical"],
                "notes": "Verified against OEM technical datasheet / hardware specification sheet.",
            },
            {
                "requirement": "RAM >= 16 GB",
                "title": "System Memory",
                "description": "Minimum 16 GB DDR4/DDR5 RAM installed from factory.",
                "category": "TECHNICAL",
                "mandatory": True,
                "required_value": "16 GB",
                "comparison_operator": ">=",
                "weight": 10.0,
                "threshold": 16.0,
                "currency": "GB",
                "evidence_types": ["technical"],
                "notes": "Verified from Technical Datasheet RAM configuration.",
            },
            {
                "requirement": "Storage >= 512 GB SSD",
                "title": "Internal Storage",
                "description": "Minimum 512 GB M.2 NVMe Solid State Drive (SSD).",
                "category": "TECHNICAL",
                "mandatory": True,
                "required_value": "512 GB SSD",
                "comparison_operator": ">=",
                "weight": 10.0,
                "threshold": 512.0,
                "currency": "GB",
                "evidence_types": ["technical"],
                "notes": "Verified from technical specification sheet and benchmark report.",
            },
            {
                "requirement": "Display >= 15.6 inch FHD",
                "title": "Display Size & Resolution",
                "description": "15.6 inch or larger Full HD (1920x1080) LED display with anti-glare coating.",
                "category": "TECHNICAL",
                "mandatory": True,
                "required_value": "15.6 inch FHD",
                "comparison_operator": ">=",
                "weight": 5.0,
                "threshold": 15.6,
                "currency": "inch",
                "evidence_types": ["technical"],
                "notes": "Verified from OEM product catalogue.",
            },
            {
                "requirement": "Warranty >= 3 years",
                "title": "Comprehensive Warranty",
                "description": "3-year on-site comprehensive OEM manufacturer warranty including battery and power adapter.",
                "category": "TECHNICAL",
                "mandatory": True,
                "required_value": "3 years",
                "comparison_operator": ">=",
                "weight": 5.0,
                "threshold": 3.0,
                "currency": "years",
                "evidence_types": ["oem", "technical"],
                "notes": "OEM warranty undertaking letter and service commitment.",
            },
            {
                "requirement": "Valid GST registration",
                "title": "Statutory GST Compliance",
                "description": "Active GSTIN registration certificate with compliant filing record.",
                "category": "LEGAL",
                "mandatory": True,
                "required_value": "Active GSTIN",
                "comparison_operator": "==",
                "weight": 10.0,
                "threshold": None,
                "currency": None,
                "evidence_types": ["gst"],
                "notes": "Active GSTIN registration with valid expiry.",
            },
            {
                "requirement": "Valid PAN",
                "title": "Income Tax PAN",
                "description": "Valid Permanent Account Number matching legal entity name.",
                "category": "LEGAL",
                "mandatory": True,
                "required_value": "Valid PAN",
                "comparison_operator": "==",
                "weight": 10.0,
                "threshold": None,
                "currency": None,
                "evidence_types": ["pan"],
                "notes": "PAN card verified against registered legal name.",
            },
            {
                "requirement": "Average annual turnover >= ₹50 Crore",
                "title": "Minimum Annual Turnover",
                "description": f"Average annual financial turnover of at least INR {turnover:,.0f} in preceding 3 financial years.",
                "category": "FINANCIAL",
                "mandatory": True,
                "required_value": f"INR {turnover:,.0f}",
                "comparison_operator": ">=",
                "weight": 15.0,
                "threshold": turnover,
                "currency": "INR",
                "evidence_types": ["financial"],
                "notes": "Audited CA turnover certificate / Profit & Loss statements.",
            },
            {
                "requirement": "Financial statements for required years",
                "title": "Audited Financial Statements",
                "description": "Audited balance sheet and profit/loss statements for past 3 fiscal years.",
                "category": "FINANCIAL",
                "mandatory": True,
                "required_value": "3 Fiscal Years",
                "comparison_operator": ">=",
                "weight": 5.0,
                "threshold": 3.0,
                "currency": "years",
                "evidence_types": ["financial"],
                "notes": "Audited balance sheet copies signed by Chartered Accountant with UDIN.",
            },
            {
                "requirement": "Minimum 3 years relevant experience",
                "title": "IT Supply Track Record",
                "description": "Bidder must possess minimum 3 years experience supplying commercial IT equipment / laptops.",
                "category": "EXPERIENCE",
                "mandatory": True,
                "required_value": "3 years",
                "comparison_operator": ">=",
                "weight": 10.0,
                "threshold": 3.0,
                "currency": "years",
                "evidence_types": ["experience", "work_order"],
                "notes": "Past contract orders and experience declarations.",
            },
            {
                "requirement": "Previous government/institutional supply experience",
                "title": "Institutional Supply Proof",
                "description": "Documentary proof of prior supply of laptops/computers to Central/State Govt, PSUs or Autonomous bodies.",
                "category": "EXPERIENCE",
                "mandatory": False,
                "required_value": "Institutional Proof",
                "comparison_operator": "==",
                "weight": 5.0,
                "threshold": None,
                "currency": None,
                "evidence_types": ["work_order", "experience"],
                "notes": "Client satisfaction / work completion certificates.",
            },
            {
                "requirement": "OEM authorization required",
                "title": "OEM Manufacturer Authorization (MAF)",
                "description": "Manufacturer Authorization Form (MAF) from the Laptop OEM guaranteeing genuine supplies & support.",
                "category": "AUTHORIZATION",
                "mandatory": True,
                "required_value": "Valid MAF / Authorization",
                "comparison_operator": "==",
                "weight": 10.0,
                "threshold": None,
                "currency": None,
                "evidence_types": ["oem"],
                "notes": "Tender-specific MAF with official OEM digital stamp.",
            },
        ]

    turnover = 10_000_000 if "1,00,00,000" in text or "1 crore" in text or value >= 4_000_000 else 2_500_000
    years = 3 if "three years" in text or "3 years" in text else 1

    rows: list[dict[str, Any]] = [
        {
            "requirement": "Valid GST registration",
            "title": "Statutory GST Registration",
            "description": "Valid and active Goods and Services Tax Identification Number (GSTIN).",
            "category": "TAX",
            "mandatory": True,
            "required_value": "Active GSTIN",
            "comparison_operator": "==",
            "weight": 15.0,
            "threshold": None,
            "currency": None,
            "evidence_types": ["gst"],
            "notes": "GSTIN must be active on GSTN (simulated check).",
        },
        {
            "requirement": "Valid PAN",
            "title": "Income Tax PAN",
            "description": "Valid Permanent Account Number in the name of the bidding entity.",
            "category": "IDENTITY",
            "mandatory": True,
            "required_value": "Valid PAN",
            "comparison_operator": "==",
            "weight": 20.0,
            "threshold": None,
            "currency": None,
            "evidence_types": ["pan"],
            "notes": "PAN must match the bidding legal name.",
        },
        {
            "requirement": "Active Udyam / MSME registration",
            "title": "MSME Udyam Registration",
            "description": "Active Udyam certificate for claiming Public Procurement Policy MSE benefits.",
            "category": "MSME",
            "mandatory": True,
            "required_value": "Active MSME",
            "comparison_operator": "==",
            "weight": 15.0,
            "threshold": None,
            "currency": None,
            "evidence_types": ["udyam"],
            "notes": "MSE purchase preference applies where Udyam is live.",
        },
        {
            "requirement": "Minimum annual turnover",
            "title": "Average Annual Turnover",
            "description": f"Average annual financial turnover of at least INR {turnover:,.0f}.",
            "category": "FINANCIAL",
            "mandatory": True,
            "required_value": f"INR {turnover:,.0f}",
            "comparison_operator": ">=",
            "weight": 15.0,
            "threshold": turnover,
            "currency": "INR",
            "evidence_types": ["financial"],
            "notes": f"Average annual turnover of at least INR {turnover:,.0f}.",
        },
        {
            "requirement": "Minimum relevant experience",
            "title": "Operating Experience",
            "description": f"Minimum {years} years supplying comparable goods/services.",
            "category": "EXPERIENCE",
            "mandatory": True,
            "required_value": f"{years} years",
            "comparison_operator": ">=",
            "weight": 15.0,
            "threshold": years,
            "currency": None,
            "evidence_types": ["experience", "work_order"],
            "notes": f"At least {years} years supplying comparable goods to government buyers.",
        },
        {
            "requirement": "OEM authorisation",
            "title": "OEM Manufacturer Authorization",
            "description": "OEM authorisation or self-manufacture declaration for quoted products.",
            "category": "TECHNICAL",
            "mandatory": True,
            "required_value": "Valid Authorization",
            "comparison_operator": "==",
            "weight": 10.0,
            "threshold": None,
            "currency": None,
            "evidence_types": ["oem"],
            "notes": "OEM authorisation or self-manufacture declaration required.",
        },
        {
            "requirement": "Valid technical certification",
            "title": "Technical / Standards Certification",
            "description": "Applicable BIS / CDSCO / ISO or product specification compliance standards.",
            "category": "TECHNICAL",
            "mandatory": True,
            "required_value": "Certified",
            "comparison_operator": "==",
            "weight": 10.0,
            "threshold": None,
            "currency": None,
            "evidence_types": ["technical"],
            "notes": "BIS / CDSCO / NABL artefacts as applicable to quoted SKUs.",
        },
        {
            "requirement": "No major compliance violations",
            "title": "Statutory Integrity & Debarment",
            "description": "No debarment, blacklisting, or CIRP proceedings under MCA21.",
            "category": "INTEGRITY",
            "mandatory": True,
            "required_value": "Clean Standing",
            "comparison_operator": "==",
            "weight": 5.0,
            "threshold": None,
            "currency": None,
            "evidence_types": ["mca21", "gst"],
            "notes": "No debarment or struck-off / CIRP status on MCA21 (simulated).",
        },
    ]
    return rows


def parsed_tender_summary(tender: Tender) -> dict[str, Any]:
    return {
        "tender_title": tender.title,
        "tender_id": tender.gem_bid_number,
        "department": tender.department,
        "tender_value": float(tender.estimated_value_inr),
        "deadline": tender.closing_date.isoformat() if isinstance(tender.closing_date, date) else str(tender.closing_date),
        "extraction_mode": "SIMULATED_AI",
    }
