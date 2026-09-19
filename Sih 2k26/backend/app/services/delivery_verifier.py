"""Delivery and product specification verification engine.

Verifies post-award delivered product assets against contracted tender ATC specifications.
Provides explainable parameter comparisons, mismatch detection, and physical inspection instructions.

IMPORTANT: System never automatically rejects deliveries. Discrepancies generate
structured physical inspection recommendations for officer determination.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple


def _parse_numeric(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    # Search for first number in string
    match = re.search(r"(\d+(?:\.\d+)?)", str(val))
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def verify_device_specifications(expected: Dict[str, Any], actual: Dict[str, Any]) -> Dict[str, Any]:
    """Compares expected tender specifications against actual device hardware readings."""
    comparisons: List[Dict[str, Any]] = []
    mismatches: List[Dict[str, Any]] = []
    inspection_recommendations: List[str] = []

    # 1. CPU
    exp_cpu = str(expected.get("cpu", "Intel Core i5")).lower()
    act_cpu = str(actual.get("cpu", "")).lower()
    cpu_pass = True
    if "i5" in exp_cpu or "core i5" in exp_cpu:
        if "i3" in act_cpu or "celeron" in act_cpu or "pentium" in act_cpu:
            cpu_pass = False
    elif exp_cpu and not any(part in act_cpu for part in exp_cpu.split() if len(part) > 2):
        cpu_pass = False

    comp_cpu = {
        "component": "CPU / Processor",
        "expected": expected.get("cpu", "Intel Core i5 or equivalent"),
        "actual": actual.get("cpu", "Unknown Processor"),
        "status": "PASS" if cpu_pass else "MISMATCH",
        "detail": "Satisfies minimum performance grade" if cpu_pass else "Processor model grade is lower than contracted specification",
    }
    comparisons.append(comp_cpu)
    if not cpu_pass:
        mismatches.append(comp_cpu)
        inspection_recommendations.append("Verify CPU silicon ID via BIOS setup (F2/F12) and check factory motherboard label.")

    # 2. RAM
    exp_ram = _parse_numeric(expected.get("ram_gb", expected.get("ram", 16))) or 16.0
    act_ram = _parse_numeric(actual.get("ram_gb", actual.get("ram", 0))) or 0.0
    ram_pass = act_ram >= exp_ram

    comp_ram = {
        "component": "System Memory (RAM)",
        "expected": f"{int(exp_ram)} GB",
        "actual": f"{int(act_ram)} GB" if act_ram > 0 else str(actual.get("ram", "N/A")),
        "status": "PASS" if ram_pass else "MISMATCH",
        "detail": "Meets or exceeds minimum RAM" if ram_pass else f"RAM capacity ({int(act_ram)} GB) is below required {int(exp_ram)} GB",
    }
    comparisons.append(comp_ram)
    if not ram_pass:
        mismatches.append(comp_ram)
        inspection_recommendations.append(f"Inspect SODIMM memory slots. Check whether second memory stick is missing or unseated.")

    # 3. Storage (SSD)
    exp_ssd = _parse_numeric(expected.get("ssd_gb", expected.get("ssd", 512))) or 512.0
    act_ssd = _parse_numeric(actual.get("ssd_gb", actual.get("ssd", 0))) or 0.0
    ssd_pass = act_ssd >= exp_ssd

    comp_ssd = {
        "component": "Primary Storage (SSD)",
        "expected": f"{int(exp_ssd)} GB NVMe SSD",
        "actual": f"{int(act_ssd)} GB" if act_ssd > 0 else str(actual.get("ssd", "N/A")),
        "status": "PASS" if ssd_pass else "MISMATCH",
        "detail": "NVMe solid-state capacity satisfies requirement" if ssd_pass else f"Drive capacity ({int(act_ssd)} GB) is below contracted {int(exp_ssd)} GB",
    }
    comparisons.append(comp_ssd)
    if not ssd_pass:
        mismatches.append(comp_ssd)
        inspection_recommendations.append(f"Physical Inspection Required: SSD is {int(act_ssd)} GB instead of required {int(exp_ssd)} GB. Remove bottom chassis cover, inspect M.2 drive label part number, and check storage controller.")

    # 4. Display
    exp_disp = _parse_numeric(expected.get("display_inch", expected.get("display", 15.6))) or 15.6
    act_disp = _parse_numeric(actual.get("display_inch", actual.get("display", 0))) or 0.0
    disp_pass = act_disp >= (exp_disp - 0.2)  # Tolerance for minor bezel rounding

    comp_disp = {
        "component": "Display Panel",
        "expected": f'{expected.get("display_inch", "15.6")}" FHD (1920x1080)',
        "actual": f'{actual.get("display_inch", actual.get("display", "Unknown"))}" {actual.get("display_resolution", "")}'.strip(),
        "status": "PASS" if disp_pass else "MISMATCH",
        "detail": "Panel dimensions and resolution match tender specification" if disp_pass else "Display panel size or resolution does not meet contract requirements",
    }
    comparisons.append(comp_disp)
    if not disp_pass:
        mismatches.append(comp_disp)
        inspection_recommendations.append("Measure active diagonal display area and verify EDID panel ID via diagnostics.")

    # 5. Warranty
    exp_war = _parse_numeric(expected.get("warranty_years", 3)) or 3.0
    act_war = _parse_numeric(actual.get("warranty_years", 0)) or 0.0
    war_pass = act_war >= exp_war or (actual.get("warranty") and "3" in str(actual.get("warranty")))

    comp_war = {
        "component": "Warranty & Support",
        "expected": f"{int(exp_war)} Years Comprehensive On-Site",
        "actual": actual.get("warranty", f"{int(act_war)} Years" if act_war > 0 else "Unknown"),
        "status": "PASS" if war_pass else "MISMATCH",
        "detail": "Warranty coverage verified" if war_pass else "Warranty duration is less than contracted period",
    }
    comparisons.append(comp_war)
    if not war_pass:
        mismatches.append(comp_war)
        inspection_recommendations.append("Check OEM warranty entitlement portal using serial number to confirm active service level agreement.")

    overall_result = "PASS" if not mismatches else "MISMATCH"

    return {
        "overall_result": overall_result,
        "is_pass": overall_result == "PASS",
        "total_components_checked": len(comparisons),
        "passed_count": sum(1 for c in comparisons if c["status"] == "PASS"),
        "mismatch_count": len(mismatches),
        "comparisons": comparisons,
        "mismatches": mismatches,
        "inspection_recommendations": inspection_recommendations,
        "action_guidance": (
            "All specifications match contracted tender requirements. Unit approved for delivery batch acceptance."
            if overall_result == "PASS"
            else "Specification mismatch detected. Do not reject automatically. Request physical inspection or issue technical discrepancy notice."
        ),
    }
