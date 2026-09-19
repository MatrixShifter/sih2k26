"""Simulated DigiLocker issued-document verify.

TODO: Replace simulated verification with official government API integration (DigiLocker).
"""


def verify_issued_uri(has_document: bool, bidder_id: int) -> dict:
    if not has_document:
        return {
            "simulated": True,
            "source": "DIGILOCKER",
            "status": "missing",
            "summary": "No DigiLocker issued document attached.",
        }
    return {
        "simulated": True,
        "source": "DIGILOCKER",
        "status": "pass",
        "issued_uri": f"in.gov.udyam-{bidder_id}",
        "summary": "Simulated DigiLocker issuer signature valid.",
    }
