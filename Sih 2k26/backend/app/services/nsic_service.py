"""Simulated NSIC / SPRS registration lookup.

TODO: Replace simulated verification with official government API integration (NSIC).
"""


def verify_nsic(nsic_registration: str | None) -> dict:
    if not nsic_registration:
        return {
            "simulated": True,
            "source": "NSIC",
            "status": "partial",
            "summary": "NSIC / SPRS registration not furnished; MSE preference may not apply.",
        }
    return {
        "simulated": True,
        "source": "NSIC",
        "status": "pass",
        "nsic_registration": nsic_registration,
        "summary": f"Simulated NSIC registration {nsic_registration} valid for MSE preference.",
    }
