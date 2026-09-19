"""Post-award delivery verification, batch management, and asset inspection API."""

from datetime import datetime
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.audit import AuditLog
from app.models.delivery import DeliveryBatch, InspectionCase, PhysicalInspectionRequest, ProductAsset
from app.models.user import User
from app.services.delivery_verifier import verify_device_specifications
from app.services.inspection_case_service import create_or_get_case, record_final_decision

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


# Schemas
class VerifyDevicePayload(BaseModel):
    asset_id_or_serial: str = Field(..., description="Asset ID or Serial Number to verify")
    actual_spec: Dict[str, Any] = Field(..., description="Captured hardware specifications")
    inspection_notes: Optional[str] = Field(None, description="Optional officer or technician notes")
    status_override: Optional[str] = Field(None, description="Optional officer override (PASS, MISMATCH, NEEDS_PHYSICAL_INSPECTION)")


class PhysicalInspectionPayload(BaseModel):
    asset_id: str = Field(..., description="Asset ID")
    target_components: List[str] = Field(..., description="List of components to inspect, e.g. ['SSD', 'RAM']")
    instructions: str = Field(..., description="Specific checklist instructions for field technician")


class BatchCreatePayload(BaseModel):
    tender_id: int
    awarded_bidder_id: int
    batch_number: str
    po_number: str
    total_units: int = 500
    delivery_location: str
    notes: Optional[str] = None


