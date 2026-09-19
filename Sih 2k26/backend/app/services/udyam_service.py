"""Simulated Udyam / MSME portal lookup.

TODO: Replace simulated verification with official government API integration
(Udyam Registration / MSME portal).
"""

from __future__ import annotations

import re

UDYAM_RE = re.compile(r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$")


def verify_udyam(udyam_number: str | None, legal_name: str | None = None) -> dict:
    if not udyam_number:
        return {
            "simulated": True,
            "source": "UDYAM",
            "status": "missing",
            "summary": "Udyam number not furnished.",
        }
    ok = bool(UDYAM_RE.match(udyam_number))
    return {
        "simulated": True,
        "source": "UDYAM",
        "status": "pass" if ok else "fail",
        "udyam_number": udyam_number,
        "enterprise_type": "Small" if ok else None,
        "legal_name": legal_name,
        "summary": f"Simulated Udyam check for {udyam_number}: {'active MSME' if ok else 'invalid format'}.",
    }
