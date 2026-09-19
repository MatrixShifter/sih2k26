"""Add rich realistic procurement sample data to ComplyGeM AI.

Adds 3 new tenders across IT/Cloud, Solar Energy, and Emergency Vehicles.
Adds 4 new bidders (IT Enterprise, MSE Solar Startup, Ambulance Fabricator, High-Risk shell company).
Generates 9 bids across various risk and compliance scenarios.
Runs verification engine to create ComplianceCheck and VerificationResult records.
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.bid_application import BidApplication, BidStatus  # noqa: E402
from app.models.bidder import Bidder  # noqa: E402
from app.models.document import Document, DocumentStatus, DocumentType  # noqa: E402
from app.models.tender import Tender  # noqa: E402
from app.models.tender_requirement import TenderRequirement  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.services.tender_parser import extract_requirements  # noqa: E402
from app.services.verification_service import run_verification  # noqa: E402
from app.utils.ids import bid_reference  # noqa: E402

UPLOADS = Path("./uploads")
DEMO_PASSWORD = "Gem@2026!"


def _pdf(rel: str, label: str) -> str:
    path = UPLOADS / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_bytes(
            b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%% ComplyGeM AI sample artefact: " + label.encode() + b"\n"
        )
    return str(path)


def add_more_data() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        officer = db.scalar(select(User).where(User.role == UserRole.OFFICER).limit(1))
        if not officer:
            print("No officer user found. Please run base seed first.")
            return

        hashed = hash_password(DEMO_PASSWORD)

        # -------------------------------------------------------------
        # 1. ADD NEW TENDERS
        # -------------------------------------------------------------
        tenders_to_add = [
            {
                "gem_bid_number": "GEM/2026/B/5182940",
                "title": "Procurement of High-Capacity Server Racks & Cloud Infrastructure",
                "department": "Ministry of Electronics and Information Technology (MeitY)",
                "category": "IT & Datacenter Equipment",
                "estimated_value_inr": Decimal("85000000"),
                "closing_date": date(2026, 11, 15),
                "description": (
                    "Rate contract for turnkey supply, deployment, commissioning, and 5-year AMC "
                    "of Tier-III datacenter blade servers, network switches, and hyperconverged infrastructure "
                    "for National Informatics Centre (NIC) data hubs."
                ),
                "source_text": (
                    "Minimum average annual turnover of INR 15,00,00,000 in the last three financial years. "
                    "Valid GST and PAN mandatory. OEM authorization certificate required. "
                    "Minimum 5 years of relevant experience in enterprise datacenter deployments. "
                    "BIS and ISO 27001 technical certifications mandatory."
                ),
            },
            {
                "gem_bid_number": "GEM/2026/B/6290134",
                "title": "Solar PV Rooftop Systems & Battery Energy Storage (BESS) for Rural PHCs",
                "department": "Ministry of New and Renewable Energy (MNRE)",
                "category": "Renewable Energy Systems",
                "estimated_value_inr": Decimal("32000000"),
                "closing_date": date(2026, 12, 5),
                "description": (
                    "Supply, installation, and 5-year comprehensive maintenance of hybrid rooftop Solar PV "
                    "systems with Lithium Ferro-Phosphate (LFP) storage across 40 remote Primary Health Centres."
                ),
                "source_text": (
                    "Minimum average annual turnover INR 3,00,00,000. Valid GST and PAN mandatory. "
                    "Active Udyam MSME preferred. MSE purchase preference applies. "
                    "Minimum 3 years of experience in solar renewable installations. "
                    "ALMM certified solar PV modules and BIS standard battery storage."
                ),
            },
            {
                "gem_bid_number": "GEM/2026/B/7304192",
                "title": "Supply of Advanced Life Support (ALS) Ambulances with Telemedicine Kit",
                "department": "National Health Mission (NHM)",
                "category": "Emergency Medical Vehicles",
                "estimated_value_inr": Decimal("67500000"),
                "closing_date": date(2026, 10, 25),
                "description": (
                    "Fabrication and supply of 15 fully equipped AIS-125 Type-D Advanced Life Support "
                    "ambulances equipped with transport ventilators, biphasic defibrillators, 4G telemedicine link, "
                    "and GPS fleet telemetry."
                ),
                "source_text": (
                    "Minimum turnover INR 5,00,00,000 in last three financial years. Valid GST and PAN mandatory. "
                    "Vehicle OEM manufacturer or ARAI-accredited body fabricator. "
                    "AIS-125 Type D vehicle certification mandatory. "
                    "Minimum 3 years of emergency vehicle fabrication experience."
                ),
            },
        ]

        tender_map: dict[str, Tender] = {}
        for t_spec in tenders_to_add:
            existing = db.scalar(select(Tender).where(Tender.gem_bid_number == t_spec["gem_bid_number"]))
            if not existing:
                t = Tender(
                    gem_bid_number=t_spec["gem_bid_number"],
                    title=t_spec["title"],
                    department=t_spec["department"],
                    category=t_spec["category"],
                    estimated_value_inr=t_spec["estimated_value_inr"],
                    closing_date=t_spec["closing_date"],
                    description=t_spec["description"],
                    source_text=t_spec["source_text"],
                )
                db.add(t)
                db.flush()
                for req in extract_requirements(t):
                    db.add(TenderRequirement(tender_id=t.id, **req))
                db.flush()
                print(f"Added Tender: {t.gem_bid_number} - {t.title}")
                tender_map[t.gem_bid_number] = t
            else:
                tender_map[t_spec["gem_bid_number"]] = existing

        # Also get existing tenders
        for t in db.scalars(select(Tender)):
            tender_map[t.gem_bid_number] = t

        # -------------------------------------------------------------
        # 2. ADD NEW BIDDERS
        # -------------------------------------------------------------
        bidders_spec = [
            {
                "scenario": "high",
                "legal_name": "Vertex Cloud Computing Solutions Pvt. Ltd.",
                "trade_name": "Vertex Cloud",
                "registered_address": "Tower B, Cessna Business Park, Outer Ring Road, Bengaluru, Karnataka 560103",
                "state": "Karnataka",
                "pincode": "560103",
                "contact_email": "gem.tenders@vertexcloud.in",
                "contact_phone": "080-49203300",
                "director_name": "Vikram Malhotra",
                "annual_turnover_inr": Decimal("225000000"),
                "years_experience": 8,
                "udyam_number": "UDYAM-KA-03-0145892",
                "gstin": "29AAACV5512L1Z9",
                "pan": "AAACV5512L",
                "cin": "U72200KA2016PTC091234",
                "nsic_registration": "NSIC/GP/KA/2021/45012",
                "dpiit_startup_number": None,
                "epfo_code": "BGBNG0987654000",
                "esic_code": "53000987650000888",
                "user_email": "vikram.malhotra@vertexcloud.in",
                "user_name": "Vikram Malhotra",
                "docs": [
                    DocumentType.PAN,
                    DocumentType.GST,
                    DocumentType.UDYAM,
                    DocumentType.MCA21,
                    DocumentType.EPFO,
                    DocumentType.ESIC,
                    DocumentType.FINANCIAL,
                    DocumentType.EXPERIENCE,
                    DocumentType.WORK_ORDER,
                    DocumentType.OEM,
                    DocumentType.TECHNICAL,
                    DocumentType.DIGILOCKER,
                ],
                "extra_fields": {},
            },
            {
                "scenario": "medium",
                "legal_name": "Suryodaya Green Energy Technologies LLP",
                "trade_name": "Suryodaya Solar",
                "registered_address": "402, Pinnacle Business Park, Prahlad Nagar, Ahmedabad, Gujarat 380015",
                "state": "Gujarat",
                "pincode": "380015",
                "contact_email": "bids@suryodayasolar.com",
                "contact_phone": "079-29701122",
                "director_name": "Hardik Patel",
                "annual_turnover_inr": Decimal("48000000"),
                "years_experience": 4,
                "udyam_number": "UDYAM-GJ-01-0089123",
                "gstin": "24AABCS4455M1Z7",
                "pan": "AABCS4455M",
                "cin": None,
                "nsic_registration": "NSIC/GP/GJ/2023/98124",
                "dpiit_startup_number": "DIPP98231",
                "epfo_code": "GJAHM1234567000",
                "esic_code": "38001234560000777",
                "user_email": "hardik.patel@suryodayasolar.com",
                "user_name": "Hardik Patel",
                "docs": [
                    DocumentType.PAN,
                    DocumentType.GST,
                    DocumentType.UDYAM,
                    DocumentType.FINANCIAL,
                    DocumentType.EXPERIENCE,
                    DocumentType.WORK_ORDER,
                    DocumentType.OEM,
                    DocumentType.TECHNICAL,
                    DocumentType.STARTUP_INDIA,
                    DocumentType.NSIC,
                ],
                "extra_fields": {},
            },
            {
                "scenario": "high",
                "legal_name": "Dhanvantari Emergency Vehicles & Mobility Pvt. Ltd.",
                "trade_name": "Dhanvantari Mobility",
                "registered_address": "Plot 77, SIDCO Industrial Estate, Ambattur, Chennai, Tamil Nadu 600098",
                "state": "Tamil Nadu",
                "pincode": "600098",
                "contact_email": "institutional@dhanvantarimobility.in",
                "contact_phone": "044-26258900",
                "director_name": "Dr. K. Sundaram",
                "annual_turnover_inr": Decimal("82000000"),
                "years_experience": 6,
                "udyam_number": "UDYAM-TN-02-0034567",
                "gstin": "33AAACD9988K1ZP",
                "pan": "AAACD9988K",
                "cin": "U34100TN2018PTC120456",
                "nsic_registration": "NSIC/GP/TN/2022/67210",
                "dpiit_startup_number": None,
                "epfo_code": "TNCH0011223000",
                "esic_code": "51000112230000555",
                "user_email": "k.sundaram@dhanvantarimobility.in",
                "user_name": "Dr. K. Sundaram",
                "docs": [
                    DocumentType.PAN,
                    DocumentType.GST,
                    DocumentType.UDYAM,
                    DocumentType.MCA21,
                    DocumentType.EPFO,
                    DocumentType.ESIC,
                    DocumentType.FINANCIAL,
                    DocumentType.EXPERIENCE,
                    DocumentType.WORK_ORDER,
                    DocumentType.OEM,
                    DocumentType.TECHNICAL,
                ],
                "extra_fields": {},
            },
            {
                "scenario": "high_risk",
                "legal_name": "Apex Infra-Logistics Enterprises",
                "trade_name": "Apex Logistics",
                "registered_address": "Shop 21, Ground Floor, Old Railway Road, Gurugram, Haryana 122001",
                "state": "Haryana",
                "pincode": "122001",
                "contact_email": "info@apexinfra-logistics.biz",
                "contact_phone": "0124-4059911",
                "director_name": "Rajiv Aggarwal",
                "annual_turnover_inr": Decimal("7500000"),
                "years_experience": 1,
                "udyam_number": "UDYAM-HR-05-INVALID",
                "gstin": "06AAAPA9999L1Z2",
                "pan": "AAAPA9999L",
                "cin": None,
                "nsic_registration": None,
                "dpiit_startup_number": None,
                "epfo_code": None,
                "esic_code": None,
                "user_email": "rajiv.aggarwal@apexinfra-logistics.biz",
                "user_name": "Rajiv Aggarwal",
                "docs": [
                    DocumentType.PAN,
                    DocumentType.GST,
                    DocumentType.UDYAM,
                    DocumentType.FINANCIAL,
                ],
                "extra_fields": {
                    DocumentType.GST: {
                        "company_name": "Apex Infra-Logistics Enterprises",
                        "gstin": "06AAAPA9999L1Z2",
                        "certificate_number": "06AAAPA9999L1Z2",
                        "expiry_date": (date.today() - timedelta(days=25)).isoformat(),
                        "force_suspicious": True,
                        "integrity_note": "GST registration expired and currently suspended on GSTN portal (simulated).",
                    },
                    DocumentType.UDYAM: {
                        "company_name": "Apex Logistics Private Ltd",
                        "udyam_number": "UDYAM-HR-05-INVALID",
                    },
                    DocumentType.FINANCIAL: {"turnover": 7500000},
                },
            },
        ]

        bidder_map: dict[str, tuple[Bidder, User, dict]] = {}
        for spec in bidders_spec:
            existing_bidder = db.scalar(select(Bidder).where(Bidder.pan == spec["pan"]))
            if not existing_bidder:
                b = Bidder(
                    legal_name=spec["legal_name"],
                    trade_name=spec["trade_name"],
                    registered_address=spec["registered_address"],
                    state=spec["state"],
                    pincode=spec["pincode"],
                    contact_email=spec["contact_email"],
                    contact_phone=spec["contact_phone"],
                    director_name=spec["director_name"],
                    annual_turnover_inr=spec["annual_turnover_inr"],
                    years_experience=spec["years_experience"],
                    udyam_number=spec["udyam_number"],
                    gstin=spec["gstin"],
                    pan=spec["pan"],
                    cin=spec["cin"],
                    nsic_registration=spec["nsic_registration"],
                    dpiit_startup_number=spec["dpiit_startup_number"],
                    epfo_code=spec["epfo_code"],
                    esic_code=spec["esic_code"],
                )
                db.add(b)
                db.flush()
                u = User(
                    email=spec["user_email"],
                    hashed_password=hashed,
                    full_name=spec["user_name"],
                    role=UserRole.BIDDER,
                    bidder_id=b.id,
                )
                db.add(u)
                db.flush()
                print(f"Added Bidder: {b.legal_name} (User: {u.email})")
                bidder_map[spec["pan"]] = (b, u, spec)
            else:
                u = db.scalar(select(User).where(User.bidder_id == existing_bidder.id))
                bidder_map[spec["pan"]] = (existing_bidder, u, spec)

        # Also map existing bidders from db
        all_bidders = {b.pan: b for b in db.scalars(select(Bidder))}

        # -------------------------------------------------------------
        # 3. ADD REALISTIC BIDS ACROSS TENDERS
        # -------------------------------------------------------------
        bid_matrix = [
            ("GEM/2026/B/5182940", "AAACV5512L"),
            ("GEM/2026/B/5182940", "AAMCS3344R"),
            ("GEM/2026/B/5182940", "AAAPA9999L"),
            ("GEM/2026/B/6290134", "AABCS4455M"),
            ("GEM/2026/B/6290134", "AABCE0000X"),
            ("GEM/2026/B/6290134", "AABCB1234C"),
            ("GEM/2026/B/7304192", "AAACD9988K"),
            ("GEM/2026/B/7304192", "AADCK7788P"),
            ("GEM/2026/B/7304192", "AAGPG5566Q"),
        ]

        new_bids_to_verify: list[BidApplication] = []

        for tender_num, bidder_pan in bid_matrix:
            t = tender_map.get(tender_num)
            b = all_bidders.get(bidder_pan)
            if not t or not b:
                print(f"Skipping {tender_num} for {bidder_pan} - tender or bidder missing")
                continue

            # Check if bid already exists
            existing_bid = db.scalar(
                select(BidApplication).where(
                    BidApplication.tender_id == t.id,
                    BidApplication.bidder_id == b.id,
                )
            )
            if existing_bid:
                print(f"Bid already exists for {b.legal_name} on {t.gem_bid_number}")
                continue

            ref_code = bid_reference(t.gem_bid_number, b.id)
            bid_app = BidApplication(
                reference_code=ref_code,
                tender_id=t.id,
                bidder_id=b.id,
                status=BidStatus.SUBMITTED,
            )
            db.add(bid_app)
            db.flush()

            # Find user for bidder
            b_user = db.scalar(select(User).where(User.bidder_id == b.id))
            user_id = b_user.id if b_user else officer.id

            # Determine docs from bidder_map spec or default set
            docs_to_create = [DocumentType.PAN, DocumentType.GST, DocumentType.UDYAM, DocumentType.FINANCIAL]
            extra_f = {}
            is_high_risk = False
            if bidder_pan in bidder_map:
                docs_to_create = bidder_map[bidder_pan][2]["docs"]
                extra_f = bidder_map[bidder_pan][2].get("extra_fields", {})
                is_high_risk = bidder_map[bidder_pan][2]["scenario"] == "high_risk"

            for dtype in docs_to_create:
                fname = f"{dtype.value}.pdf"
                if is_high_risk and dtype == DocumentType.GST:
                    fname = "whatsapp_gst_scan_copy.pdf"
                rel = f"{b.id}/{bid_app.id}/seed/{fname}"
                extra = extra_f.get(dtype, {})
                doc = Document(
                    bidder_id=b.id,
                    bid_id=bid_app.id,
                    document_type=dtype,
                    original_filename=fname,
                    stored_path=_pdf(rel, f"{b.legal_name}-{dtype.value}"),
                    content_type="application/pdf",
                    file_size_bytes=2400,
                    status=DocumentStatus.UPLOADED,
                    extracted_fields=extra or None,
                    uploaded_by_user_id=user_id,
                )
                db.add(doc)

            db.flush()
            new_bids_to_verify.append(bid_app)
            print(f"Created Bid: {bid_app.reference_code} ({b.legal_name} -> {t.title[:30]}...)")

        # -------------------------------------------------------------
        # 4. RUN VERIFICATION ENGINE ON ALL NEW BIDS
        # -------------------------------------------------------------
        print(f"\nRunning AI verification on {len(new_bids_to_verify)} new bids...")
        for bid_app in new_bids_to_verify:
            check = run_verification(db, bid_app, officer)
            print(
                f"  - Verified {bid_app.reference_code}: Score={check.overall_score}, "
                f"Risk={check.risk_level.value}, Recommendation={check.recommendation.value}"
            )

        db.commit()
        print("\nAll new seed data successfully added and verified!")
    finally:
        db.close()


if __name__ == "__main__":
    add_more_data()
