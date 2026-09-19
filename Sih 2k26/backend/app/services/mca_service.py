"""Simulated MCA21 master-data lookup.

TODO: Replace simulated verification with official government API integration (MCA21 V3).
"""

from __future__ import annotations

import re

CIN_RE = re.compile(r"^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$")


def verify_cin(cin: str | None, legal_name: str | None = None) -> dict:
    if not cin:
        return {
            "simulated": True,
            "source": "MCA21",
            "status": "partial",
            "company_status": "Not applicable",
            "summary": "CIN not provided (proprietorship / LLP may skip).",
        }
    ok = bool(CIN_RE.match(cin))
    return {
        "simulated": True,
        "source": "MCA21",
        "status": "pass" if ok else "fail",
        "cin": cin,
        "company_status": "Active" if ok else "Unknown",
        "legal_name": legal_name,
        "summary": f"Simulated MCA21 status for {cin}: {'Active' if ok else 'pattern failed'}.",
    }
