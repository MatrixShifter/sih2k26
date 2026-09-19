"""Simulated Startup India / DPIIT recognition lookup.

TODO: Replace simulated verification with official government API integration (Startup India).
"""


def verify_dpiit(dpiit_number: str | None) -> dict:
    if not dpiit_number:
        return {
            "simulated": True,
            "source": "STARTUP_INDIA",
            "status": "partial",
            "summary": "Not a recognised startup — prior experience/turnover exemption not claimed.",
        }
    return {
        "simulated": True,
        "source": "STARTUP_INDIA",
        "status": "pass",
        "dpiit_number": dpiit_number,
        "summary": f"Simulated DPIIT recognition {dpiit_number} current.",
    }
