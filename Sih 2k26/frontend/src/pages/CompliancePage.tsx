import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  Edit3,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileText,
  Building,
  Calendar,
  Sparkles,
  Download,
  Printer,
  Check,
  X,
  Bot,
  Send,
  MessageSquare,
  ArrowRight,
  Info,
  FileSearch,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import type { BidDetail, RequirementResult } from "../types";
import { EvidenceViewerModal } from "../components/EvidenceViewerModal";
import { formatCurrency, formatDate } from "../lib/format";
import { ScoreGauge } from "../components/ScoreGauge";
import { RiskBadge } from "../components/RiskBadge";

export function CompliancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bids, setBids] = useState<any[]>([]);
  const [selectedBidId, setSelectedBidId] = useState<number | null>(null);
  const [bidDetail, setBidDetail] = useState<BidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reverifying, setReverifying] = useState(false);

  // Filter by category or status in matrix
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedReqs, setExpandedReqs] = useState<Record<number, boolean>>({});

  // Manual Officer Override Modal
  const [overrideTarget, setOverrideTarget] = useState<RequirementResult | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("COMPLIANT");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Explainable Evidence Modal
  const [selectedEvidenceReq, setSelectedEvidenceReq] = useState<RequirementResult | null>(null);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Grounded AI Assistant Drawer
  const [showChat, setShowChat] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string; grounded?: boolean }[]>([
    {
      role: "ai",
      text: "Hello, Officer. I am ComplyGeM AI Assistant. Ask any compliance question grounded in this bid's submitted documents, portal records, and ATC tender requirements.",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadBids();
  }, []);

  useEffect(() => {
    const bidIdParam = searchParams.get("bid_id");
    if (bidIdParam && !isNaN(Number(bidIdParam))) {
      setSelectedBidId(Number(bidIdParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedBidId) {
      loadBidDetail(selectedBidId);
    }
  }, [selectedBidId]);

  async function loadBids() {
    try {
      setLoading(true);
      const res = await api.listBids({});
      setBids(res.items);
      const targetParam = searchParams.get("bid_id");
      if (targetParam) {
        setSelectedBidId(Number(targetParam));
      } else if (res.items.length > 0) {
        setSelectedBidId(res.items[0].id);
      }
    } catch (err) {
      toast.error("Failed to load bid applications");
    } finally {
      setLoading(false);
    }
  }

  async function loadBidDetail(id: number) {
    try {
      setLoading(true);
      const detail = await api.getBid(id);
      setBidDetail(detail);
      // Expand all failing/missing requirements by default for immediate officer attention
      const initialExpanded: Record<number, boolean> = {};
      const results = (detail.latest_check?.requirement_results || (detail as any).compliance_check?.requirement_results || []) as RequirementResult[];
      results.forEach((r: RequirementResult) => {
        const s = (r.comparison_result || r.status || "").toUpperCase();
        if (s !== "COMPLIANT" && s !== "PASS") {
          initialExpanded[r.requirement_id] = true;
        }
      });
      setExpandedReqs(initialExpanded);
    } catch (err) {
      toast.error("Failed to load bid compliance details");
    } finally {
      setLoading(false);
    }
  }

  async function handleReverify() {
    if (!selectedBidId) return;
    try {
      setReverifying(true);
      toast.loading("Executing rule compliance engine...", { id: "rev" });
      await api.verifyBid(selectedBidId);
      toast.success("Compliance analysis recalculated", { id: "rev" });
      await loadBidDetail(selectedBidId);
    } catch (err: any) {
      toast.error(err?.message || "Verification failed", { id: "rev" });
    } finally {
      setReverifying(false);
    }
  }

  async function handleOverrideSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBidId || !overrideTarget || !overrideReason.trim()) {
      toast.error("An officer override reason is strictly mandatory");
      return;
    }

    try {
      setSubmittingOverride(true);
      await api.overrideRequirement(
        selectedBidId,
        overrideTarget.requirement_id,
        overrideStatus,
        overrideReason.trim(),
        overrideNotes.trim() || undefined
      );
      toast.success(`Requirement #${overrideTarget.requirement_id} overridden to ${overrideStatus}`);
      setOverrideTarget(null);
      setOverrideReason("");
      setOverrideNotes("");
      await loadBidDetail(selectedBidId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to record override");
    } finally {
      setSubmittingOverride(false);
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBidId || !chatQuestion.trim()) return;

    const q = chatQuestion.trim();
    setChatQuestion("");
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);

    try {
      const res = await api.assistant(selectedBidId, q);
      setChatHistory((prev) => [...prev, { role: "ai", text: res.answer, grounded: res.grounded }]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "Unable to complete query. Please check evidence documents manually." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const check = bidDetail?.latest_check || (bidDetail as any)?.compliance_check;
  const reqResults: RequirementResult[] = ((check?.requirement_results || []) as unknown) as RequirementResult[];

  const filteredRequirements = reqResults.filter((r: RequirementResult) => {
    const s = (r.comparison_result || r.status || "").toUpperCase();
    if (statusFilter === "all") return true;
    if (statusFilter === "compliant") return s === "COMPLIANT" || s === "PASS";
    if (statusFilter === "non-compliant") return s === "NON-COMPLIANT" || s === "FAIL" || s === "EXPIRED" || s === "MISMATCH";
    if (statusFilter === "missing") return s === "MISSING";
    if (statusFilter === "needs_review") return s === "NEEDS REVIEW" || s === "PARTIAL";
    return true;
  });

  const compliantCount = reqResults.filter((r: RequirementResult) => (r.comparison_result || r.status || "").toUpperCase() === "COMPLIANT").length;
  const nonCompliantCount = reqResults.filter((r: RequirementResult) => ["NON-COMPLIANT", "FAIL", "EXPIRED", "MISMATCH"].includes((r.comparison_result || r.status || "").toUpperCase())).length;
  const missingCount = reqResults.filter((r: RequirementResult) => (r.comparison_result || r.status || "").toUpperCase() === "MISSING").length;

  return (
    <div className="space-y-6">
      {/* Top Banner Disclaimer */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-3.5 text-xs text-amber-900 shadow-xs">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
        <div className="flex-1">
          <span className="font-semibold uppercase tracking-wide">Procurement Decision Support:</span>{" "}
          AI-assisted compliance analysis. Final qualification decision remains with the procurement officer.
        </div>
      </div>

      {/* Top Selector Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Evaluating Packet:</span>
          </div>
          <select
            value={selectedBidId || ""}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSelectedBidId(val);
              setSearchParams({ bid_id: String(val) });
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-teal-500 focus:outline-none min-w-[280px]"
          >
            {bids.map((b) => (
              <option key={b.id} value={b.id}>
                {b.reference_code} &mdash; {b.bidder_legal_name} ({b.gem_bid_number})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReverify}
            disabled={reverifying}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span>{reverifying ? "Evaluating..." : "Re-run Rules"}</span>
          </button>

          <a
            href={selectedBidId ? api.documentUrl(selectedBidId) : "#"}
            onClick={(e) => {
              e.preventDefault();
              if (selectedBidId) window.open(`http://localhost:8000/api/bids/${selectedBidId}/report`, "_blank");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print Report</span>
          </a>

          <button
            type="button"
            onClick={() => setShowChat(!showChat)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <Bot className="h-4 w-4 text-teal-400" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Tender & Bidder Header Overview */}
      {bidDetail && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-mono font-bold text-teal-700 border border-teal-200">
                    {bidDetail.tender.gem_bid_number}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Application: {bidDetail.reference_code}</span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-slate-900 leading-snug">{bidDetail.tender.title}</h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {bidDetail.tender.department} &bull; Est. Value: {formatCurrency(bidDetail.tender.estimated_value_inr)}
                </p>
              </div>

              <div className="text-right">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-700">
                  {bidDetail.status}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Due {formatDate(bidDetail.tender.closing_date)}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bidding Entity</span>
                <span className="font-bold text-slate-900 truncate block">{bidDetail.bidder.legal_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">PAN / GSTIN</span>
                <span className="font-mono text-slate-800">{bidDetail.bidder.pan} / {bidDetail.bidder.gstin?.slice(0, 10)}...</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Udyam Status</span>
                <span className="font-mono text-teal-700 font-bold">{bidDetail.bidder.udyam_number || "Not Furnished"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Turnover / Exp</span>
                <span className="font-bold text-slate-900">{formatCurrency(bidDetail.bidder.annual_turnover_inr || 0)} &bull; {bidDetail.bidder.years_experience}y</span>
              </div>
            </div>
          </div>

          {/* Score & Recommendation Widget */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Compliance Score</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-extrabold font-mono text-slate-900">
                    {check ? Number(check.overall_score).toFixed(0) : "—"}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">/ 100</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Risk Level</p>
                <div className="mt-1">
                  {check?.risk_level ? <RiskBadge risk={check.risk_level} /> : "—"}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-600 mb-1">AI Recommendation:</div>
              <div
                className={`p-2 rounded-lg text-xs font-bold uppercase text-center ${
                  check?.recommendation === "approve"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : check?.recommendation === "reject"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {check?.recommendation?.replace("_", " ") || "Verification Pending"}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                {check?.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Criteria ({reqResults.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("compliant")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "compliant" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            Compliant ({compliantCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("non-compliant")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "non-compliant" ? "bg-rose-600 text-white" : "text-rose-700 hover:bg-rose-50"
            }`}
          >
            Non-Compliant ({nonCompliantCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("missing")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "missing" ? "bg-slate-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Missing ({missingCount})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono font-medium">
          Scoring Model: Weighted Satisfied / Total Weighted Criteria
        </div>
      </div>

      {/* SIDE-BY-SIDE COMPLIANCE MATRIX */}
      <div className="space-y-4">
        {filteredRequirements.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            No requirements match this status filter.
          </div>
        ) : (
          filteredRequirements.map((req: RequirementResult) => {
            const rawStatus = (req.comparison_result || req.status).toUpperCase();
            const isCompliant = rawStatus === "COMPLIANT" || rawStatus === "PASS";
            const isNonCompliant = rawStatus === "NON-COMPLIANT" || rawStatus === "FAIL";
            const isExpired = rawStatus === "EXPIRED";
            const isMismatch = rawStatus === "MISMATCH";
            const isMissing = rawStatus === "MISSING";
            const isOverridden = req.reviewer_status === "OVERRIDDEN";

            const isExpanded = !!expandedReqs[req.requirement_id];

            return (
              <div
                key={req.requirement_id}
                className={`rounded-xl border bg-white shadow-xs transition overflow-hidden ${
                  isCompliant
                    ? "border-emerald-200/80"
                    : isExpired || isNonCompliant
                    ? "border-rose-300"
                    : isMismatch
                    ? "border-amber-300"
                    : "border-slate-200"
                }`}
              >
                {/* Matrix Header Row */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-slate-50/50">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 border border-slate-200">
                        {req.category}
                      </span>
                      {req.mandatory && (
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          Mandatory
                        </span>
                      )}
                      {isOverridden && (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800 border border-purple-300 animate-pulse">
                          Officer Overridden
                        </span>
                      )}
                      <span className="text-slate-400 text-xs font-mono">Req #{req.requirement_id}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {req.requirement_text || req.requirement}
                    </h3>
                  </div>

                  {/* Status Pill & Override CTA */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide uppercase ${
                            isCompliant
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : isExpired || isNonCompliant
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : isMismatch
                              ? "bg-orange-100 text-orange-800 border border-orange-300"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {isCompliant ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : isExpired || isNonCompliant ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          <span>{req.comparison_result || req.status}</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        Confidence: {req.confidence}% &bull; Risk: {req.risk || "MEDIUM"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedEvidenceReq(req)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition shadow-sm cursor-pointer ${
                        isCompliant
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400"
                          : isExpired || isNonCompliant
                          ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 hover:border-rose-400"
                          : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
                      }`}
                      title="Open explainable evidence panel for this requirement"
                    >
                      <FileSearch className="h-3.5 w-3.5" />
                      <span>{isCompliant ? "Why PASS?" : isExpired || isNonCompliant ? "Why FAIL?" : "Why NEEDS REVIEW?"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOverrideTarget(req);
                        setOverrideStatus(isCompliant ? "NON-COMPLIANT" : "COMPLIANT");
                        setOverrideReason("");
                        setOverrideNotes("");
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm cursor-pointer"
                      title="Manually override AI evaluation outcome"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-purple-600" />
                      <span>Review / Override</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReqs((prev) => ({
                          ...prev,
                          [req.requirement_id]: !prev[req.requirement_id],
                        }))
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Comparison Columns */}
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Required Criterion */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                      1. Required Evidence & Benchmark
                    </span>
                    <p className="font-semibold text-slate-800">{req.required_evidence || req.evidence}</p>
                    {req.expected_values && Object.keys(req.expected_values).length > 0 && (
                      <div className="rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-700 border border-slate-100">
                        {Object.entries(req.expected_values).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-slate-400">{k}:</span> {String(v)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 2: Bidder Supplied Evidence */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                      2. Bidder Artefact & OCR Extraction
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate block max-w-[180px]">
                        {req.bidder_evidence || req.source_document || "No document uploaded"}
                      </span>
                      {req.source_document_id && (
                        <button
                          type="button"
                          onClick={() => {
                            const found = bidDetail?.documents.find((d) => d.id === req.source_document_id);
                            if (found) setPreviewDoc(found);
                          }}
                          className="text-[11px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-0.5"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                    {req.extracted_values && Object.keys(req.extracted_values).length > 0 && (
                      <div className="rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-700 border border-slate-100">
                        {Object.entries(req.extracted_values).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-slate-400">{k}:</span> {String(v)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Comparison Analysis */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                      3. Verification Status & Verdict
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {req.verification_status || "VERIFIED"}
                      </span>
                      <span className="text-slate-400 text-[11px]">&bull;</span>
                      <span className="font-bold text-slate-900">{req.comparison_result || req.status}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {req.explanation || req.reason}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedEvidenceReq(req)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 transition pt-1 cursor-pointer"
                    >
                      <FileSearch className="h-3 w-3 text-teal-600" />
                      <span>{isCompliant ? "Why PASS? (Inspect Evidence)" : isExpired || isNonCompliant ? "Why FAIL? (Inspect Evidence)" : "Why NEEDS REVIEW? (Inspect Evidence)"}</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Explainability Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-100/50 p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-teal-600" />
                      Explainable Rule Engine Reasoning
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <strong className="text-slate-700 block mb-1">What did the compliance engine check?</strong>
                        <p className="text-slate-600">
                          Evaluated bidder entity profile against requirement criteria #{req.requirement_id}. Extracted
                          OCR parameters verified against government registry sandbox simulation.
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <strong className="text-slate-700 block mb-1">Why was this verdict rendered?</strong>
                        <p className="text-slate-600">
                          {req.explanation || req.reason}
                        </p>
                      </div>
                    </div>

                    {req.officer_override && (
                      <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-xs text-purple-900">
                        <strong className="block font-bold mb-0.5">
                          Officer Manual Override Recorded:
                        </strong>
                        <p>
                          Status changed from <strong>{req.officer_override.previous_status}</strong> to{" "}
                          <strong>{req.officer_override.new_status}</strong> by{" "}
                          <em>{req.officer_override.officer_name || "Procurement Officer"}</em>.
                        </p>
                        <p className="mt-1 font-mono text-[11px]">
                          <strong>Justification Reason:</strong> {req.officer_override.reason}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MANUAL OVERRIDE MODAL */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">
                  Mandatory Audit Logged Action
                </span>
                <h2 className="text-lg font-bold text-slate-900">Officer Manual Override</h2>
              </div>
              <button
                onClick={() => setOverrideTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">Target Requirement</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  #{overrideTarget.requirement_id}: {overrideTarget.requirement_text || overrideTarget.requirement}
                </p>
                <div className="mt-2 flex items-center gap-2 text-slate-600">
                  <span>Current AI Verdict:</span>
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                    {overrideTarget.comparison_result || overrideTarget.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Overridden Status *</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold focus:border-purple-500 focus:outline-none"
                >
                  <option value="COMPLIANT">COMPLIANT (Satisfied)</option>
                  <option value="NON-COMPLIANT">NON-COMPLIANT (Disqualified)</option>
                  <option value="NEEDS REVIEW">NEEDS REVIEW (Seek Clarification)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Officer Justification Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Original physical notarized affidavit and bank guarantee certificate verified in person at district procurement cell..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  This explanation will be immutably recorded in the tamper-evident audit trail and final evaluation report.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Officer Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Reference file dispatched to vigilance directorate"
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOverrideTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride || !overrideReason.trim()}
                  className="rounded-lg bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-800 disabled:opacity-50 transition"
                >
                  {submittingOverride ? "Recording Audit..." : "Confirm & Apply Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Source Evidence Artefact</span>
                <h3 className="text-base font-bold text-slate-900">{previewDoc.original_filename}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>Type: <strong className="uppercase">{previewDoc.document_type}</strong></div>
                  <div>Status: <strong>{previewDoc.status}</strong></div>
                  <div>Size: <strong>{(previewDoc.file_size_bytes / 1024).toFixed(1)} KB</strong></div>
                  <div>Integrity: <strong className={previewDoc.integrity_status === "SUSPICIOUS" ? "text-rose-600" : "text-emerald-600"}>{previewDoc.integrity_status}</strong></div>
                </div>
              </div>

              {previewDoc.extracted_fields && (
                <div>
                  <h4 className="font-bold text-slate-700 uppercase text-[11px] mb-1">OCR Key-Value Fields</h4>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(previewDoc.extracted_fields, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => api.downloadDocument(previewDoc.id, previewDoc.original_filename)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download File</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ASSISTANT SLIDE-OVER DRAWER */}
      {showChat && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-teal-400" />
              <div>
                <h3 className="text-sm font-bold">Grounded Procurement AI Assistant</h3>
                <p className="text-[10px] text-slate-400">Strictly answers from submitted documents & ATC conditions</p>
              </div>
            </div>
            <button onClick={() => setShowChat(false)} className="rounded p-1 text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white ml-8 shadow-xs"
                    : "bg-white text-slate-800 mr-8 border border-slate-200 shadow-xs"
                }`}
              >
                <p>{msg.text}</p>
                {msg.grounded !== undefined && (
                  <span className="text-[10px] opacity-70 block mt-1">
                    {msg.grounded ? "✓ Grounded in bid documents" : "⚠ Not enough evidence in submission"}
                  </span>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-400 mr-8 animate-pulse">
                Analyzing bid evidence documents...
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              placeholder="e.g. Does the turnover meet ₹50L? Why was GST flagged?"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatQuestion.trim()}
              className="rounded-lg bg-teal-600 px-3 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* EXPLAINABLE EVIDENCE VIEWER MODAL */}
      {selectedEvidenceReq && (
        <EvidenceViewerModal
          requirement={selectedEvidenceReq}
          bidReference={bidDetail?.reference_code}
          bidderLegalName={bidDetail?.bidder?.legal_name}
          onClose={() => setSelectedEvidenceReq(null)}
          onOverride={(req) => {
            setSelectedEvidenceReq(null);
            setOverrideTarget(req);
            const isC =
              (req.comparison_result || req.status).toUpperCase() === "COMPLIANT" ||
              (req.comparison_result || req.status).toUpperCase() === "PASS";
            setOverrideStatus(isC ? "NON-COMPLIANT" : "COMPLIANT");
            setOverrideReason("");
            setOverrideNotes("");
          }}
        />
      )}
    </div>
  );
}