@router.get("/batches")
def list_batches(
    tender_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List delivery batches for awarded contracts."""
    stmt = select(DeliveryBatch).order_by(DeliveryBatch.id.desc())
    if tender_id:
        stmt = stmt.where(DeliveryBatch.tender_id == tender_id)
    batches = db.scalars(stmt).all()

    out = []
    for b in batches:
        # compute live counts
        assets = b.assets
        passed = sum(1 for a in assets if a.inspection_status == "PASS")
        mismatched = sum(1 for a in assets if a.inspection_status == "MISMATCH")
        needs_insp = sum(1 for a in assets if a.inspection_status == "NEEDS_PHYSICAL_INSPECTION")
        pending = sum(1 for a in assets if a.inspection_status == "PENDING")

        out.append({
            "id": b.id,
            "tender_id": b.tender_id,
            "tender_title": b.tender.title if b.tender else "Laptop Procurement",
            "awarded_bidder_id": b.awarded_bidder_id,
            "vendor_name": b.awarded_bidder.legal_name if b.awarded_bidder else "ABC Technologies",
            "batch_number": b.batch_number,
            "po_number": b.po_number,
            "total_units": b.total_units,
            "verified_units": passed,
            "failed_units": mismatched,
            "needs_inspection_units": needs_insp,
            "pending_units": pending,
            "delivery_date": b.delivery_date.isoformat() if b.delivery_date else None,
            "delivery_location": b.delivery_location,
            "status": b.status,
            "notes": b.notes,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })
    return out


@router.get("/batches/{batch_id}/assets")
def list_batch_assets(
    batch_id: int,
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List assets under a specific delivery batch."""
    stmt = select(ProductAsset).where(ProductAsset.batch_id == batch_id).order_by(ProductAsset.id.asc())
    if status_filter and status_filter != "all":
        stmt = stmt.where(ProductAsset.inspection_status == status_filter.upper())
    assets = db.scalars(stmt).all()

    return [
        {
            "id": a.id,
            "asset_id": a.asset_id,
            "serial_number": a.serial_number,
            "model_number": a.model_number,
            "oem": a.oem,
            "warranty": a.warranty,
            "expected_spec": a.expected_spec,
            "actual_spec": a.actual_spec,
            "inspection_status": a.inspection_status,
            "mismatch_details": a.mismatch_details,
            "inspection_notes": a.inspection_notes,
            "verified_at": a.verified_at.isoformat() if a.verified_at else None,
        }
        for a in assets
    ]


@router.get("/assets/lookup")
def lookup_asset(
    query: str = Query(..., description="Asset ID, Serial Number, or scanned QR content"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve asset and verification comparison by serial number, asset ID, or QR payload."""
    clean_q = query.strip()
    
    # Try parsing as QR JSON
    if clean_q.startswith("{") and "serial_number" in clean_q:
        try:
            parsed = json.loads(clean_q)
            clean_q = parsed.get("serial_number") or parsed.get("asset_id") or clean_q
        except Exception:
            pass

    stmt = select(ProductAsset).where(
        (ProductAsset.asset_id == clean_q)
        | (ProductAsset.serial_number == clean_q)
        | (ProductAsset.asset_id.ilike(f"%{clean_q}%"))
        | (ProductAsset.serial_number.ilike(f"%{clean_q}%"))
    )
    asset = db.scalar(stmt)

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with identifier or serial '{query}' not found in registry.",
        )

    # Compute specification comparison
    verification = None
    if asset.actual_spec:
        verification = verify_device_specifications(asset.expected_spec or {}, asset.actual_spec)

    return {
        "id": asset.id,
        "asset_id": asset.asset_id,
        "serial_number": asset.serial_number,
        "qr_code_data": asset.qr_code_data,
        "model_number": asset.model_number,
        "oem": asset.oem,
        "warranty": asset.warranty,
        "batch_number": asset.batch.batch_number if asset.batch else "BATCH-2026-DEL-01",
        "po_number": asset.batch.po_number if asset.batch else "PO-GEM-2026-8819",
        "expected_spec": asset.expected_spec,
        "actual_spec": asset.actual_spec,
        "inspection_status": asset.inspection_status,
        "mismatch_details": asset.mismatch_details,
        "inspection_notes": asset.inspection_notes,
        "verified_at": asset.verified_at.isoformat() if asset.verified_at else None,
        "verification": verification,
    }


@router.post("/assets/verify")
def verify_asset(
    payload: VerifyDevicePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Compare device hardware reading against contracted tender spec and record inspection result."""
    clean_id = payload.asset_id_or_serial.strip()
    stmt = select(ProductAsset).where(
        (ProductAsset.asset_id == clean_id) | (ProductAsset.serial_number == clean_id)
    )
    asset = db.scalar(stmt)

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{payload.asset_id_or_serial}' not found in delivery registry.",
        )

    # Run verification comparison
    verification = verify_device_specifications(asset.expected_spec or {}, payload.actual_spec)

    new_status = payload.status_override or verification["overall_result"]
    asset.actual_spec = payload.actual_spec
    asset.inspection_status = new_status
    asset.mismatch_details = verification["mismatches"]
    asset.inspection_notes = payload.inspection_notes or (
        "Specification match verified." if new_status == "PASS" else "; ".join(verification["inspection_recommendations"])
    )
    asset.verified_at = datetime.utcnow()
    asset.verified_by_user_id = current_user.id

    # Audit log
    audit_entry = AuditLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        action=f"DELIVERY_VERIFY_{new_status}",
        entity_type="product_asset",
        entity_id=asset.id,
        result=new_status,
        detail=(
            f"Officer {current_user.full_name} verified device {asset.asset_id} (SN: {asset.serial_number}). "
            f"Result: {new_status}. {len(verification['mismatches'])} mismatches detected."
        ),
        extra={
            "asset_id": asset.asset_id,
            "serial_number": asset.serial_number,
            "result": new_status,
            "mismatches": verification["mismatches"],
        },
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(asset)

    return {
        "status": "success",
        "asset_id": asset.asset_id,
        "serial_number": asset.serial_number,
        "inspection_status": asset.inspection_status,
        "verification": verification,
        "verified_at": asset.verified_at.isoformat() if asset.verified_at else None,
        "inspector": current_user.full_name,
    }


@router.post("/assets/{asset_id}/request-inspection")
def request_physical_inspection(
    asset_id: str,
    payload: PhysicalInspectionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Request physical inspection by field engineers without automatically rejecting the product."""
    stmt = select(ProductAsset).where(ProductAsset.asset_id == asset_id)
    asset = db.scalar(stmt)

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{asset_id}' not found.",
        )

    # Set asset status to NEEDS_PHYSICAL_INSPECTION
    asset.inspection_status = "NEEDS_PHYSICAL_INSPECTION"
    asset.inspection_notes = f"Physical inspection ordered: {payload.instructions}"

    req = PhysicalInspectionRequest(
        asset_id=asset.asset_id,
        serial_number=asset.serial_number,
        requested_by_user_id=current_user.id,
        requested_by_name=current_user.full_name or "Procurement Officer",
        target_components=payload.target_components,
        instructions=payload.instructions,
        status="OPEN",
    )
    db.add(req)

    # Audit log
    audit_entry = AuditLog(
        actor_user_id=current_user.id,
        actor_role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        action="REQUEST_PHYSICAL_INSPECTION",
        entity_type="product_asset",
        entity_id=asset.id,
        result="NEEDS_PHYSICAL_INSPECTION",
        detail=f"Officer {current_user.full_name} ordered physical lab inspection for asset {asset.asset_id}. Checklist: {payload.target_components}",
        extra={"asset_id": asset.asset_id, "checklist": payload.target_components, "instructions": payload.instructions},
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(req)

    return {
        "status": "success",
        "request_id": req.id,
        "asset_id": req.asset_id,
        "serial_number": req.serial_number,
        "instructions": req.instructions,
        "target_components": req.target_components,
        "status_code": req.status,
    }


@router.get("/inspections")
def list_physical_inspections(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List pending and completed physical inspection requests."""
    stmt = select(PhysicalInspectionRequest).order_by(PhysicalInspectionRequest.id.desc())
    if status_filter and status_filter != "all":
        stmt = stmt.where(PhysicalInspectionRequest.status == status_filter.upper())
    requests = db.scalars(stmt).all()

    return [
        {
            "id": r.id,
            "asset_id": r.asset_id,
            "serial_number": r.serial_number,
            "requested_by": r.requested_by_name,
            "target_components": r.target_components,
            "instructions": r.instructions,
            "status": r.status,
            "findings": r.findings,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in requests
    ]


@router.get("/test-devices")
def get_prototype_test_devices(
    _current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Controlled Prototype Hardware Diagnostics Adapter Library.
    
    Provides standardized hardware telemetry test cases for demonstration and unit testing
    where direct browser low-level hardware probing is not feasible.
    """
    return {
        "notice": "CONTROLLED PROTOTYPE HARDWARE ADAPTER: Test devices with standardized hardware telemetry for demonstration.",
        "devices": [
            {
                "id": "test_pass",
                "label": "Unit 1: Full Specification Pass (Standard Lot)",
                "asset_id": "GEM-ASSET-LTP-001",
                "serial_number": "SN-DELL-5530-PASS-01",
                "model": "Latitude 5530 FHD",
                "oem": "Dell Technologies",
                "spec": {
                    "cpu": "Intel Core i5-12400 (6 Cores, 12 Threads, 4.4 GHz Turbo)",
                    "ram_gb": 16,
                    "ram_display": "16 GB DDR4-3200",
                    "ssd_gb": 512,
                    "storage_display": "512 GB M.2 NVMe PCIe SSD",
                    "display_inch": 15.6,
                    "display_resolution": "1920x1080 FHD IPS Anti-Glare",
                    "os": "Windows 11 Pro 64-bit",
                    "warranty_years": 3,
                    "warranty": "3 Years Comprehensive On-Site Next Business Day",
                },
                "expected_result": "PASS",
                "badge": "Expected: PASS",
            },
            {
                "id": "test_ssd_mismatch",
                "label": "Unit 2: SSD Mismatch (256 GB instead of 512 GB)",
                "asset_id": "GEM-ASSET-LTP-002",
                "serial_number": "SN-DELL-5530-MIS-02",
                "model": "Latitude 5530 FHD",
                "oem": "Dell Technologies",
                "spec": {
                    "cpu": "Intel Core i5-12400 (6 Cores, 12 Threads)",
                    "ram_gb": 16,
                    "ram_display": "16 GB DDR4-3200",
                    "ssd_gb": 256,  # MISMATCH: 256 GB instead of 512 GB
                    "storage_display": "256 GB M.2 NVMe SSD",
                    "display_inch": 15.6,
                    "display_resolution": "1920x1080 FHD IPS",
                    "os": "Windows 11 Pro 64-bit",
                    "warranty_years": 3,
                    "warranty": "3 Years Comprehensive On-Site",
                },
                "expected_result": "MISMATCH",
                "badge": "Expected: MISMATCH (SSD 256GB)",
            },
            {
                "id": "test_ram_mismatch",
                "label": "Unit 3: RAM Mismatch (8 GB instead of 16 GB)",
                "asset_id": "GEM-ASSET-LTP-003",
                "serial_number": "SN-HP-840-MIS-03",
                "model": "EliteBook 840 G9",
                "oem": "HP Inc.",
                "spec": {
                    "cpu": "Intel Core i5-12400",
                    "ram_gb": 8,  # MISMATCH: 8 GB instead of 16 GB
                    "ram_display": "8 GB DDR4-3200",
                    "ssd_gb": 512,
                    "storage_display": "512 GB M.2 NVMe SSD",
                    "display_inch": 15.6,
                    "display_resolution": "1920x1080 FHD",
                    "os": "Windows 11 Pro 64-bit",
                    "warranty_years": 3,
                    "warranty": "3 Years Comprehensive On-Site",
                },
                "expected_result": "MISMATCH",
                "badge": "Expected: MISMATCH (RAM 8GB)",
            },
            {
                "id": "test_tampered",
                "label": "Unit 4: Tampered Hologram / Needs Physical Inspection",
                "asset_id": "GEM-ASSET-LTP-004",
                "serial_number": "SN-LEN-L15-CHK-04",
                "model": "ThinkPad L15 Gen 3",
                "oem": "Lenovo",
                "spec": {
                    "cpu": "Intel Core i5-12400",
                    "ram_gb": 16,
                    "ssd_gb": 512,
                    "display_inch": 15.6,
                    "display_resolution": "1920x1080 FHD",
                    "os": "Windows 11 Pro",
                    "warranty_years": 3,
                },
                "expected_result": "NEEDS_PHYSICAL_INSPECTION",
                "badge": "Needs Lab Inspection",
            },
        ],
    }


# ==============================================================================
# PHASE 8: HUMAN INSPECTION WORKFLOW ENDPOINTS
# ==============================================================================

class CreateCasePayload(BaseModel):
    asset_id: str


class InspectionDecisionPayload(BaseModel):
    final_decision: str = Field(..., description="ACCEPT, REJECT, RETEST, HOLD, REQUEST_CLARIFICATION")
    decision_justification: str = Field(..., description="Mandatory reason explaining human decision")
    checklist: Optional[List[Dict[str, Any]]] = None
    officer_remarks: Optional[str] = None


class ChecklistUpdatePayload(BaseModel):
    checklist: List[Dict[str, Any]]
    officer_remarks: Optional[str] = None


@router.get("/inspection-cases")
def list_inspection_cases(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List all human inspection cases with current status and metrics."""
    stmt = select(InspectionCase).order_by(InspectionCase.id.desc())
    if status_filter and status_filter != "all":
        stmt = stmt.where(InspectionCase.final_decision == status_filter.upper())
    cases = db.scalars(stmt).all()

    return [
        {
            "id": c.id,
            "case_id": c.case_id,
            "tender_id": c.tender_id,
            "tender_title": c.tender_title,
            "supplier_id": c.supplier_id,
            "supplier_name": c.supplier_name,
            "batch_id": c.batch_id,
            "batch_number": c.batch_number,
            "asset_id": c.asset_id,
            "serial_number": c.serial_number,
            "model_number": c.model_number,
            "oem": c.oem,
            "detected_issue": c.detected_issue,
            "expected_spec": c.expected_spec,
            "observed_spec": c.observed_spec,
            "inspector_name": c.inspector_name,
            "inspection_date": c.inspection_date.isoformat() if c.inspection_date else None,
            "checklist": c.checklist,
            "evidence_photos": c.evidence_photos,
            "officer_remarks": c.officer_remarks,
            "final_decision": c.final_decision,
            "decision_justification": c.decision_justification,
            "decided_at": c.decided_at.isoformat() if c.decided_at else None,
            "decided_by_name": c.decided_by_name,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in cases
    ]


@router.get("/inspection-cases/{case_id}")
def get_inspection_case(
    case_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve full details of a specific inspection case."""
    stmt = select(InspectionCase).where(
        (InspectionCase.case_id == case_id) | (InspectionCase.id == int(case_id) if case_id.isdigit() else False)
    )
    case = db.scalar(stmt)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection case '{case_id}' not found.",
        )

    return {
        "id": case.id,
        "case_id": case.case_id,
        "tender_id": case.tender_id,
        "tender_title": case.tender_title,
        "supplier_id": case.supplier_id,
        "supplier_name": case.supplier_name,
        "batch_id": case.batch_id,
        "batch_number": case.batch_number,
        "asset_id": case.asset_id,
        "serial_number": case.serial_number,
        "model_number": case.model_number,
        "oem": case.oem,
        "detected_issue": case.detected_issue,
        "expected_spec": case.expected_spec,
        "observed_spec": case.observed_spec,
        "inspector_name": case.inspector_name,
        "inspection_date": case.inspection_date.isoformat() if case.inspection_date else None,
        "checklist": case.checklist,
        "evidence_photos": case.evidence_photos,
        "officer_remarks": case.officer_remarks,
        "final_decision": case.final_decision,
        "decision_justification": case.decision_justification,
        "decided_at": case.decided_at.isoformat() if case.decided_at else None,
        "decided_by_name": case.decided_by_name,
    }


@router.post("/inspection-cases/create-from-asset")
def create_case_from_asset(
    payload: CreateCasePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create or retrieve human inspection case for an asset with AI pre-filled checklist."""
    try:
        case = create_or_get_case(
            db=db,
            asset_id=payload.asset_id,
            inspector_name=current_user.full_name or "Procurement Officer",
            user_id=current_user.id,
        )
        return {
            "status": "success",
            "case_id": case.case_id,
            "asset_id": case.asset_id,
            "final_decision": case.final_decision,
            "checklist_count": len(case.checklist),
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/inspection-cases/{case_id}/decision")
def submit_human_decision(
    case_id: str,
    payload: InspectionDecisionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Submit final human inspection determination with mandatory justification."""
    try:
        updated_case = record_final_decision(
            db=db,
            case_id=case_id,
            final_decision=payload.final_decision,
            decision_justification=payload.decision_justification,
            checklist=payload.checklist,
            officer_remarks=payload.officer_remarks,
            current_user=current_user,
        )
        return {
            "status": "success",
            "case_id": updated_case.case_id,
            "final_decision": updated_case.final_decision,
            "decision_justification": updated_case.decision_justification,
            "decided_by": updated_case.decided_by_name,
            "decided_at": updated_case.decided_at.isoformat() if updated_case.decided_at else None,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/inspection-cases/{case_id}/checklist")
def update_inspection_checklist(
    case_id: str,
    payload: ChecklistUpdatePayload,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update checklist items and technician findings in real-time."""
    stmt = select(InspectionCase).where(InspectionCase.case_id == case_id)
    case = db.scalar(stmt)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case.checklist = payload.checklist
    if payload.officer_remarks:
        case.officer_remarks = payload.officer_remarks
    db.commit()

    return {"status": "success", "case_id": case.case_id, "checklist": case.checklist}
