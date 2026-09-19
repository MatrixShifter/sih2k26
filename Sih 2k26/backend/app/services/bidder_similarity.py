"""Related-bidder review signals (not a fraud accusation).

TODO: Tune similarity with official director/signatory data from MCA21 when APIs are live.
"""

from __future__ import annotations

from difflib import SequenceMatcher

from app.models.bidder import Bidder


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()


def _similar(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def find_related(target: Bidder, others: list[Bidder]) -> list[dict]:
    results: list[dict] = []
    t_name = _norm(target.legal_name)
    t_addr = _norm(target.registered_address)
    t_dir = _norm(target.director_name)
    for other in others:
        if other.id == target.id:
            continue
        matches: list[str] = []
        score = 0
        if target.pan and other.pan and target.pan == other.pan:
            matches.append("PAN")
            score += 40
        if target.gstin and other.gstin and target.gstin == other.gstin:
            matches.append("GSTIN")
            score += 40
        if t_addr and t_addr == _norm(other.registered_address):
            matches.append("Registered address")
            score += 25
        if t_dir and t_dir == _norm(other.director_name):
            matches.append("Director")
            score += 20
        if target.contact_phone and target.contact_phone == other.contact_phone:
            matches.append("Contact number")
            score += 20
        if target.contact_email and target.contact_email.lower() == other.contact_email.lower():
            matches.append("Email")
            score += 20
        name_sim = _similar(t_name, _norm(other.legal_name))
        if name_sim >= 0.82:
            matches.append("Company name similarity")
            score += int(name_sim * 20)
        if score >= 25 and matches:
            results.append(
                {
                    "bidder_id": other.id,
                    "legal_name": other.legal_name,
                    "confidence": min(99, score),
                    "matching_attributes": matches,
                    "review_signal": "Potential related bidder — review overlap; this is not a finding of fraud.",
                }
            )
    results.sort(key=lambda row: row["confidence"], reverse=True)
    return results[:5]
