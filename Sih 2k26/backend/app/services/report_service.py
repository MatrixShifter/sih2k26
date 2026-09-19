"""Government-grade HTML compliance report for print / PDF export."""

from __future__ import annotations

from html import escape
from datetime import datetime

from app.models.bid_application import BidApplication
from app.models.compliance import ComplianceCheck


def render_html(bid: BidApplication, check: ComplianceCheck | None, audit_id: int | None) -> str:
    bidder = bid.bidder
    tender = bid.tender
    score = f"{float(check.overall_score):.1f}" if check else "—"
    risk = check.risk_level.value.upper() if check else "NOT SCORED"
    rec = check.recommendation.value.replace("_", " ").upper() if check else "PENDING EVALUATION"
    
    # Requirement rows
    req_rows = ""
    if check and check.requirement_results:
        for idx, item in enumerate(check.requirement_results, 1):
            status = str(item.get("comparison_result") or item.get("status", "NEEDS REVIEW")).upper()
            status_color = "#059669" if status in {"COMPLIANT", "PASS"} else "#DC2626" if status in {"NON-COMPLIANT", "FAIL", "EXPIRED"} else "#D97706"
            status_bg = "#ECFDF5" if status in {"COMPLIANT", "PASS"} else "#FEF2F2" if status in {"NON-COMPLIANT", "FAIL", "EXPIRED"} else "#FFFBEB"
            
            evidence = escape(str(item.get("bidder_evidence") or item.get("evidence") or "—"))
            req_text = escape(str(item.get("requirement_text") or item.get("requirement") or "—"))
            reason = escape(str(item.get("explanation") or item.get("reason") or "—"))
            conf = item.get("confidence", 85)
            
            override_info = ""
            if item.get("reviewer_status") == "OVERRIDDEN":
                ov = item.get("officer_override", {})
                override_info = f'<br/><span style="font-size:11px;color:#7C3AED;font-weight:bold;">[OFFICER OVERRIDE: {escape(str(ov.get("previous_status")))} &rarr; {escape(str(ov.get("new_status")))} &bull; Reason: {escape(str(ov.get("reason")))}]</span>'

            req_rows += f"""
            <tr>
                <td style="text-align:center;font-weight:600;color:#64748B;">{idx}</td>
                <td>
                    <strong style="color:#0F172A;">{req_text}</strong>
                    <div style="font-size:11px;color:#64748B;margin-top:2px;">Category: {escape(str(item.get('category', 'TECHNICAL')))} | Mandatory: {'Yes' if item.get('mandatory', True) else 'No'}</div>
                </td>
                <td style="font-family:monospace;font-size:12px;color:#1E293B;">{evidence}</td>
                <td>
                    <span style="display:inline-block;padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:700;background:{status_bg};color:{status_color};border:1px solid {status_color}40;">
                        {status}
                    </span>
                    <div style="font-size:10px;color:#64748B;margin-top:2px;">Confidence: {conf}%</div>
                </td>
                <td style="font-size:12px;line-height:1.4;color:#334155;">
                    {reason}
                    {override_info}
                </td>
            </tr>
            """
    else:
        req_rows = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#64748B;">No requirement checklist results available.</td></tr>'

    # Contradictions list
    contra_items = ""
    if check and check.contradictions:
        for c in check.contradictions:
            sev = c.get("severity", "MEDIUM")
            note = escape(str(c.get("note", "")))
            field = escape(str(c.get("field", "")))
            left = escape(str(c.get("left", {}).get("value", "")))
            left_src = escape(str(c.get("left", {}).get("source", "Source A")))
            right = escape(str(c.get("right", {}).get("value", "")))
            right_src = escape(str(c.get("right", {}).get("source", "Source B")))
            contra_items += f"""
            <div style="padding:10px 12px;margin-bottom:8px;border-radius:6px;background:#FEF2F2;border-left:4px solid #EF4444;font-size:12px;">
                <strong style="color:#991B1B;">[{sev}] {note} ({field})</strong>
                <div style="color:#4B5563;margin-top:2px;">{left_src}: <code>{left}</code> vs {right_src}: <code>{right}</code></div>
            </div>
            """
    else:
        contra_items = '<div style="padding:10px;color:#059669;font-size:12px;background:#ECFDF5;border-radius:6px;border-left:4px solid #10B981;">&check; No cross-document contradictions or identity discrepancies detected.</div>'

    # Decision details
    decision = bid.status.value.replace("_", " ").title()
    notes = escape(bid.decision_notes or "No official officer remarks recorded yet.")
    override_reason = escape(bid.override_reason or "None (Decision aligns with automated analysis)")
    summary = escape(check.summary if check else "Verification pending.")
    now_str = datetime.now().strftime("%d %B %Y, %H:%M:%S UTC")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>GeM Compliance Evaluation Report &mdash; {escape(bid.reference_code)}</title>
