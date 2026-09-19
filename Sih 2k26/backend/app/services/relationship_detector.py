"""Vigilance and relationship detection service.

Identifies potential relationships between bidders based on shared directors,
addresses, contact details, common identifiers, and duplicate document hashes.

IMPORTANT: AI is a decision-support system. Relationship detection identifies
patterns that warrant officer attention; it does not establish collusion or fraud.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.bidder import Bidder
from app.models.document import Document
from app.models.bid_application import BidApplication
from app.models.vigilance import VigilanceAction


DISCLAIMER_TEXT = (
    "Evidence indicates a potential relationship; it does not establish collusion. "
    "Requires procurement officer review and formal verification."
)


def _normalize_string(val: Optional[str]) -> str:
    if not val:
        return ""
    # Lowercase, remove punctuation and extra whitespace
    s = val.lower().strip()
    s = re.sub(r"[^\w\s]", " ", s)
    return " ".join(s.split())


def _normalize_phone(val: Optional[str]) -> str:
    if not val:
        return ""
    # Strip non-digits
    digits = re.sub(r"\D", "", val)
    # Remove leading 91 or 0 if 12 or 11 digits
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits


def _extract_email_domain(email: Optional[str]) -> Optional[str]:
    if not email or "@" not in email:
        return None
    domain = email.split("@")[-1].strip().lower()
    public_domains = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "icloud.com"}
    if domain in public_domains:
        return None
    return domain


def _address_similarity(addr1: str, addr2: str) -> float:
    n1 = set(_normalize_string(addr1).split())
    n2 = set(_normalize_string(addr2).split())
    if not n1 or not n2:
        return 0.0
    common = n1.intersection(n2)
    # Common stop words to exclude
    stopwords = {"road", "street", "plot", "phase", "near", "opposite", "floor", "building", "no", "pune", "delhi", "mumbai", "bengaluru", "chennai", "india", "maharashtra", "karnataka"}
    filtered_common = {w for w in common if w not in stopwords and len(w) > 2}
    total_distinct = (n1.union(n2)) - stopwords
    if not total_distinct:
        return 0.0
    return len(filtered_common) / len(total_distinct)


def detect_bidder_relationships(db: Session, tender_id: Optional[int] = None) -> Dict[str, Any]:
    """Scans bidders and documents for suspicious indicators of relationship."""

    # 1. Fetch bidders
    if tender_id:
        bids = db.scalars(
            select(BidApplication).where(BidApplication.tender_id == tender_id)
        ).all()
        bidder_ids = [b.bidder_id for b in bids]
        bidders = db.scalars(
            select(Bidder).where(Bidder.id.in_(bidder_ids))
        ).all()
    else:
        bidders = db.scalars(select(Bidder)).all()

    if len(bidders) < 2:
        return {
            "disclaimer": DISCLAIMER_TEXT,
            "total_alerts": 0,
            "alerts": [],
            "graph": {"nodes": [], "edges": []},
            "stats": {"high_risk": 0, "medium_risk": 0, "low_risk": 0, "pending_review": 0},
        }

    # Fetch all documents with their hashes
    all_docs = db.scalars(select(Document)).all()
    bidder_docs: Dict[int, List[Document]] = {}
    for doc in all_docs:
        if doc.bidder_id not in bidder_docs:
            bidder_docs[doc.bidder_id] = []
        bidder_docs[doc.bidder_id].append(doc)

    # Fetch latest vigilance actions
    actions = db.scalars(select(VigilanceAction).order_by(VigilanceAction.id.desc())).all()
    latest_action_by_alert: Dict[str, VigilanceAction] = {}
    for act in actions:
        if act.alert_id not in latest_action_by_alert:
            latest_action_by_alert[act.alert_id] = act

    alerts: List[Dict[str, Any]] = []
    graph_nodes: Dict[str, Dict[str, Any]] = {}
    graph_edges: List[Dict[str, Any]] = []

    # Add all bidder nodes initially
    for b in bidders:
        bidder_node_id = f"bidder_{b.id}"
        graph_nodes[bidder_node_id] = {
            "id": bidder_node_id,
            "label": b.trade_name or b.legal_name,
            "fullName": b.legal_name,
            "type": "BIDDER",
            "bidderId": b.id,
            "state": b.state,
            "director": b.director_name or "Not Specified",
            "gstin": b.gstin or "N/A",
            "hasAlert": False,
        }

    # 2. Pairwise comparison
    n = len(bidders)
    for i in range(n):
        for j in range(i + 1, n):
            b1 = bidders[i]
            b2 = bidders[j]

            alert_id = f"rel_{min(b1.id, b2.id)}_{max(b1.id, b2.id)}"
            indicators: List[Dict[str, Any]] = []
            score = 0

            # Check 1: Shared Director
            d1 = _normalize_string(b1.director_name)
            d2 = _normalize_string(b2.director_name)
            if d1 and d2 and (d1 == d2 or d1 in d2 or d2 in d1):
                indicators.append({
                    "code": "SHARED_DIRECTOR",
                    "title": "Shared Key Management / Director",
                    "severity": "HIGH",
                    "detail": f'Both entities list "{b1.director_name}" as Director or key management personnel.',
                    "evidence": {
                        "entity_a_value": b1.director_name,
                        "entity_b_value": b2.director_name,
                    },
                })
                score += 50

                dir_node_id = f"dir_{hashlib.md5(d1.encode()).hexdigest()[:8]}"
                if dir_node_id not in graph_nodes:
                    graph_nodes[dir_node_id] = {
                        "id": dir_node_id,
                        "label": b1.director_name,
                        "type": "DIRECTOR",
                        "category": "Management",
                    }
                graph_edges.append({
                    "id": f"edge_{b1.id}_{dir_node_id}",
                    "source": f"bidder_{b1.id}",
                    "target": dir_node_id,
                    "relationship": "Director",
                    "color": "#ef4444",
                })
                graph_edges.append({
                    "id": f"edge_{b2.id}_{dir_node_id}",
                    "source": f"bidder_{b2.id}",
                    "target": dir_node_id,
                    "relationship": "Director",
                    "color": "#ef4444",
                })

            # Check 2: Same Registered Address
            addr_sim = _address_similarity(b1.registered_address, b2.registered_address)
            pincode_match = (b1.pincode and b2.pincode and b1.pincode.strip() == b2.pincode.strip())
            if addr_sim > 0.45 or (pincode_match and _normalize_string(b1.registered_address) == _normalize_string(b2.registered_address)):
                indicators.append({
                    "code": "SHARED_ADDRESS",
                    "title": "Identical / Overlapping Registered Office Address",
                    "severity": "HIGH" if pincode_match else "MEDIUM",
                    "detail": f'Entities share registered office premises: "{b1.registered_address}". Similarity: {int(addr_sim * 100)}%',
                    "evidence": {
                        "entity_a_value": b1.registered_address,
                        "entity_b_value": b2.registered_address,
                        "pincode": b1.pincode,
                    },
                })
                score += 35

                addr_key = b1.pincode or b1.registered_address[:15]
                addr_node_id = f"addr_{hashlib.md5(addr_key.encode()).hexdigest()[:8]}"
                if addr_node_id not in graph_nodes:
                    graph_nodes[addr_node_id] = {
                        "id": addr_node_id,
                        "label": f"Premises ({b1.pincode})",
                        "type": "ADDRESS",
                        "category": "Premises",
                    }
                graph_edges.append({
                    "id": f"edge_{b1.id}_{addr_node_id}",
                    "source": f"bidder_{b1.id}",
                    "target": addr_node_id,
                    "relationship": "Registered Office",
                    "color": "#f59e0b",
                })
                graph_edges.append({
                    "id": f"edge_{b2.id}_{addr_node_id}",
                    "source": f"bidder_{b2.id}",
                    "target": addr_node_id,
                    "relationship": "Registered Office",
                    "color": "#f59e0b",
                })

            # Check 3: Shared Contact Phone
            p1 = _normalize_phone(b1.contact_phone)
            p2 = _normalize_phone(b2.contact_phone)
            if p1 and p2 and len(p1) >= 8 and p1 == p2:
                indicators.append({
                    "code": "SHARED_PHONE",
                    "title": "Identical Primary Telephone / Contact Number",
                    "severity": "HIGH",
                    "detail": f'Both bidders share official contact number: "{b1.contact_phone}".',
                    "evidence": {
                        "entity_a_value": b1.contact_phone,
                        "entity_b_value": b2.contact_phone,
                    },
                })
                score += 30

                phone_node_id = f"phone_{hashlib.md5(p1.encode()).hexdigest()[:8]}"
                if phone_node_id not in graph_nodes:
                    graph_nodes[phone_node_id] = {
                        "id": phone_node_id,
                        "label": f"Phone ({b1.contact_phone})",
                        "type": "PHONE",
                        "category": "Contact",
                    }
                graph_edges.append({
                    "id": f"edge_{b1.id}_{phone_node_id}",
                    "source": f"bidder_{b1.id}",
                    "target": phone_node_id,
                    "relationship": "Shared Phone",
                    "color": "#3b82f6",
                })
                graph_edges.append({
                    "id": f"edge_{b2.id}_{phone_node_id}",
                    "source": f"bidder_{b2.id}",
                    "target": phone_node_id,
                    "relationship": "Shared Phone",
                    "color": "#3b82f6",
                })

            # Check 4: Shared Email Domain
            dom1 = _extract_email_domain(b1.contact_email)
            dom2 = _extract_email_domain(b2.contact_email)
            if dom1 and dom2 and dom1 == dom2:
                indicators.append({
                    "code": "SHARED_EMAIL_DOMAIN",
                    "title": "Common Enterprise Email Domain",
                    "severity": "MEDIUM",
                    "detail": f'Both bidders utilize official corporate domain: "@{dom1}".',
                    "evidence": {
                        "entity_a_value": b1.contact_email,
                        "entity_b_value": b2.contact_email,
                        "domain": dom1,
                    },
                })
                score += 20

            # Check 5: Duplicate Document Hashes (SHA-256 binary match)
            docs1 = bidder_docs.get(b1.id, [])
            docs2 = bidder_docs.get(b2.id, [])
            hash_map1 = {d.sha256_hash: d for d in docs1 if d.sha256_hash and len(d.sha256_hash) == 64}
            hash_map2 = {d.sha256_hash: d for d in docs2 if d.sha256_hash and len(d.sha256_hash) == 64}

            common_hashes = set(hash_map1.keys()).intersection(set(hash_map2.keys()))
            for h in common_hashes:
                doc_a = hash_map1[h]
                doc_b = hash_map2[h]
                indicators.append({
                    "code": "DUPLICATE_DOCUMENT_HASH",
                    "title": "Binary Identical Document (Reused Artifact)",
                    "severity": "HIGH",
                    "detail": (
                        f'Identical SHA-256 file fingerprint ({h[:12]}...) detected across both submissions. '
                        f'Bidder A submitted "{doc_a.original_filename}", Bidder B submitted "{doc_b.original_filename}".'
                    ),
                    "evidence": {
                        "sha256_hash": h,
                        "doc_a_name": doc_a.original_filename,
                        "doc_a_type": doc_a.document_type.value if hasattr(doc_a.document_type, "value") else str(doc_a.document_type),
                        "doc_b_name": doc_b.original_filename,
                        "doc_b_type": doc_b.document_type.value if hasattr(doc_b.document_type, "value") else str(doc_b.document_type),
                    },
                })
                score += 45

                doc_node_id = f"doc_{h[:8]}"
                if doc_node_id not in graph_nodes:
                    graph_nodes[doc_node_id] = {
                        "id": doc_node_id,
                        "label": f"File Hash ({h[:8]}...)",
                        "type": "DOCUMENT_HASH",
                        "category": "Artifact",
                        "docName": doc_a.original_filename,
                    }
                graph_edges.append({
                    "id": f"edge_{b1.id}_{doc_node_id}",
                    "source": f"bidder_{b1.id}",
                    "target": doc_node_id,
                    "relationship": "Reused Document",
                    "color": "#8b5cf6",
                })
                graph_edges.append({
                    "id": f"edge_{b2.id}_{doc_node_id}",
                    "source": f"bidder_{b2.id}",
                    "target": doc_node_id,
                    "relationship": "Reused Document",
                    "color": "#8b5cf6",
                })

            # If any indicators were found
            if indicators:
                # Mark bidders as having alert
                graph_nodes[f"bidder_{b1.id}"]["hasAlert"] = True
                graph_nodes[f"bidder_{b2.id}"]["hasAlert"] = True

                # Risk Level calculation
                if score >= 60 or any(ind["severity"] == "HIGH" for ind in indicators):
                    risk_level = "HIGH"
                elif score >= 30:
                    risk_level = "MEDIUM"
                else:
                    risk_level = "LOW"

                # Check officer action history
                latest_action = latest_action_by_alert.get(alert_id)
                action_status = latest_action.action if latest_action else "PENDING_REVIEW"
                action_reason = latest_action.reason if latest_action else None
                officer_name = latest_action.officer_name if latest_action else None
                action_date = latest_action.created_at.isoformat() if latest_action else None

                alerts.append({
                    "alert_id": alert_id,
                    "title": "Potential Relationship Detected",
                    "risk_level": risk_level,
                    "risk_score": score,
                    "disclaimer": DISCLAIMER_TEXT,
                    "bidder_a": {
                        "id": b1.id,
                        "name": b1.legal_name,
                        "trade_name": b1.trade_name,
                        "director": b1.director_name,
                        "address": b1.registered_address,
                        "pincode": b1.pincode,
                        "phone": b1.contact_phone,
                        "email": b1.contact_email,
                        "gstin": b1.gstin,
                        "cin": b1.cin,
                    },
                    "bidder_b": {
                        "id": b2.id,
                        "name": b2.legal_name,
                        "trade_name": b2.trade_name,
                        "director": b2.director_name,
                        "address": b2.registered_address,
                        "pincode": b2.pincode,
                        "phone": b2.contact_phone,
                        "email": b2.contact_email,
                        "gstin": b2.gstin,
                        "cin": b2.cin,
                    },
                    "indicators": indicators,
                    "indicator_count": len(indicators),
                    "action_status": action_status,
                    "action_reason": action_reason,
                    "officer_name": officer_name,
                    "action_date": action_date,
                })

    # Sort alerts by risk score descending
    alerts.sort(key=lambda x: x["risk_score"], reverse=True)

    high_risk_count = sum(1 for a in alerts if a["risk_level"] == "HIGH")
    medium_risk_count = sum(1 for a in alerts if a["risk_level"] == "MEDIUM")
    low_risk_count = sum(1 for a in alerts if a["risk_level"] == "LOW")
    pending_count = sum(1 for a in alerts if a["action_status"] == "PENDING_REVIEW")

    return {
        "disclaimer": DISCLAIMER_TEXT,
        "total_alerts": len(alerts),
        "stats": {
            "high_risk": high_risk_count,
            "medium_risk": medium_risk_count,
            "low_risk": low_risk_count,
            "pending_review": pending_count,
        },
        "alerts": alerts,
        "graph": {
            "nodes": list(graph_nodes.values()),
            "edges": graph_edges,
        },
    }
