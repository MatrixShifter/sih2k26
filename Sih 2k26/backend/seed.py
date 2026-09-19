"""Load realistic GeM procurement sample data for local development."""

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
from app.services.tender_parser import DEFAULT_MEDICAL_SOURCE, extract_requirements  # noqa: E402
from app.services.verification_service import run_verification  # noqa: E402
from app.utils.ids import bid_reference  # noqa: E402

from app.core.config import get_settings

UPLOADS = Path(get_settings().upload_dir)
DEMO_PASSWORD = "Gem@2026!"


def _pdf(rel: str, label: str) -> str:
    try:
        path = UPLOADS / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_bytes(
                b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%% ComplyGeM AI sample artefact: " + label.encode() + b"\n"
            )
        return str(path)
    except Exception:
        return f"/tmp/uploads/{rel}"


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(User).limit(1)):
            print("Database already has users; skip seed (drop volumes / delete complygem.db to re-seed).")
            return

        hashed = hash_password(DEMO_PASSWORD)

        officer = User(
            email="officer@complygem.demo",
            hashed_password=hashed,
            full_name="Priya Nair",
            role=UserRole.OFFICER,
        )
        officer2 = User(
            email="priya.nair@gem.gov.in",
            hashed_password=hashed,
            full_name="Priya Nair (GeM inbox)",
            role=UserRole.OFFICER,
        )
        db.add_all([officer, officer2])
        db.flush()

        bidders_spec = [
            {
                "scenario": "high",
                "legal_name": "Bharat Precision Diagnostics Pvt. Ltd.",
                "trade_name": "Bharat Precision",
                "registered_address": "Plot 14, Bhosari MIDC, Pune, Maharashtra 411026",
                "state": "Maharashtra",
                "pincode": "411026",
                "contact_email": "tenders@bharatprecision.in",
                "contact_phone": "020-27451210",
                "director_name": "Ravi Shinde",
                "annual_turnover_inr": Decimal("186000000"),
                "years_experience": 11,
                "udyam_number": "UDYAM-MH-26-0123456",
                "gstin": "27AABCB1234C1Z5",
                "pan": "AABCB1234C",
                "cin": "U33100MH2014PTC251234",
                "nsic_registration": "NSIC/GP/MH/2022/88421",
                "dpiit_startup_number": None,
                "epfo_code": "PUPUN0123456000",
                "esic_code": "31001234560000999",
                "user_email": "ravi.shinde@bharatprecision.in",
                "user_name": "Ravi Shinde",
                "docs": [
                    DocumentType.PAN,
                    DocumentType.GST,
                    DocumentType.UDYAM,
                    DocumentType.MCA21,
                    DocumentType.EPFO,
                    DocumentType.ESIC,
                    DocumentType.NSIC,
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
                "legal_name": "Kaveri MedTech Solutions LLP",
                "trade_name": "Kaveri MedTech",
                "registered_address": "3rd Floor, Manyata Tech Park, Bengaluru, Karnataka 560045",
                "state": "Karnataka",
                "pincode": "560045",
                "contact_email": "compliance@kaverimedtech.in",
                "contact_phone": "080-41124580",
                "director_name": "Ananya Rao",
                "annual_turnover_inr": Decimal("11200000"),
                "years_experience": 4,
                "udyam_number": "UDYAM-KA-03-0078912",
                "gstin": "29AADCK7788P1Z2",
                "pan": "AADCK7788P",
                "cin": None,
                "nsic_registration": "NSIC/GP/KA/2023/11902",
                "dpiit_startup_number": "DIPP123456",
                "epfo_code": "BGBNG1987600000",
                "esic_code": "53001987600000111",
                "user_email": "ananya.rao@kaverimedtech.in",
                "user_name": "Ananya Rao",
                "docs": [
                    DocumentType.PAN,
                    DocumentType.GST,
                    DocumentType.UDYAM,
                    DocumentType.FINANCIAL,
                    DocumentType.EXPERIENCE,
                    DocumentType.TECHNICAL,
                    DocumentType.STARTUP_INDIA,
                    DocumentType.NSIC,
                ],
                "extra_fields": {},
            },
            {
                "scenario": "missing",
                "legal_name": "Ganga Hospital Supplies",
                "trade_name": "Ganga Mart",
                "registered_address": "12, Nai Sarak, Chandni Chowk, Delhi 110006",
                "state": "Delhi",
                "pincode": "110006",
                "contact_email": "orders@gangamart.in",
                "contact_phone": "011-23281245",
                "director_name": "Suresh Gupta",
                "annual_turnover_inr": Decimal("4200000"),
                "years_experience": 2,
                "udyam_number": "UDYAM-DL-01-0044321",
                "gstin": "07AAGPG5566Q1Z8",
                "pan": "AAGPG5566Q",
                "cin": None,
                "nsic_registration": None,
                "dpiit_startup_number": None,
                "epfo_code": None,
                "esic_code": None,
                "user_email": "suresh.gupta@gangamart.in",
                "user_name": "Suresh Gupta",
                "docs": [DocumentType.PAN, DocumentType.GST],
                "extra_fields": {},
            },
            {
                "scenario": "contradiction",
                "legal_name": "ABC Technologies Private Limited",
                "trade_name": "ABC Tech",
                "registered_address": "Hinjewadi Phase 2, Pune, Maharashtra 411057",
                "state": "Maharashtra",
                "pincode": "411057",
                "contact_email": "gem@abctechlabs.in",
                "contact_phone": "020-66778890",
                "director_name": "Meera Joshi",
                "annual_turnover_inr": Decimal("24500000"),
                "years_experience": 6,
                "udyam_number": "UDYAM-MH-26-0099001",
                "gstin": "27AAMCS3344R1Z1",
                "pan": "AAMCS3344R",
                "cin": "U72900MH2019PTC331109",
                "nsic_registration": "NSIC/GP/MH/2024/22011",
                "dpiit_startup_number": "DIPP778821",
                "epfo_code": "PUPUN2211000000",
                "esic_code": "31002211000000222",
                "user_email": "meera.joshi@abctechlabs.in",
                "user_name": "Meera Joshi",
                "docs": [
                    DocumentType.PAN,
                    DocumentType.GST,
                    DocumentType.UDYAM,
                    DocumentType.MCA21,
                    DocumentType.FINANCIAL,
                    DocumentType.EXPERIENCE,
                    DocumentType.OEM,
                    DocumentType.TECHNICAL,
                ],
                "extra_fields": {
                    DocumentType.GST: {
                        "company_name": "ABC Technologies Private Limited",
                        "address": "Hinjewadi Phase 2, Pune, Maharashtra 411057",
                        "gstin": "27AAMCS3344R1Z1",
                        "certificate_number": "27AAMCS3344R1Z1",
                        "expiry_date": (date.today() + timedelta(days=18)).isoformat(),
                    },
                    DocumentType.UDYAM: {
                        "company_name": "ABC Technology Pvt Ltd",
                        "address": "Salt Lake Sector V, Kolkata, West Bengal 700091",
                        "udyam_number": "UDYAM-MH-26-0099001",
                        "certificate_number": "UDYAM-MH-26-0099001",
                    },
                },
            },
            {
                "scenario": "high_risk",
                "legal_name": "Eastern Electricals Works",
                "trade_name": "Eastern Electricals",
                "registered_address": "Plot 14, Bhosari MIDC, Pune, Maharashtra 411026",
                "state": "West Bengal",
                "pincode": "700091",
                "contact_email": "tender@easternelectricals.in",
                "contact_phone": "020-27451210",
                "director_name": "Ravi Shinde",
                "annual_turnover_inr": Decimal("1800000"),
                "years_experience": 1,
                "udyam_number": "UDYAM-WB-10-INVALID",
                "gstin": "19AABCE0000X1Z3",
                "pan": "AABCE0000X",
                "cin": None,
                "nsic_registration": None,
                "dpiit_startup_number": None,
                "epfo_code": None,
                "esic_code": None,
                "user_email": "amit.banerjee@easternelectricals.in",
                "user_name": "Amit Banerjee",
                "docs": [DocumentType.PAN, DocumentType.GST, DocumentType.UDYAM, DocumentType.FINANCIAL],
                "extra_fields": {
                    DocumentType.GST: {
                        "company_name": "Eastern Electricals Works",
                        "gstin": "19AABCE0000X1Z3",
                        "certificate_number": "19AABCE0000X1Z3",
                        "expiry_date": (date.today() - timedelta(days=40)).isoformat(),
                        "force_suspicious": True,
                        "integrity_note": "Certificate number does not match the GeM seller profile (simulated).",
                    },
                    DocumentType.UDYAM: {
                        "company_name": "Eastern Electricals Works",
                        "udyam_number": "UDYAM-WB-10-INVALID",
                    },
                    DocumentType.FINANCIAL: {"turnover": 1800000},
                },
            },
        ]

        bidders: list[tuple[Bidder, User, dict]] = []
        for spec in bidders_spec:
            bidder = Bidder(
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
            db.add(bidder)
            db.flush()
            user = User(
                email=spec["user_email"],
                hashed_password=hashed,
                full_name=spec["user_name"],
                role=UserRole.BIDDER,
                bidder_id=bidder.id,
            )
            db.add(user)
            db.flush()
            bidders.append((bidder, user, spec))

        demo_bidder_user = User(
            email="bidder@complygem.demo",
            hashed_password=hashed,
            full_name="Ravi Shinde (demo)",
            role=UserRole.BIDDER,
            bidder_id=bidders[0][0].id,
        )
        db.add(demo_bidder_user)
        db.flush()

        medical = Tender(
            gem_bid_number="GEM/2026/B/4589217",
            title="Supply of Medical Diagnostic Equipment",
            department="Government Health Services",
            category="Medical devices",
            estimated_value_inr=Decimal("4850000"),
            closing_date=date(2026, 10, 30),
            description=(
                "Rate contract for supply, installation and commissioning of diagnostic analysers "
                "and associated reagents to district hospitals under Government Health Services."
            ),
            source_text=DEFAULT_MEDICAL_SOURCE,
        )
        stationery = Tender(
            gem_bid_number="GEM/2026/B/4012278",
            title="Supply of Office Stationery for Regional Training Centres",
            department="Department of Personnel and Training",
            category="Office supplies",
            estimated_value_inr=Decimal("1850000"),
            closing_date=date(2026, 9, 18),
            description="Annual stationery kit for 14 regional training centres.",
            source_text="Minimum turnover INR 25 lakh. GST and PAN mandatory. Udyam preferred.",
        )
        db.add_all([medical, stationery])
        db.flush()
        for row in extract_requirements(medical):
            db.add(TenderRequirement(tender_id=medical.id, **row))
        for row in extract_requirements(stationery):
            db.add(TenderRequirement(tender_id=stationery.id, **row))
        db.flush()

        applications: list[tuple[BidApplication, User, dict]] = []
        for bidder, user, spec in bidders:
            bid = BidApplication(
                reference_code=bid_reference(medical.gem_bid_number, bidder.id),
                tender_id=medical.id,
                bidder_id=bidder.id,
                status=BidStatus.SUBMITTED,
            )
            db.add(bid)
            db.flush()
            for dtype in spec["docs"]:
                fname = f"{dtype.value}.pdf"
                if spec["scenario"] == "high_risk" and dtype == DocumentType.GST:
                    fname = "whatsapp_gst_scan_copy.pdf"
                rel = f"{bidder.id}/{bid.id}/seed/{fname}"
                extra = spec["extra_fields"].get(dtype, {})
                doc = Document(
                    bidder_id=bidder.id,
                    bid_id=bid.id,
                    document_type=dtype,
                    original_filename=fname,
                    stored_path=_pdf(rel, f"{bidder.legal_name}-{dtype.value}"),
                    content_type="application/pdf",
                    file_size_bytes=2400,
                    status=DocumentStatus.UPLOADED,
                    extracted_fields=extra or None,
                    uploaded_by_user_id=user.id,
                )
                db.add(doc)
            applications.append((bid, user, spec))

        # Stationery packet for the demo bidder only
        extra_bid = BidApplication(
            reference_code=bid_reference(stationery.gem_bid_number, bidders[0][0].id),
            tender_id=stationery.id,
            bidder_id=bidders[0][0].id,
            status=BidStatus.SUBMITTED,
        )
        db.add(extra_bid)
        db.flush()
        for dtype in (DocumentType.PAN, DocumentType.GST, DocumentType.UDYAM, DocumentType.FINANCIAL):
            db.add(
                Document(
                    bidder_id=bidders[0][0].id,
                    bid_id=extra_bid.id,
                    document_type=dtype,
                    original_filename=f"{dtype.value}.pdf",
                    stored_path=_pdf(f"{bidders[0][0].id}/{extra_bid.id}/seed/{dtype.value}.pdf", dtype.value),
                    content_type="application/pdf",
                    file_size_bytes=1800,
                    status=DocumentStatus.UPLOADED,
                    uploaded_by_user_id=bidders[0][1].id,
                )
            )

        db.flush()
        for bid, user, _spec in applications:
            run_verification(db, bid, officer)
        run_verification(db, extra_bid, officer)
        db.commit()
        print("Seed complete. Demo password: Gem@2026!")
        print("Officer: officer@complygem.demo")
        print("Bidder:  bidder@complygem.demo")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
