"""Simulated GSTN lookup.

TODO: Replace simulated verification with official GSTN / GSP API integration.
"""

from __future__ import annotations

import re

GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


def verify_gstin(gstin: str | None, legal_name: str | None = None) -> dict:
    if not gstin:
        return {
            "simulated": True,
            "source": "GSTN",
            "status": "missing",
            "gst_status": "Unknown",
            "summary": "GSTIN not furnished.",
        }
    ok = bool(GSTIN_RE.match(gstin))
    return {
        "simulated": True,
        "source": "GSTN",
        "status": "pass" if ok else "fail",
        "gstin": gstin,
        "gst_status": "Active" if ok else "Invalid format",
        "legal_name": legal_name,
        "summary": f"Simulated GSTN status for {gstin}: {'Active' if ok else 'failed format check'}.",
    }
