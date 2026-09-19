"""Simulated ESIC coverage lookup.

TODO: Replace simulated verification with official government API integration (ESIC).
"""


def verify_esic(esic_code: str | None) -> dict:
    if not esic_code:
        return {
            "simulated": True,
            "source": "ESIC",
            "status": "partial",
            "summary": "ESIC code not provided; may be exempt below wage/employee threshold.",
        }
    return {
        "simulated": True,
        "source": "ESIC",
        "status": "pass",
        "esic_code": esic_code,
        "summary": f"Simulated ESIC coverage current for {esic_code}.",
    }