<style>
  @page {{ size: A4; margin: 18mm; }}
  @media print {{
    body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    .no-print {{ display: none !important; }}
  }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1E293B; margin: 0; padding: 24px; background: #F8FAFC; }}
  .container {{ max-width: 960px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; }}
  .header {{ background: #0B192C; color: #FFFFFF; padding: 24px 32px; border-bottom: 4px solid #FF6500; display: flex; justify-content: space-between; align-items: center; }}
  .header-left h1 {{ margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; }}
  .header-left p {{ margin: 4px 0 0 0; font-size: 13px; color: #94A3B8; }}
  .badge-gov {{ background: #FF6500; color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }}
  .disclaimer-banner {{ background: #FFFBEB; border-bottom: 1px solid #FDE68A; padding: 12px 32px; font-size: 12px; color: #92400E; display: flex; align-items: center; gap: 8px; font-weight: 600; }}
  .body-content {{ padding: 32px; }}
  .section-title {{ font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 24px 0 12px 0; border-bottom: 2px solid #F1F5F9; padding-bottom: 6px; }}
  .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
  .card {{ background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; font-size: 13px; }}
  .card h3 {{ margin: 0 0 8px 0; font-size: 13px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }}
  .card p {{ margin: 4px 0; color: #1E293B; }}
  .score-card {{ background: #0F172A; color: white; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }}
  .score-number {{ font-size: 40px; font-weight: 900; line-height: 1; color: #10B981; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }}
  th {{ background: #F1F5F9; color: #475569; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #CBD5E1; }}
  td {{ padding: 10px 12px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }}
  .footer {{ margin-top: 32px; padding: 16px 32px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B; text-align: center; line-height: 1.5; }}
  .btn-print {{ background: #0B192C; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }}
</style>
</head>
<body>

<div style="text-align: right; margin-bottom: 16px; max-width: 960px; margin-left: auto; margin-right: auto;" class="no-print">
  <button class="btn-print" onclick="window.print()">Print Official Report / Save as PDF</button>
</div>

<div class="container">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>Government e-Marketplace (GeM) &mdash; Compliance Evaluation Summary</h1>
      <p>ComplyGeM AI Automated Bid Eligibility &amp; Document Intelligence Verification System</p>
    </div>
    <div>
      <span class="badge-gov">SIH 2026 Prototype</span>
    </div>
  </div>

  <!-- Mandatory SIH Decision Support Disclaimer Banner -->
  <div class="disclaimer-banner">
    <span style="font-size: 16px;">&#9888;</span>
    <span>AI-ASSISTED COMPLIANCE ANALYSIS. FINAL PROCUREMENT QUALIFICATION DECISION REMAINS SOLELY WITH THE AUTHORIZED PROCUREMENT OFFICER.</span>
  </div>

  <div class="body-content">
    <!-- Executive Score Banner -->
    <div class="score-card">
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8;">Compliance Assessment Outcome</div>
        <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">Recommendation: {escape(rec)}</div>
        <div style="font-size: 13px; color: #CBD5E1; margin-top: 4px;">{summary}</div>
      </div>
      <div style="text-align: right;">
        <div class="score-number">{score} <span style="font-size: 20px; color: #94A3B8;">/ 100</span></div>
        <div style="font-size: 11px; color: #E2E8F0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-top: 4px;">Risk Level: {escape(risk)}</div>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="grid-2">
      <div class="card">
        <h3>Tender Information</h3>
        <p><strong>GeM Bid Number:</strong> {escape(tender.gem_bid_number)}</p>
        <p><strong>Title:</strong> {escape(tender.title)}</p>
        <p><strong>Procuring Entity:</strong> {escape(tender.department)}</p>
        <p><strong>Estimated Value:</strong> INR {float(tender.estimated_value_inr):,.2f}</p>
        <p><strong>Bid Closing Date:</strong> {tender.closing_date.strftime('%d %B %Y') if tender.closing_date else '—'}</p>
      </div>
      <div class="card">
        <h3>Bidder Profile</h3>
        <p><strong>Legal Name:</strong> {escape(bidder.legal_name)}</p>
        <p><strong>Reference Code:</strong> <code>{escape(bid.reference_code)}</code></p>
        <p><strong>PAN:</strong> {escape(bidder.pan or '—')} | <strong>GSTIN:</strong> {escape(bidder.gstin or '—')}</p>
        <p><strong>Udyam Number:</strong> {escape(bidder.udyam_number or 'Not Furnished')}</p>
        <p><strong>Turnover / Experience:</strong> INR {float(bidder.annual_turnover_inr or 0):,.0f} | {bidder.years_experience or 0} Years</p>
      </div>
    </div>

    <!-- Requirement Comparison Matrix -->
    <div class="section-title">Eligibility Criteria vs Bidder Evidence Matrix</div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 30%;">Tender Requirement</th>
          <th style="width: 20%;">Bidder Evidence</th>
          <th style="width: 15%;">Evaluation</th>
          <th style="width: 30%;">Analysis &amp; Reason</th>
        </tr>
      </thead>
      <tbody>
        {req_rows}
      </tbody>
    </table>

    <!-- Cross-Document Integrity & Contradictions -->
    <div class="section-title">Document Integrity &amp; Anomaly Signals</div>
    <div>
      {contra_items}
    </div>

    <!-- Officer Final Decision & Overrides -->
    <div class="section-title">Procurement Officer Review &amp; Formal Decision</div>
    <div class="card" style="background: #FAF5FF; border-color: #E9D5FF;">
      <p><strong>Final Qualification Status:</strong> <span style="font-size: 14px; font-weight: 700; color: #6B21A8;">{escape(decision)}</span></p>
      <p><strong>Override Justification (if divergent from AI):</strong> {override_reason}</p>
      <p><strong>Official Evaluation Notes:</strong> {notes}</p>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div><strong>ComplyGeM AI &bull; Smart India Hackathon (SIH 2026) Prototype</strong></div>
    <div>System Timestamp: {now_str} | Audit Trace ID: CG-AUD-{audit_id or 'OFFLINE'}</div>
    <div><em>Notice: Government portal registries (GSTN, Udyam, MCA21, EPFO, ESIC, DigiLocker) are validated through the sandbox simulation layer.</em></div>
  </div>
</div>

</body>
</html>"""
