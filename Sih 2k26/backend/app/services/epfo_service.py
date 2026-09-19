"""Simulated EPFO establishment lookup.

TODO: Replace simulated verification with official government API integration (EPFO).
"""


def verify_epfo(epfo_code: str | None) -> dict:
    if not epfo_code:
        return {
            "simulated": True,
            "source": "EPFO",
            "status": "partial",
            "summary": "EPFO code not provided; exemption possible below 20 employees.",
        }
    return {
        "simulated": True,
        "source": "EPFO",
        "status": "pass",
        "epfo_code": epfo_code,
        "summary": f"Simulated EPFO ECR current for {epfo_code}.",
    }
