"""SIH Demonstration Mode Seeder.
Creates a controlled, realistic demo environment with 4 fictional bidders for the ₹10 Cr Government Laptop Procurement tender.
All entities are clearly identified as fictional demonstration data.
"""

from datetime import date, datetime, timedelta
import json
from typing import Dict, Any

from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.models.tender import Tender
from app.models.tender_requirement import TenderRequirement
from app.models.bidder import Bidder
from app.models.bid_application import BidApplication, BidStatus, VerificationStatus
from app.models.compliance import ComplianceCheck, RiskLevel, Recommendation
from app.models.delivery import DeliveryBatch, ProductAsset, InspectionCase
from app.services.audit_service import record, backfill_event_chain


DEMO_TENDER_BID_NUM = "GEM/2026/B/9082341"


def seed_demo_environment(db: Session) -> Dict[str, Any]:
    """Idempotently seeds or refreshes the Phase 11 SIH Demonstration environment."""

    # -------------------------------------------------------------
    # 1. Tender: Government Laptop Procurement (₹10 Cr, 20,000 Units)
    # -------------------------------------------------------------
    tender = db.scalar(select(Tender).where(Tender.gem_bid_number == DEMO_TENDER_BID_NUM))
    if not tender:
        tender = Tender(
            gem_bid_number=DEMO_TENDER_BID_NUM,
            title="Procurement of 20,000 Laptops for Government Educational & Administrative Institutions",
            department="Department of School Education & Literacy, Ministry of Education",
            category="Hardware & IT Equipment",
            estimated_value_inr=100000000.0,  # ₹10.00 Crore
            closing_date=date.today() + timedelta(days=28),
            description=(
                "[SIH DEMO] Procurement of 20,000 high-performance laptops with 3-year OEM on-site comprehensive warranty, "
                "Windows 11 Pro, minimum Core i5 or equivalent processor, 16GB RAM, and 512GB NVMe SSD for central universities and digital classrooms."
            ),
        )
        db.add(tender)
        db.flush()

    # Ensure 12 Structured ATC Requirements
    db.query(TenderRequirement).filter(TenderRequirement.tender_id == tender.id).delete()
    db.flush()

    demo_reqs = [
        # Technical
        TenderRequirement(
            tender_id=tender.id,
            requirement="CPU >= Intel Core i5 or equivalent",
            title="Processor Specification",
            description="Minimum Intel Core i5 11th Gen or AMD Ryzen 5 equivalent (min 4 cores, 8 threads).",
            category="TECHNICAL",
            mandatory=True,
            required_value="Intel Core i5 or equivalent",
            comparison_operator=">=",
            weight=10.0,
            threshold=11.0,
            evidence_types=["technical"],
            notes="Verified against OEM Technical Datasheet.",
        ),
        TenderRequirement(
            tender_id=tender.id,
            requirement="RAM >= 16 GB DDR4",
            title="System Memory (RAM)",
            description="Minimum 16 GB DDR4 3200MHz RAM expandable up to 32 GB.",
            category="TECHNICAL",
            mandatory=True,
            required_value="16 GB",
            comparison_operator=">=",
            weight=10.0,
            threshold=16.0,
            currency="GB",
            evidence_types=["technical"],
            notes="Verified against OEM Technical Datasheet.",
        ),
        TenderRequirement(
            tender_id=tender.id,
            requirement="Storage >= 512 GB NVMe SSD",
            title="Storage Subsystem",
            description="Solid State Drive minimum 512 GB M.2 NVMe PCIe Gen 3 or higher.",
            category="TECHNICAL",
            mandatory=True,
            required_value="512 GB NVMe SSD",
            comparison_operator=">=",
            weight=10.0,
            threshold=512.0,
            currency="GB",
            evidence_types=["technical"],
            notes="Verified against OEM Technical Datasheet.",
        ),
        TenderRequirement(
            tender_id=tender.id,
            requirement="Display >= 15.6 inch FHD",
            title="Display Panel",
            description="15.6 inch Full HD (1920x1080) anti-glare IPS display minimum 250 nits.",
            category="TECHNICAL",
            mandatory=True,
            required_value="15.6 inch FHD (1920x1080)",
            comparison_operator=">=",
            weight=5.0,
            threshold=15.6,
            currency="inch",
            evidence_types=["technical"],
            notes="Verified against OEM Technical Datasheet.",
        ),
        TenderRequirement(
            tender_id=tender.id,
            requirement="Warranty >= 3 years",
            title="OEM Comprehensive Warranty",
            description="Minimum 3 years comprehensive on-site OEM manufacturer warranty.",
            category="TECHNICAL",
            mandatory=True,
            required_value="3 years on-site",
            comparison_operator=">=",
            weight=10.0,
            threshold=3.0,
            currency="years",
            evidence_types=["warranty", "technical"],
            notes="Verified against OEM Warranty Undertaking.",
        ),
        # Legal
        TenderRequirement(
            tender_id=tender.id,
            requirement="Valid GST registration",
            title="GSTIN Registration Status",
            description="Active Goods & Services Tax (GST) registration with compliant return filing status.",
            category="LEGAL",
            mandatory=True,
            required_value="Active GSTIN",
            comparison_operator="==",
            weight=10.0,
            evidence_types=["gst", "registry"],
            notes="Verified against GSTN Registry Simulator.",
        ),
        TenderRequirement(
            tender_id=tender.id,
            requirement="Valid PAN",
            title="Permanent Account Number (PAN)",
            description="Valid PAN card issued by the Income Tax Department.",
            category="LEGAL",
            mandatory=True,
            required_value="Valid PAN",
            comparison_operator="==",
            weight=10.0,
            evidence_types=["pan", "registry"],
            notes="Verified against NSDL/CBDT Registry Simulator.",
        ),
        # Financial
        TenderRequirement(
            tender_id=tender.id,
            requirement="Turnover >= ₹50 Crore",
            title="Average Annual Financial Turnover",
            description="Average annual turnover of at least ₹50 Crore over last 3 audited financial years.",
            category="FINANCIAL",
            mandatory=True,
            required_value="₹50 Crore",
            comparison_operator=">=",
            weight=10.0,
            threshold=500000000.0,
            currency="INR",
            evidence_types=["financial", "turnover"],
            notes="Verified against Audited Balance Sheet & CA Certificate.",
        ),
        TenderRequirement(
            tender_id=tender.id,
            requirement="Financial statements for required years",
            title="Audited Balance Sheets (3 Years)",
            description="Audited profit and loss accounts and balance sheets for FY 22-23, FY 23-24, and FY 24-25.",
            category="FINANCIAL",
            mandatory=True,
            required_value="3 Years Audited Statements",
            comparison_operator="==",
            weight=5.0,
            evidence_types=["financial"],
            notes="Verified against CA Certified Balance Sheets.",
        ),
        # Experience
        TenderRequirement(
            tender_id=tender.id,
            requirement="Experience >= 3 years",
            title="Years of Relevant Commercial Experience",
            description="Minimum 3 years in commercial supply and support of computing equipment.",
            category="EXPERIENCE",
            mandatory=True,
            required_value="3 years",
            comparison_operator=">=",
            weight=5.0,
            threshold=3.0,
            currency="years",
            evidence_types=["experience"],
            notes="Verified against MCA Incorporation & Client Work Orders.",
        ),
        TenderRequirement(
            tender_id=tender.id,
            requirement="Government supply experience",
            title="Institutional / Government Supply Track Record",
            description="Documented execution of past government, PSU, or institutional IT hardware contracts.",
            category="EXPERIENCE",
            mandatory=True,
            required_value="Executed Gov/PSU Supply Contracts",
            comparison_operator="==",
            weight=5.0,
            evidence_types=["experience", "work_order"],
            notes="Verified against GeM Contract Completion Certificates.",
        ),
        # Authorization
        TenderRequirement(
            tender_id=tender.id,
            requirement="OEM authorization required",
            title="Manufacturer Authorization Form (MAF)",
            description="Specific OEM Manufacturer Authorization Form for this GeM laptop bid.",
            category="AUTHORIZATION",
            mandatory=True,
            required_value="Valid OEM MAF",
            comparison_operator="==",
            weight=10.0,
            evidence_types=["oem", "authorization"],
            notes="Verified against OEM Authorized Signatory Certificate.",
        ),
    ]
    for r in demo_reqs:
        db.add(r)
    db.flush()

    # -------------------------------------------------------------
    # 2. Four Fictional Bidders
    # -------------------------------------------------------------
    # Bidder 1: ABC Technologies (Mostly compliant)
    b1 = db.scalar(select(Bidder).where(Bidder.pan == "AABCA1234K"))
    if not b1:
        b1 = Bidder(
            legal_name="ABC Technologies Private Limited",
            trade_name="ABC Tech",
            registered_address="Plot 44, Okhla Industrial Area Phase-III, New Delhi",
            state="Delhi",
            pincode="110020",
            contact_email="bids@abctechnologies.in",
            contact_phone="011-49823456",
            director_name="Vikramaditya Sharma",
            annual_turnover_inr=650000000.0,  # ₹65 Cr
            years_experience=6,
            pan="AABCA1234K",
            gstin="07AABCA1234K1Z5",
            cin="U72200DL2018PTC329102",
            udyam_number="UDYAM-DL-08-0012345",
        )
        db.add(b1)
        db.flush()

    # Bidder 2: XYZ Computers (Financial/document discrepancy)
    b2 = db.scalar(select(Bidder).where(Bidder.pan == "AABCX5678L"))
    if not b2:
        b2 = Bidder(
            legal_name="XYZ Computers Private Limited",
            trade_name="XYZ Computers",
            registered_address="Sector 62, Electronic City, Noida",
            state="Uttar Pradesh",
            pincode="201309",
            contact_email="sales@xyzcomputers.in",
            contact_phone="0120-4123987",
            director_name="Rohan Mehra",
            annual_turnover_inr=380000000.0,  # ₹38 Cr (< ₹50 Cr requirement!)
            years_experience=4,
            pan="AABCX5678L",
            gstin="09AABCX5678L1Z3",
            cin="U72900UP2019PTC482019",
            udyam_number="UDYAM-UP-28-0054321",
        )
        db.add(b2)
        db.flush()

    # Bidder 3: TechNova Systems (Technical specification failure)
    b3 = db.scalar(select(Bidder).where(Bidder.pan == "AABCT9012M"))
    if not b3:
        b3 = Bidder(
            legal_name="TechNova Systems LLP",
            trade_name="TechNova",
            registered_address="Tech Park Boulevard, Whitefield, Bengaluru",
            state="Karnataka",
            pincode="560066",
            contact_email="gov.tenders@technovasystems.in",
            contact_phone="080-49210088",
            director_name="Suresh Nair",
            annual_turnover_inr=550000000.0,  # ₹55 Cr
            years_experience=5,
            pan="AABCT9012M",
            gstin="29AABCT9012M1Z8",
            cin="LLPIN-AAB-9012",
            udyam_number="UDYAM-KR-03-0099881",
        )
        db.add(b3)
        db.flush()

    # Bidder 4: Digital Systems (Vigilance alert: shared director & address with ABC Tech)
    b4 = db.scalar(select(Bidder).where(Bidder.pan == "AABCD3456N"))
    if not b4:
        b4 = Bidder(
            legal_name="Digital Systems India Pvt. Ltd.",
            trade_name="Digital Systems",
            registered_address="Plot 44, Okhla Industrial Area Phase-III, New Delhi",  # Same Address!
            state="Delhi",
            pincode="110020",
            contact_email="contact@digitalsystems.co.in",
            contact_phone="011-49823456",  # Same Phone!
            director_name="Vikramaditya Sharma",  # Same Director!
            annual_turnover_inr=580000000.0,  # ₹58 Cr
            years_experience=5,
            pan="AABCD3456N",
            gstin="07AABCD3456N1Z2",
            cin="U72900DL2020PTC361284",
            udyam_number="UDYAM-DL-08-0067890",
        )
        db.add(b4)
        db.flush()

    # -------------------------------------------------------------
    # 3. Submitted Bids & Compliance Checks
    # -------------------------------------------------------------
    bidders_data = [
        {
            "bidder": b1,
            "ref": "CG-B9082341-ABC01",
            "score": 95,
            "status": BidStatus.UNDER_REVIEW,
            "risk": RiskLevel.LOW,
            "results": {
                "CPU >= Intel Core i5 or equivalent": {"status": "PASS", "confidence": 98, "extracted": "Intel Core i5-1135G7 (4C/8T, up to 4.2 GHz)", "page": 3, "doc": "ABC_Technical_Datasheet.pdf", "reason": "Processor meets minimum Core i5 specification."},
                "RAM >= 16 GB DDR4": {"status": "PASS", "confidence": 97, "extracted": "16 GB DDR4 3200MHz", "page": 3, "doc": "ABC_Technical_Datasheet.pdf", "reason": "System RAM meets minimum 16 GB DDR4 requirement."},
                "Storage >= 512 GB NVMe SSD": {"status": "PASS", "confidence": 96, "extracted": "512 GB M.2 NVMe PCIe SSD", "page": 4, "doc": "ABC_Technical_Datasheet.pdf", "reason": "Storage capacity satisfies tender 512 GB SSD minimum."},
                "Display >= 15.6 inch FHD": {"status": "PASS", "confidence": 99, "extracted": "15.6 inch FHD (1920x1080) IPS Anti-glare", "page": 4, "doc": "ABC_Technical_Datasheet.pdf", "reason": "Screen size and resolution meet 15.6 inch FHD requirement."},
                "Warranty >= 3 years": {"status": "PASS", "confidence": 95, "extracted": "3 Years Comprehensive On-site OEM Warranty", "page": 1, "doc": "ABC_OEM_Warranty.pdf", "reason": "Warranty duration satisfies 3-year tender term."},
                "Valid GST registration": {"status": "PASS", "confidence": 100, "extracted": "07AABCA1234K1Z5 (Active, Regular)", "page": 1, "doc": "ABC_GST_Certificate.pdf", "reason": "GSTIN verified active in registry."},
                "Valid PAN": {"status": "PASS", "confidence": 100, "extracted": "AABCA1234K", "page": 1, "doc": "ABC_PAN_Card.pdf", "reason": "PAN valid and linked to legal name."},
                "Turnover >= ₹50 Crore": {"status": "PASS", "confidence": 94, "extracted": "₹65.40 Crore (3-year average)", "page": 2, "doc": "ABC_CA_Turnover_Cert.pdf", "reason": "Turnover exceeds required ₹50 Crore threshold."},
                "Financial statements for required years": {"status": "PASS", "confidence": 92, "extracted": "FY 22-23, FY 23-24, FY 24-25 Audited Reports Attached", "page": 1, "doc": "ABC_Audited_Financials.pdf", "reason": "Complete 3-year audited financial statements submitted."},
                "Experience >= 3 years": {"status": "PASS", "confidence": 95, "extracted": "6 Years (Incorporated 2018)", "page": 1, "doc": "ABC_MCA_Certificate.pdf", "reason": "Bidder possesses 6 years experience, exceeding 3-year minimum."},
                "Government supply experience": {"status": "PASS", "confidence": 90, "extracted": "Executed GeM Contracts GEMC-5116877 & GEMC-498122", "page": 1, "doc": "ABC_Past_Performance.pdf", "reason": "Past supply records confirm supply of 15,000+ laptops to institutional buyers."},
                "OEM authorization required": {"status": "PASS", "confidence": 96, "extracted": "OEM Direct Manufacturer Authorization MAF-2026-DL-09", "page": 1, "doc": "ABC_OEM_Authorization.pdf", "reason": "OEM MAF verified authentic with specific tender authorization."},
            }
        },
        {
            "bidder": b2,
            "ref": "CG-B9082341-XYZ02",
            "score": 68,
            "status": BidStatus.UNDER_REVIEW,
            "risk": RiskLevel.MEDIUM,
            "results": {
                "CPU >= Intel Core i5 or equivalent": {"status": "PASS", "confidence": 96, "extracted": "Intel Core i5-1135G7", "page": 2, "doc": "XYZ_Tech_Specs.pdf", "reason": "CPU satisfies requirement."},
                "RAM >= 16 GB DDR4": {"status": "PASS", "confidence": 95, "extracted": "16 GB DDR4", "page": 2, "doc": "XYZ_Tech_Specs.pdf", "reason": "RAM meets 16 GB."},
                "Storage >= 512 GB NVMe SSD": {"status": "PASS", "confidence": 94, "extracted": "512 GB SSD", "page": 2, "doc": "XYZ_Tech_Specs.pdf", "reason": "SSD meets 512 GB."},
                "Display >= 15.6 inch FHD": {"status": "PASS", "confidence": 98, "extracted": "15.6 inch FHD", "page": 3, "doc": "XYZ_Tech_Specs.pdf", "reason": "Display satisfies requirement."},
                "Warranty >= 3 years": {"status": "PASS", "confidence": 90, "extracted": "3 Years On-site", "page": 1, "doc": "XYZ_Warranty.pdf", "reason": "Warranty verified."},
                "Valid GST registration": {"status": "NEEDS_REVIEW", "confidence": 80, "extracted": "09AABCX5678L1Z3 (Discrepancy: GSTR-3B delayed filing flag)", "page": 1, "doc": "XYZ_GST_Doc.pdf", "reason": "Registry simulator indicates GSTR-3B non-compliance notice in last quarter."},
                "Valid PAN": {"status": "PASS", "confidence": 100, "extracted": "AABCX5678L", "page": 1, "doc": "XYZ_PAN.pdf", "reason": "PAN is valid."},
                "Turnover >= ₹50 Crore": {"status": "FAIL", "confidence": 95, "extracted": "₹38.20 Crore (Average 3-years)", "page": 2, "doc": "XYZ_CA_Turnover.pdf", "reason": "Average annual turnover of ₹38.20 Crore fails tender minimum of ₹50 Crore."},
                "Financial statements for required years": {"status": "NEEDS_REVIEW", "confidence": 82, "extracted": "Turnover declared in bid form (₹52 Cr) contradicts CA certificate (₹38.2 Cr)", "page": 1, "doc": "XYZ_Audited_Balance_Sheets.pdf", "reason": "Data contradiction: declared turnover does not match audited CA balance sheet."},
                "Experience >= 3 years": {"status": "PASS", "confidence": 92, "extracted": "4 Years (Incorporated 2019)", "page": 1, "doc": "XYZ_Company_Reg.pdf", "reason": "4 years commercial experience verified."},
                "Government supply experience": {"status": "PASS", "confidence": 88, "extracted": "Supply orders for State Education Dept", "page": 1, "doc": "XYZ_Past_Orders.pdf", "reason": "Past supply orders attached."},
                "OEM authorization required": {"status": "PASS", "confidence": 94, "extracted": "OEM Partner Certificate", "page": 1, "doc": "XYZ_OEM_MAF.pdf", "reason": "OEM authorization attached."},
            }
        },
        {
            "bidder": b3,
            "ref": "CG-B9082341-TNS03",
            "score": 52,
            "status": BidStatus.REJECTED,
            "risk": RiskLevel.HIGH,
            "results": {
                "CPU >= Intel Core i5 or equivalent": {"status": "FAIL", "confidence": 98, "extracted": "Intel Core i3-10110U", "page": 2, "doc": "TechNova_Datasheet.pdf", "reason": "Offered processor is Core i3, failing the mandatory Core i5 requirement."},
                "RAM >= 16 GB DDR4": {"status": "FAIL", "confidence": 99, "extracted": "8 GB DDR4 2666MHz", "page": 2, "doc": "TechNova_Datasheet.pdf", "reason": "Offered RAM is 8 GB, failing the mandatory 16 GB minimum."},
                "Storage >= 512 GB NVMe SSD": {"status": "PASS", "confidence": 92, "extracted": "512 GB SATA SSD", "page": 2, "doc": "TechNova_Datasheet.pdf", "reason": "512 GB storage satisfies capacity threshold."},
                "Display >= 15.6 inch FHD": {"status": "PASS", "confidence": 96, "extracted": "15.6 inch FHD IPS", "page": 3, "doc": "TechNova_Datasheet.pdf", "reason": "Display satisfies requirement."},
                "Warranty >= 3 years": {"status": "PASS", "confidence": 90, "extracted": "3 Years Standard", "page": 1, "doc": "TechNova_Warranty.pdf", "reason": "Warranty duration satisfies requirement."},
                "Valid GST registration": {"status": "PASS", "confidence": 100, "extracted": "29AABCT9012M1Z8", "page": 1, "doc": "TechNova_GST.pdf", "reason": "GST valid and active."},
                "Valid PAN": {"status": "PASS", "confidence": 100, "extracted": "AABCT9012M", "page": 1, "doc": "TechNova_PAN.pdf", "reason": "PAN valid."},
                "Turnover >= ₹50 Crore": {"status": "PASS", "confidence": 91, "extracted": "₹55.10 Crore", "page": 1, "doc": "TechNova_Turnover.pdf", "reason": "Turnover satisfies ₹50 Cr minimum."},
                "Financial statements for required years": {"status": "PASS", "confidence": 90, "extracted": "3 Years Audited Accounts", "page": 1, "doc": "TechNova_Financials.pdf", "reason": "Financial statements attached."},
                "Experience >= 3 years": {"status": "PASS", "confidence": 94, "extracted": "5 Years Experience", "page": 1, "doc": "TechNova_Profile.pdf", "reason": "Satisfies 3-year experience."},
                "Government supply experience": {"status": "PASS", "confidence": 85, "extracted": "Institutional Supply Contracts", "page": 1, "doc": "TechNova_Orders.pdf", "reason": "Government supply documented."},
                "OEM authorization required": {"status": "PASS", "confidence": 92, "extracted": "Tier-1 OEM MAF", "page": 1, "doc": "TechNova_MAF.pdf", "reason": "OEM MAF attached."},
            }
        },
        {
            "bidder": b4,
            "ref": "CG-B9082341-DS04",
            "score": 88,
            "status": BidStatus.UNDER_REVIEW,
            "risk": RiskLevel.HIGH,
            "results": {
                "CPU >= Intel Core i5 or equivalent": {"status": "PASS", "confidence": 96, "extracted": "Intel Core i5-1135G7", "page": 2, "doc": "Digital_Tech_Specs.pdf", "reason": "CPU satisfies requirement."},
                "RAM >= 16 GB DDR4": {"status": "PASS", "confidence": 97, "extracted": "16 GB DDR4", "page": 2, "doc": "Digital_Tech_Specs.pdf", "reason": "RAM meets 16 GB requirement."},
                "Storage >= 512 GB NVMe SSD": {"status": "PASS", "confidence": 95, "extracted": "512 GB NVMe SSD", "page": 2, "doc": "Digital_Tech_Specs.pdf", "reason": "Storage satisfies requirement."},
                "Display >= 15.6 inch FHD": {"status": "PASS", "confidence": 97, "extracted": "15.6 inch FHD", "page": 2, "doc": "Digital_Tech_Specs.pdf", "reason": "Display panel meets specification."},
                "Warranty >= 3 years": {"status": "PASS", "confidence": 92, "extracted": "3 Years Comprehensive On-site", "page": 1, "doc": "Digital_Warranty.pdf", "reason": "Warranty duration satisfied."},
                "Valid GST registration": {"status": "PASS", "confidence": 100, "extracted": "07AABCD3456N1Z2", "page": 1, "doc": "Digital_GST.pdf", "reason": "GST valid and active."},
                "Valid PAN": {"status": "PASS", "confidence": 100, "extracted": "AABCD3456N", "page": 1, "doc": "Digital_PAN.pdf", "reason": "PAN valid."},
                "Turnover >= ₹50 Crore": {"status": "PASS", "confidence": 93, "extracted": "₹58.70 Crore", "page": 1, "doc": "Digital_Turnover.pdf", "reason": "Turnover satisfies ₹50 Cr requirement."},
                "Financial statements for required years": {"status": "PASS", "confidence": 91, "extracted": "3 Years Audited Balance Sheets", "page": 1, "doc": "Digital_Financials.pdf", "reason": "Financial reports attached."},
                "Experience >= 3 years": {"status": "PASS", "confidence": 94, "extracted": "5 Years", "page": 1, "doc": "Digital_Profile.pdf", "reason": "Meets 3-year experience."},
                "Government supply experience": {"status": "PASS", "confidence": 88, "extracted": "NIC and State IT contracts", "page": 1, "doc": "Digital_Past_Orders.pdf", "reason": "Past supply records attached."},
                "OEM authorization required": {"status": "PASS", "confidence": 95, "extracted": "OEM Authorization Letter", "page": 1, "doc": "Digital_MAF.pdf", "reason": "OEM MAF attached."},
            }
        },
    ]

    bids_map = {}

    for bdata in bidders_data:
        bidder = bdata["bidder"]
        ref = bdata["ref"]

        bid = db.scalar(select(BidApplication).where(BidApplication.reference_code == ref))
        if not bid:
            bid = BidApplication(
                tender_id=tender.id,
                bidder_id=bidder.id,
                reference_code=ref,
                status=bdata["status"],
                verification_status=VerificationStatus.VERIFIED,
                created_at=datetime.utcnow() - timedelta(days=5),
                updated_at=datetime.utcnow(),
            )
            db.add(bid)
            db.flush()
        else:
            bid.status = bdata["status"]
            bid.verification_status = VerificationStatus.VERIFIED

        bids_map[bidder.trade_name] = bid

        # Create/Update Compliance Check
        cc = db.scalar(select(ComplianceCheck).where(ComplianceCheck.bid_id == bid.id))
        results_list = []
        for req in demo_reqs:
            rdata = bdata["results"].get(req.requirement, {"status": "PASS", "confidence": 90, "extracted": req.required_value, "page": 1, "doc": "Document.pdf", "reason": "Requirement met."})
            results_list.append({
                "requirement_id": req.id,
                "requirement": req.requirement,
                "title": req.title,
                "description": req.description,
                "category": req.category,
                "mandatory": req.mandatory,
                "comparison_operator": req.comparison_operator,
                "required_value": req.required_value,
                "expected_value_display": req.required_value,
                "extracted_value_display": rdata["extracted"],
                "comparison_result": rdata["status"],
                "status": rdata["status"],
                "confidence": rdata["confidence"],
                "risk": bdata["risk"].value.upper(),
                "explanation": rdata["reason"],
                "reason": rdata["reason"],
                "source_document": rdata["doc"],
                "source_page": rdata["page"],
                "source_section": f"Section {req.category.capitalize()}",
                "extracted_text_snippet": rdata["extracted"],
            })

        rec = Recommendation.APPROVE if bdata["score"] >= 85 and bdata["risk"] == RiskLevel.LOW else (Recommendation.REJECT if bdata["score"] < 60 else Recommendation.REQUEST_CLARIFICATION)
        if not cc:
            cc = ComplianceCheck(
                bidder_id=bidder.id,
                tender_id=tender.id,
                bid_id=bid.id,
                overall_score=bdata["score"],
                confidence=92.0,
                risk_level=bdata["risk"],
                recommendation=rec,
                summary=f"Automated evaluation for {bidder.legal_name} on {tender.title}. Score: {bdata['score']}/100.",
                score_breakdown={
                    "weights": {"identity": 20, "tax": 15, "msme": 15, "financial": 15, "consistency": 5, "integrity": 15, "requirements": 15},
                    "earned": {"identity": 20 if bdata["score"] > 60 else 10, "tax": 15 if bdata["score"] > 60 else 5, "msme": 15, "financial": 15 if bdata["score"] > 70 else 5, "consistency": 5, "integrity": 15, "requirements": 15},
                    "lines": ["Automated evaluation completed"],
                    "officer_actions": ["Review flagged discrepancies"] if bdata["score"] < 80 else [],
                },
                requirement_results=results_list,
                contradictions=[],
                risk_factors=[],
                related_bidders=[],
                findings=[],
            )
            db.add(cc)
            db.flush()
        else:
            cc.overall_score = bdata["score"]
            cc.risk_level = bdata["risk"]
            cc.recommendation = rec
            cc.requirement_results = results_list

    # -------------------------------------------------------------
    # 4. Delivery Batch & Assets for Awarded Bidder (ABC Technologies)
    # -------------------------------------------------------------
    batch = db.scalar(select(DeliveryBatch).where(DeliveryBatch.batch_number == "BAT-2026-001"))
    if not batch:
        batch = DeliveryBatch(
            tender_id=tender.id,
            awarded_bidder_id=b1.id,
            batch_number="BAT-2026-001",
            po_number="PO-2026-EDU-8891",
            total_units=2500,
            verified_units=2,
            failed_units=1,
            delivery_date=datetime.utcnow() - timedelta(days=2),
            delivery_location="Central IT Warehouse, Directorate of Education, Delhi",
            status="FLAGGED_MISMATCH",
            notes="Consignment of first 2,500 units for batch testing and verification.",
        )
        db.add(batch)
        db.flush()

    # Seed 3 Demo Assets using ProductAsset
    assets_data = [
        {
            "asset_id": "ASSET-2026-001",
            "qr": "GEM-LAP-001-SN8821",
            "serial": "SN-DELL-882191",
            "actual_spec": {"cpu": "Intel Core i5-1135G7", "ram_gb": 16, "ssd_gb": 512, "display": "15.6 FHD"},
            "status": "PASS",
            "mismatch": False,
        },
        {
            "asset_id": "ASSET-2026-002",
            "qr": "GEM-LAP-002-SN8822",
            "serial": "SN-DELL-882292",
            "actual_spec": {"cpu": "Intel Core i5-1135G7", "ram_gb": 16, "ssd_gb": 512, "display": "15.6 FHD"},
            "status": "PASS",
            "mismatch": False,
        },
        {
            "asset_id": "ASSET-2026-003",
            "qr": "GEM-LAP-003-SN8823",
            "serial": "SN-DELL-882393",
            "actual_spec": {"cpu": "Intel Core i5-1135G7", "ram_gb": 16, "ssd_gb": 256, "display": "15.6 FHD"},  # 256GB MISMATCH!
            "status": "MISMATCH",
            "mismatch": True,
        },
    ]

    expected_spec = {
        "cpu": "Intel Core i5 or equivalent",
        "ram_gb": 16,
        "ssd_gb": 512,
        "display": "15.6 FHD",
        "os": "Windows 11 Pro",
        "warranty": "3 Years On-site",
    }

    for adata in assets_data:
        asset = db.scalar(select(ProductAsset).where(ProductAsset.asset_id == adata["asset_id"]))
        if not asset:
            asset = ProductAsset(
                batch_id=batch.id,
                tender_id=tender.id,
                asset_id=adata["asset_id"],
                serial_number=adata["serial"],
                qr_code_data=adata["qr"],
                model_number="Latitude 3520 Gov Ed",
                oem="Dell Technologies",
                warranty="3 Years On-site",
                expected_spec=expected_spec,
                actual_spec=adata["actual_spec"],
                inspection_status=adata["status"],
                mismatch_details={"component": "Storage", "expected": "512 GB", "actual": "256 GB"} if adata["mismatch"] else None,
                inspection_notes="Hardware scan: detected SSD capacity differs from tender commitment." if adata["mismatch"] else "All components conform to technical specifications.",
                verified_at=datetime.utcnow() - timedelta(hours=4),
            )
            db.add(asset)
            db.flush()

    # -------------------------------------------------------------
    # 5. Human Inspection Case on the Mismatched Asset (#ASSET-2026-003)
    # -------------------------------------------------------------
    mismatched_asset = db.scalar(select(ProductAsset).where(ProductAsset.asset_id == "ASSET-2026-003"))
    if mismatched_asset:
        case = db.scalar(select(InspectionCase).where(InspectionCase.case_id == "INSP-CASE-001"))
        if not case:
            checklist_items = [
                {"name": "CPU", "status": "PASS", "notes": "Intel Core i5-1135G7 confirmed via BIOS and OS hardware monitor."},
                {"name": "RAM", "status": "PASS", "notes": "16 GB DDR4 3200MHz module verified in slot 1."},
                {"name": "SSD Storage", "status": "FAIL", "notes": "Observed Kioxia 256 GB NVMe SSD. Tender contract explicitly requires 512 GB."},
                {"name": "Display Panel", "status": "PASS", "notes": "15.6 inch FHD (1920x1080) panel confirmed."},
                {"name": "Battery", "status": "PASS", "notes": "54 Whr battery health 100%."},
                {"name": "Keyboard & Trackpad", "status": "PASS", "notes": "All keys functioning, bilingual Hindi/English legend present."},
                {"name": "Ports (USB, HDMI, LAN)", "status": "PASS", "notes": "All I/O ports tested and functioning."},
                {"name": "Wi-Fi & Bluetooth", "status": "PASS", "notes": "Wi-Fi 6 AX201 and BT 5.1 connected."},
                {"name": "Webcam & Mic", "status": "PASS", "notes": "720p HD webcam with physical privacy shutter."},
                {"name": "Charger / Adapter", "status": "PASS", "notes": "65W Type-C adapter with BIS registration mark."},
                {"name": "Physical Condition", "status": "PASS", "notes": "Brand new factory sealed chassis, no scratches."},
                {"name": "Serial Number Verification", "status": "PASS", "notes": "Chassis laser etched serial matches BIOS and carton barcode."},
                {"name": "Warranty Document", "status": "PASS", "notes": "Dell OEM 3-year ProSupport certificate attached."},
            ]

            case = InspectionCase(
                case_id="INSP-CASE-001",
                tender_id=tender.id,
                tender_title=tender.title,
                supplier_id=b1.id,
                supplier_name=b1.legal_name,
                batch_id=batch.id,
                batch_number=batch.batch_number,
                asset_id=mismatched_asset.asset_id,
                serial_number=mismatched_asset.serial_number,
                model_number=mismatched_asset.model_number,
                oem=mismatched_asset.oem,
                detected_issue="Hardware Specification Mismatch: Installed SSD is 256 GB NVMe instead of tender required 512 GB NVMe.",
                expected_spec=expected_spec,
                observed_spec=mismatched_asset.actual_spec,
                inspector_name="Er. Sanjeev Verma (Senior Technical Officer)",
                inspection_date=datetime.utcnow() - timedelta(hours=2),
                checklist=checklist_items,
                evidence_photos=[
                    {"url": "/demo/photos/ssd_disassembly_256gb.jpg", "caption": "Disassembly photo showing 256GB M.2 drive"},
                    {"url": "/demo/photos/bios_storage_report.jpg", "caption": "BIOS screen reporting 256GB NVMe"},
                ],
                officer_remarks="Technical inspection confirms 256GB installed drive. Requesting supplier clarification and replacement of SSD batch before acceptance.",
                final_decision="HOLD",
                decision_justification="Held pending replacement of non-compliant 256GB drives with 512GB modules as per ATC Clause 3.",
                decided_at=datetime.utcnow() - timedelta(hours=1),
                decided_by_name="Officer Rajesh Kumar",
            )
            db.add(case)
            db.flush()
        else:
            case.final_decision = "HOLD"
            case.decision_justification = "Held pending replacement of non-compliant 256GB drives with 512GB modules as per ATC Clause 3."
            mismatched_asset.inspection_status = "MISMATCH"
            db.flush()

    # -------------------------------------------------------------
    # 6. Audit Trail: Ensure Complete Cryptographic Chain
    # -------------------------------------------------------------
    record(
        db,
        action="demo.environment_seeded",
        entity_type="Tender",
        entity_id=tender.id,
        actor_user_id=1,
        actor_role="SYSTEM",
        detail="SIH 2026 Demonstration environment seeded with 4 fictional bidders for Government Laptop Procurement.",
        previous_value={"status": "INITIALIZING"},
        new_value={"status": "DEMO_ACTIVE", "bidders_count": 4, "tender_id": tender.id},
        reason="Demonstration mode initialization for SIH jury evaluation",
    )
    db.commit()

    # Seal and backfill the entire cryptographic chain
    backfill_event_chain(db)

    return {
        "status": "ready",
        "tender_id": tender.id,
        "tender_bid_number": DEMO_TENDER_BID_NUM,
        "bidders": {
            "abc_tech": b1.id,
            "xyz_computers": b2.id,
            "technova": b3.id,
            "digital_systems": b4.id,
        },
        "bids": {
            "abc_tech": bids_map["ABC Tech"].id,
            "xyz_computers": bids_map["XYZ Computers"].id,
            "technova": bids_map["TechNova"].id,
            "digital_systems": bids_map["Digital Systems"].id,
        },
        "batch_id": batch.id if batch else None,
        "mismatched_asset_id": mismatched_asset.id if mismatched_asset else None,
    }
