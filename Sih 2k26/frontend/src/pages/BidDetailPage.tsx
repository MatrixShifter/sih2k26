import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Download,
  ExternalLink,
  FileText,
  Sparkles,
  ShieldCheck,
  FileCheck,
  Send,
  History,
  Scale,
  Building2,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Cpu,
  Layers,
  HelpCircle,
  ShieldAlert,
  FileSearch,
} from "lucide-react";
import { api, ApiError } from "../services/api";
import type { AuditLog, BidDetail, DocumentRecord, DocumentType, RequirementResult } from "../types";
import { EvidenceViewerModal } from "../components/EvidenceViewerModal";
import {
  DOCUMENT_LABELS,
  formatDate,
  formatDateTime,
  inr,
} from "../lib/format";
import { RiskBadge, StatusBadge } from "../components/RiskBadge";
import { ScoreGauge } from "../components/ScoreGauge";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../auth";

type ActiveTab = "scoring" | "evidence" | "documents" | "assistant" | "audit";

export function BidDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bid, setBid] = useState<BidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("scoring");
  
  // Verification action
  const [verifying, setVerifying] = useState(false);
  const [selectedEvidenceReq, setSelectedEvidenceReq] = useState<RequirementResult | null>(null);

  // Decision Modal / Form State
  const getDefaultNotes = (type: "approved" | "rejected" | "clarification") => {
    switch (type) {
      case "approved":
        return "All mandatory ATC eligibility criteria, statutory tax filings (GSTN/CBDT), and ISO certifications verified authentic. Vendor is recommended for technical qualification under GFR Rule 173.";
      case "rejected":
        return "Discrepancies identified in statutory documentation and mandatory turnover threshold requirements not satisfied per GeM ATC criteria.";
      case "clarification":
        return "Vendor requested to submit updated ISO 13485 audit certificate and clarification on financial turnover computation for FY 2024-25 within 7 working days.";
    }
  };

  const defaultOverrideReason = "Decision verified by procurement officer against original repository artefacts under Rule 173 GFR 2017.";

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<"approved" | "rejected" | "clarification">("approved");
  const [notes, setNotes] = useState(getDefaultNotes("approved"));
  const [overrideReason, setOverrideReason] = useState(defaultOverrideReason);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Assistant Chat State
  const [question, setQuestion] = useState("");
  const [askingAssistant, setAskingAssistant] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; grounded?: boolean; time: string }>
  >([]);

  // Audit Logs State
  const [audit, setAudit] = useState<AuditLog[]>([]);

  // Expanded evidence payloads
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [nextBid, nextAudit] = await Promise.all([
        api.getBid(Number(id)),
        api.bidAudit(Number(id)),
      ]);
      setBid(nextBid);
      setAudit(nextAudit.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bid not found");
      setBid(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runVerification() {
    if (!bid) return;
    setVerifying(true);
    try {
      await api.verifyBid(bid.id);
      toast.success("AI Verification completed successfully!");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function submitDecision(e: FormEvent) {
    e.preventDefault();
    if (!bid) return;
    if (notes.trim().length < 5) {
      toast.error("Please enter comprehensive decision notes (min 5 chars).");
      return;
    }
    setSubmittingDecision(true);
    try {
      const updated = await api.decideBid(
        bid.id,
        decisionType,
        notes.trim(),
        overrideReason.trim() || undefined
      );
      setBid(updated);
      toast.success(`Decision successfully recorded: ${decisionType.toUpperCase()}`);
      setShowDecisionModal(false);
      setNotes("");
      setOverrideReason("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to record officer decision");
    } finally {
      setSubmittingDecision(false);
    }
  }

  async function askQuestion(promptText?: string) {
    const q = promptText || question;
    if (!q.trim() || !bid) return;

    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { sender: "user", text: q, time: timeStr }]);
    if (!promptText) setQuestion("");
    setAskingAssistant(true);

    try {
      const res = await api.assistant(bid.id, q);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.answer,
          grounded: res.grounded,
          time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      toast.error("Assistant request failed");
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Unable to retrieve response. Please verify this bid packet first.",
          grounded: false,
          time: timeStr,
        },
      ]);
    } finally {
      setAskingAssistant(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading bid">
        <Skeleton className="h-10 w-80 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!bid) {
    return (
      <EmptyState
        title="Bid packet not found"
        detail="The requested GeM bid application might have been retracted or access is restricted."
      />
    );
  }

  const check = bid.latest_check;
  const isOfficer = user?.role === "officer";

  // Needs override reason check:
  const requiresOverride =
    check &&
    ((decisionType === "approved" && check.recommendation !== "approve") ||
      (decisionType === "rejected" && check.recommendation !== "reject") ||
      (decisionType === "clarification" && check.recommendation !== "request_clarification"));

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <Link
            to={isOfficer ? "/officer/dashboard" : "/bidder/dashboard"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Workbench</span>
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {bid.reference_code}
            </h1>
            <button
              type="button"
              onClick={() => copyToClipboard(bid.reference_code)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition"
              title="Copy bid reference"
            >
              {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <StatusBadge value={bid.status} />
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                bid.verification_status === "verified"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {bid.verification_status === "verified" ? "● AI Verified" : "○ Verification Pending"}
            </span>
          </div>

          <p className="mt-1 text-sm font-medium text-slate-600">
            {bid.tender.title} · <span className="text-slate-500 font-normal">{bid.tender.department}</span>
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Official Inspection Certificate */}
          <a
            href={`/api/bids/${bid.id}/report`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            <span>View Audit Report</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>

          {/* Trigger AI Verification */}
          <button
            type="button"
            disabled={verifying}
            onClick={() => void runVerification()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 transition"
          >
            {verifying ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Running Checks…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-teal-200" />
                <span>Run AI Verification</span>
              </>
            )}
          </button>

          {/* Officer Decision Trigger */}
          {isOfficer && (
            <button
              type="button"
              onClick={() => {
                const defaultType: "approved" | "rejected" | "clarification" =
                  check?.recommendation === "reject"
                    ? "rejected"
                    : check?.recommendation === "request_clarification"
                    ? "clarification"
                    : "approved";
                setDecisionType(defaultType);
                setNotes(getDefaultNotes(defaultType));
                setOverrideReason(defaultOverrideReason);
                setShowDecisionModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
            >
              <Scale className="h-3.5 w-3.5 text-teal-400" />
              <span>Record Decision</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Banner: Score, AI Recommendation & Key Entity Details */}
      <div className="grid gap-4 sm:grid-cols-12">
        {/* Score & Risk Card */}
        <div className="sm:col-span-4 rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col items-center justify-center text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Overall Compliance Score
          </p>
          {check ? (
            <>
              <ScoreGauge score={Number(check.overall_score)} size={160} />
              <div className="mt-2 flex items-center gap-2">
                <RiskBadge level={check.risk_level} />
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Confidence: {Math.round(Number(check.confidence))}%
                </span>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-2">
              <Clock className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Not verified yet.</p>
              <button
                type="button"
                onClick={() => void runVerification()}
                className="text-xs font-semibold text-teal-600 hover:underline"
              >
                Run verification now
              </button>
            </div>
          )}
        </div>

        {/* AI Recommendation & Summary */}
        <div className="sm:col-span-8 rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  AI Recommendation & Summary
                </h3>
              </div>
              {check && (
                <span
                  className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full border ${
                    check.recommendation === "approve"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : check.recommendation === "reject"
                      ? "bg-rose-50 text-rose-800 border-rose-300"
                      : "bg-amber-50 text-amber-900 border-amber-300"
                  }`}
                >
                  {check.recommendation.replace("_", " ")}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {check?.summary ||
                "Run simulated verification to parse document OCR, match against simulated registry portals, and calculate compliance."}
            </p>

            {/* Contradiction / Anomaly warning pill */}
            {check && check.contradictions && check.contradictions.length > 0 && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-900">
                <AlertOctagon className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <span className="font-bold">Contradiction Detected: </span>
                  {check.contradictions[0].note} (Field: {check.contradictions[0].field})
                </div>
              </div>
            )}
          </div>

          {/* Quick Bidder Info strip */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block">Bidder</span>
              <span className="font-semibold text-slate-800 truncate block">{bid.bidder.legal_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block">PAN Number</span>
              <span className="font-mono font-semibold text-slate-800">{bid.bidder.pan || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">GSTIN</span>
              <span className="font-mono font-semibold text-slate-800 truncate block">{bid.bidder.gstin || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Udyam MSME</span>
              <span className="font-mono font-semibold text-slate-800 truncate block">{bid.bidder.udyam_number || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Interactive Tabbed Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
          {[
            { id: "scoring", label: "AI Scoring & Audit Breakdown", icon: Sparkles },
            { id: "evidence", label: `Portal Evidence (${bid.verification_results?.length || 0})`, icon: ShieldCheck },
            { id: "documents", label: `Artefacts (${bid.documents?.length || 0})`, icon: FileCheck },
            { id: "assistant", label: "Grounded AI Assistant", icon: Bot },
            { id: "audit", label: `Audit Trail (${audit?.length || 0})`, icon: History },
          ].map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId as ActiveTab)}
              className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tabId
                  ? "border-teal-600 text-teal-800 bg-teal-50/50 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: AI Scoring & Breakdown */}
      {activeTab === "scoring" && (
        <div className="space-y-5">
          {check ? (
            <>
              {/* Detailed Points Attribution Table */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  Transparent Scoring Matrix & Point Attributions
                </h3>

                {check.score_breakdown?.lines && check.score_breakdown.lines.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {check.score_breakdown.lines.map((line, idx) => {
                      const isDeduction = line.includes("+0") || line.toLowerCase().includes("fail") || line.toLowerCase().includes("missing");
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium ${
                            isDeduction
                              ? "border-rose-100 bg-rose-50/50 text-rose-900"
                              : "border-emerald-100 bg-emerald-50/40 text-emerald-900"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isDeduction ? (
                              <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                            <span>{line.split("+")[0].trim()}</span>
                          </div>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded ${
                              isDeduction ? "bg-rose-200/60 text-rose-900" : "bg-emerald-200/60 text-emerald-900"
                            }`}
                          >
                            +{line.split("+")[1]?.trim() || "0"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Breakdown lines unavailable.</p>
                )}
              </div>

              {/* Tender ATC Requirements Verification Table */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-2 border-b border-slate-100 gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-teal-600" />
                    Tender-Specific Compliance Rule Checklist ({check.requirement_results?.length || 0})
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {check.requirement_results?.filter((r) => r.status === "PASS").length || 0} Passed
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <XCircle className="h-3.5 w-3.5" />
                      {check.requirement_results?.filter((r) => r.status === "FAIL" || r.status === "NOT_EVALUATED").length || 0} Failed / Gaps
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="p-3">Rule / Requirement</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Expected Value</th>
                        <th className="p-3">Extracted Value</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Evidence Source</th>
                        <th className="p-3">Audit Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(check.requirement_results || []).map((req, i) => {
                        const isPass = req.status === "PASS" || req.status === "COMPLIANT";
                        const isFail = req.status === "FAIL" || req.status === "NON-COMPLIANT" || req.status === "EXPIRED" || req.status === "NOT_EVALUATED" || req.status === "MISSING";
                        const isReview = req.status === "NEEDS_REVIEW" || req.status === "NEEDS REVIEW" || req.status === "PARTIAL";

                        return (
                          <tr key={i} className="hover:bg-slate-50/60 transition">
                            <td className="p-3 max-w-xs">
                              <div className="font-semibold text-slate-900">{req.title || req.requirement}</div>
                              {req.title && req.title !== req.requirement && (
                                <div className="text-[11px] text-slate-500 font-normal mt-0.5">{req.requirement}</div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                {req.mandatory ? (
                                  <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                    MANDATORY
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[9px] font-medium">
                                    OPTIONAL
                                  </span>
                                )}
                                {req.weight !== undefined && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Wt: {req.weight} pts
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3">
                              <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] uppercase">
                                {req.category}
                              </span>
                            </td>

                            <td className="p-3 font-mono text-slate-700">
                              <div className="font-medium">{req.expected_value_display || req.required_value || "—"}</div>
                              {req.comparison_operator && (
                                <span className="text-[10px] text-slate-400">Rule: {req.comparison_operator}</span>
                              )}
                            </td>

                            <td className="p-3 font-mono">
                              <div className={`font-semibold ${isPass ? "text-emerald-800" : isFail ? "text-rose-800" : "text-amber-800"}`}>
                                {req.extracted_value_display || (req.extracted_values ? JSON.stringify(req.extracted_values).slice(0, 35) : "—")}
                              </div>
                            </td>

                            <td className="p-3">
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] tracking-wide inline-flex items-center gap-1 ${
                                    isPass
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : isFail
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                                  }`}
                                >
                                  {isPass && <CheckCircle2 className="h-3 w-3" />}
                                  {isFail && <XCircle className="h-3 w-3" />}
                                  {isReview && <AlertTriangle className="h-3 w-3" />}
                                  <span>{req.status}</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => setSelectedEvidenceReq(req)}
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border transition shadow-sm cursor-pointer ${
                                    isPass
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400"
                                      : isFail
                                      ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 hover:border-rose-400"
                                      : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
                                  }`}
                                  title="Open explainable evidence inspector for this requirement"
                                >
                                  <FileSearch className="h-2.5 w-2.5" />
                                  <span>{isPass ? "Why PASS?" : isFail ? "Why FAIL?" : "Why NEEDS REVIEW?"}</span>
                                </button>
                              </div>
                            </td>

                            <td className="p-3 text-slate-600 max-w-xs">
                              {req.source_document ? (
                                <div className="space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (req.source_document_id) {
                                        window.open(`/api/documents/${req.source_document_id}/file`, "_blank");
                                      } else {
                                        setActiveTab("documents");
                                      }
                                    }}
                                    className="font-semibold text-teal-700 hover:text-teal-900 text-[11px] truncate flex items-center gap-1 group text-left cursor-pointer transition underline decoration-teal-300 hover:decoration-teal-600"
                                    title="Click to view & download verified evidence artefact"
                                  >
                                    <FileCheck className="h-3 w-3 shrink-0 text-teal-600 group-hover:scale-110 transition" />
                                    <span className="truncate">{req.source_document}</span>
                                    <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
                                  </button>
                                  <div className="text-[10px] text-slate-400">
                                    {req.source_section || "Verified OCR"} {req.source_page ? `(p. ${req.source_page})` : ""}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No artefact attached</span>
                              )}
                            </td>

                            <td className="p-3 text-slate-700 max-w-sm">
                              <div className="leading-snug">{req.explanation || req.reason}</div>
                              {req.confidence !== undefined && (
                                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                  AI Confidence: {req.confidence}%
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Risk Factors & Discrepancies */}
              {check.risk_factors && check.risk_factors.length > 0 && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-xs">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Identified Risk Factors ({check.risk_factors.length})
                  </h3>
                  <div className="space-y-2">
                    {check.risk_factors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-amber-200/60 text-xs"
                      >
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] shrink-0 ${
                            factor.severity === "HIGH"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {factor.severity}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800">{factor.code}: </span>
                          <span className="text-slate-600">{factor.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Verification has not been executed yet.</p>
              <p className="text-xs text-slate-500 mt-1">Run AI Verification to calculate eligibility scores.</p>
              <button
                type="button"
                onClick={() => void runVerification()}
                className="mt-4 rounded-xl bg-teal-600 text-white px-4 py-2 text-xs font-bold hover:bg-teal-700 transition"
              >
                Run Verification
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Government Portal Registry Evidence */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Simulated registry checks cross-validate bidder identifiers against official government portal databases.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(bid.verification_results || []).map((result) => {
              const isPass = result.status.toLowerCase() === "pass";
              const isFail = result.status.toLowerCase() === "fail";
              const isExpanded = expandedCheck === result.check_key;

              return (
                <div
                  key={result.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {result.source}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isPass
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isFail
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 capitalize mb-1">
                      {result.check_key} Verification
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{result.summary}</p>
                  </div>

                  {result.payload && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setExpandedCheck(isExpanded ? null : result.check_key)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
                      >
                        <span>{isExpanded ? "Hide raw payload" : "View portal payload"}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-900 p-2 text-[10px] font-mono text-teal-300">
                          {JSON.stringify(result.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Submitted Artefacts (Documents) */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Artifacts uploaded by the bidder. Each document is checked for OCR field validity and tampering.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bid.documents.map((doc) => {
              const label = DOCUMENT_LABELS[doc.document_type] || doc.document_type;
              const isClean = doc.integrity_status === "clean" || doc.integrity_status === "verified";
              const isExpiring = doc.expiry_state === "expiring_soon";
              const isExpired = doc.expiry_state === "expired";

              return (
                <div
                  key={doc.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between hover:shadow-sm transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">{label}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isClean
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {isClean ? "✓ Tamper-Free" : "⚠ Anomaly Flagged"}
                      </span>
                    </div>

                    <p className="font-mono text-[11px] text-slate-500 truncate mb-2">{doc.original_filename}</p>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between items-center font-mono text-[10px]">
                        <span className="text-slate-400 font-sans">Version & Size:</span>
                        <span>v{doc.version || 1} &bull; {Math.round(doc.file_size_bytes / 1024)} KB</span>
                      </div>
                      {doc.sha256_hash && (
                        <div className="flex justify-between items-center font-mono text-[10px] bg-slate-50 p-1.5 rounded border border-slate-100">
                          <span className="text-slate-400 font-sans text-[9px] uppercase font-bold">SHA-256:</span>
                          <span className="text-slate-700 truncate max-w-[140px]">{doc.sha256_hash.slice(0, 12)}...</span>
                        </div>
                      )}
                      {doc.validation_results?.status && (
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                          <span className="text-slate-400">Rule Validation:</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              doc.validation_results.status === "PASS"
                                ? "bg-emerald-100 text-emerald-800"
                                : doc.validation_results.status === "FAIL"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {doc.validation_results.status} ({doc.validation_results.confidence}%)
                          </span>
                        </div>
                      )}
                      {doc.expiry_date && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Expiry date:</span>
                          <span
                            className={
                              isExpired
                                ? "text-rose-600 font-bold"
                                : isExpiring
                                ? "text-amber-600 font-bold"
                                : "text-slate-700"
                            }
                          >
                            {formatDate(doc.expiry_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Uploaded {formatDate(doc.created_at)}
                    </span>
                    <a
                      href={`/api/documents/${doc.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Grounded AI Assistant */}
      {activeTab === "assistant" && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-teal-500/20 p-2 text-teal-600">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bid Packet AI Assistant</h3>
                <p className="text-xs text-slate-500">
                  Grounded strictly in this bid packet’s evidence and verification data.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
              Anti-Hallucination Guardrail Active
            </span>
          </div>

          {/* Quick preset questions */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Suggested Inquiries:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Why did this bidder score this?",
                "Which mandatory requirements failed or are missing?",
                "Are there any cross-document contradictions?",
                "What should the officer manually verify?",
                "Summarize overall compliance status",
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void askQuestion(p)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Chat transcript */}
          <div className="min-h-56 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <Bot className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                Select a suggested question above or enter a question about this bid below.
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-xl rounded-xl px-4 py-2.5 text-xs ${
                      msg.sender === "user"
                        ? "bg-[#0F172A] text-white rounded-br-none"
                        : "bg-white border border-slate-200/80 text-slate-800 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.sender === "ai" && (
                      <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1 text-[10px] text-slate-400">
                        <span>{msg.grounded ? "✓ Evidence Grounded" : "⚠ Informational"}</span>
                        <span>{msg.time}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {askingAssistant && (
              <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-600" />
                <span>Consulting bid records…</span>
              </div>
            )}
          </div>

          {/* Input box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askQuestion();
            }}
            className="flex items-center gap-2"
          >
            <input
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
              placeholder="Ask anything about eligibility, score lines, contradictions, or certifications…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              type="submit"
              disabled={askingAssistant || !question.trim()}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: Audit Trail */}
      {activeTab === "audit" && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Tamper-Evident Bid History & Audit Log
            </h3>
            <span className="text-xs text-slate-500 font-medium">{audit.length} total events</span>
          </div>

          {audit.length > 0 ? (
            <ol className="relative border-l border-slate-200 ml-3 space-y-4">
              {audit.map((log) => (
                <li key={log.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-teal-500" />
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {log.actor_role || "SYSTEM"}
                    </span>
                    <time className="text-[11px] text-slate-400 ml-auto">
                      {formatDateTime(log.created_at)}
                    </time>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{log.detail}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">No audit trail records found.</p>
          )}
        </div>
      )}

      {/* Officer Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-teal-600" />
                <h3 className="font-sans text-lg font-bold text-slate-900">Record Procurement Decision</h3>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                onClick={() => setShowDecisionModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Decision Action</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["approved", "Approve Bid", "border-emerald-500 bg-emerald-50 text-emerald-800"],
                      ["clarification", "Request Clarify", "border-amber-500 bg-amber-50 text-amber-800"],
                      ["rejected", "Reject Packet", "border-rose-500 bg-rose-50 text-rose-800"],
                    ] as const
                  ).map(([type, label, activeCls]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setDecisionType(type);
                        setNotes(getDefaultNotes(type));
                      }}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                        decisionType === type
                          ? activeCls
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning if overriding AI recommendation */}
              {requiresOverride && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Officer Override Notice</span>
                  </div>
                  <p>
                    The AI recommended <strong>{check?.recommendation?.toUpperCase()}</strong>. Since your decision differs,
                    you must supply a justifiable override reason for GeM audit records.
                  </p>
                </div>
              )}

              {requiresOverride && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Override Justification (Required)
                  </label>
                  <input
                    required
                    placeholder="e.g. Officer physical verification confirmed original MSME copy on file."
                    className="w-full rounded-xl border border-amber-300 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Decision Notes (Visible in Audit Trail)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize evaluation findings, ATC clause review, and final order…"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={() => setShowDecisionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className="rounded-xl bg-[#0F172A] px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {submittingDecision ? "Recording…" : "Confirm Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPLAINABLE EVIDENCE VIEWER MODAL */}
      {selectedEvidenceReq && (
        <EvidenceViewerModal
          requirement={selectedEvidenceReq}
          bidReference={bid.reference_code}
          bidderLegalName={bid.bidder?.legal_name}
          onClose={() => setSelectedEvidenceReq(null)}
        />
      )}
    </div>
  );
}

