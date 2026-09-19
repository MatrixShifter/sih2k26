"""Grounded Q&A over a single bid packet. Does not invent facts."""

from __future__ import annotations

from app.models.bid_application import BidApplication
from app.models.compliance import ComplianceCheck


def answer(question: str, bid: BidApplication, check: ComplianceCheck | None) -> str:
    q = question.lower().strip()
    if not q:
        return "Ask a question about this tender packet."

    if check is None:
        return "The available bid records do not contain enough evidence to answer this. Run AI verification first."

    breakdown = (check.score_breakdown or {}).get("earned") or {}
    lines = (check.score_breakdown or {}).get("lines") or []
    failed = [r for r in (check.requirement_results or []) if r.get("status") in {"FAIL", "MISSING"}]
    missing = [r for r in (check.requirement_results or []) if r.get("status") == "MISSING"]
    contradictions = check.contradictions or []
    factors = check.risk_factors or []

    if "72" in q or "score" in q or "why" in q and "percent" in q or "why did" in q:
        detail = "; ".join(lines[:8]) if lines else "Score lines were not stored."
        return (
            f"{bid.bidder.legal_name} scored {float(check.overall_score):.0f}/100 "
            f"({check.risk_level.value} risk). Component totals: {breakdown}. {detail}"
        )
    if "mandatory" in q and ("fail" in q or "failed" in q):
        if not failed:
            return "No mandatory requirements are recorded as FAIL or MISSING on the latest check."
        return "Failed or missing mandatory items: " + "; ".join(
            f"{item.get('requirement')} ({item.get('status')}: {item.get('reason')})" for item in failed
        )
    if "missing" in q and "document" in q:
        if not missing:
            return "The latest checklist does not list missing evidence types."
        return "Missing evidence: " + "; ".join(f"{item.get('requirement')} — {item.get('evidence')}" for item in missing)
    if "contradict" in q:
        if not contradictions:
            return "No cross-document contradictions were stored on the latest verification."
        return "Contradictions: " + "; ".join(
            f"{c.get('field')}: {c.get('note')} ({c.get('left', {}).get('source')} vs {c.get('right', {}).get('source')})"
            for c in contradictions
        )
    if "manually verify" in q or "should i" in q:
        actions = []
        for item in failed:
            actions.append(item.get("reason") or item.get("requirement"))
        for f in factors:
            if f.get("severity") == "HIGH":
                actions.append(f.get("detail"))
        if not actions:
            return "No high-severity manual checks were flagged. Confirm L1 commercials independently of this eligibility score."
        return "Manually verify: " + "; ".join(str(a) for a in actions if a)
    if "summar" in q:
        return check.summary
    if "recommend" in q:
        return (
            f"Recommendation: {check.recommendation.value.replace('_', ' ')} "
            f"(confidence {float(check.confidence):.0f}%). {check.summary}"
        )
    if "risk" in q:
        return (
            f"Risk level {check.risk_level.value.upper()}. Factors: "
            + ("; ".join(f"{f.get('code')}: {f.get('detail')}" for f in factors) or "none stored")
        )

    return "The available bid records do not contain enough evidence to answer this. Try asking about score, missing documents, contradictions, risk, or the AI recommendation."
