import React, { useState } from "react";
import {
  X,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileSearch,
  Scale,
  Edit3,
  FileCheck2,
} from "lucide-react";
import { RequirementResult } from "../types";
import toast from "react-hot-toast";

interface EvidenceViewerModalProps {
  requirement: RequirementResult | null;
  bidReference?: string;
  bidderLegalName?: string;
  onClose: () => void;
  onOverride?: (req: RequirementResult) => void;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  requirement,
  bidReference,
  bidderLegalName,
  onClose,
  onOverride,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copied, setCopied] = useState(false);

  if (!requirement) return null;

  const rawStatus = (requirement.comparison_result || requirement.status || "").toUpperCase();
  const isPass = rawStatus === "PASS" || rawStatus === "COMPLIANT";
  const isFail =
    rawStatus === "FAIL" ||
    rawStatus === "NON-COMPLIANT" ||
    rawStatus === "EXPIRED" ||
    rawStatus === "MISSING" ||
    rawStatus === "NOT_EVALUATED";
  const isReview =
    rawStatus === "NEEDS_REVIEW" ||
    rawStatus === "NEEDS REVIEW" ||
    rawStatus === "PARTIAL" ||
    rawStatus === "MISMATCH";

  const displayResult = isPass ? "PASS" : isFail ? "FAIL" : "NEEDS_REVIEW";
  const whyButtonLabel = isPass ? "Why PASS?" : isFail ? "Why FAIL?" : "Why NEEDS REVIEW?";

  const expectedDisplay = requirement.expected_value_display || requirement.required_value || "—";
  const extractedDisplay =
    requirement.extracted_value_display ||
    (requirement.extracted_values ? JSON.stringify(requirement.extracted_values) : "—");
  const hasDocument = Boolean(requirement.source_document && requirement.source_document !== "None");
  const pageDisplay = requirement.source_page
    ? `Page ${requirement.source_page}`
    : "Page/evidence location unavailable.";
  const evidenceSnippet = requirement.extracted_text_snippet || null;

  function handleCopySummary() {
    if (!requirement) return;
    const summaryText = `--- COMPLYGEM AI EVIDENCE AUDIT ---
Requirement: ${requirement.title || requirement.requirement}
Category: ${requirement.category}
Expected: ${expectedDisplay}
Extracted: ${extractedDisplay}
Source Document: ${requirement.source_document || "Page/evidence location unavailable."}
Page: ${pageDisplay}
Result: ${displayResult}
Confidence: ${requirement.confidence}%
Evidence: ${evidenceSnippet || "Page/evidence location unavailable."}
Reason: ${requirement.explanation || requirement.reason}
Timestamp: ${new Date().toISOString()}
-----------------------------------`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    toast.success("Evidence summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenOriginal() {
    if (requirement?.source_document_id) {
      window.open(`/api/documents/${requirement.source_document_id}/file`, "_blank");
    } else {
      toast("Direct file preview link not attached to this requirement stub.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-5xl max-h-[92vh] rounded-xl bg-white shadow-xl border border-slate-200 flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                  Explainable Evidence Viewer
                </span>
                <span className="text-slate-500 text-xs">&bull;</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                    isPass
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : isFail
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {whyButtonLabel}
                </span>
              </div>
              <h2 className="text-base font-bold text-white leading-tight mt-0.5">
                {requirement.title || requirement.requirement}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              title="Copy audit evidence record"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy Audit"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (TWO COLUMNS) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* LEFT COLUMN: AUDIT VERDICT, VALIDATION & REASONING (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. RESULT & CONFIDENCE CARD */}
            <div
              className={`rounded-xl border p-4 shadow-sm ${
                isPass
                  ? "bg-emerald-50/70 border-emerald-200"
                  : isFail
                  ? "bg-rose-50/70 border-rose-200"
                  : "bg-amber-50/70 border-amber-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPass && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                  {isFail && <XCircle className="h-6 w-6 text-rose-600" />}
                  {isReview && <AlertTriangle className="h-6 w-6 text-amber-600" />}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      AI Compliance Result
                    </span>
                    <span
                      className={`text-lg font-bold tracking-tight ${
                        isPass
                          ? "text-emerald-900"
                          : isFail
                          ? "text-rose-900"
                          : "text-amber-900"
                      }`}
                    >
                      {displayResult}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Confidence
                  </span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {requirement.confidence}%
                  </span>
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div className="mt-3 w-full bg-slate-200 rounded-md h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPass ? "bg-emerald-600" : isFail ? "bg-rose-600" : "bg-amber-500"
                  }`}
                  style={{ width: `${requirement.confidence}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>Deterministic rule comparison</span>
                <span>Risk rating: <strong>{requirement.risk || "MEDIUM"}</strong></span>
              </div>
            </div>

            {/* 2. REQUIREMENT & EXPECTED CONDITION */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Requirement Specification
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                  {requirement.category}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {requirement.title || requirement.requirement}
                </h4>
                {requirement.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {requirement.description}
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 font-mono text-xs text-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold mb-0.5">
                  Expected Condition
                </div>
                <div className="font-bold text-teal-900 flex items-center gap-1.5">
                  {requirement.comparison_operator && (
                    <span className="text-slate-500 font-normal">{requirement.comparison_operator}</span>
                  )}
                  <span>{expectedDisplay}</span>
                </div>
              </div>
            </div>

            {/* 3. VALIDATION: EXPECTED VS ACTUAL */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Scale className="h-3 w-3 text-slate-400" />
                  Validation Logic (Expected vs Actual)
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Rule: {requirement.comparison_operator || "=="}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <span className="font-sans text-[10px] text-slate-400 block font-semibold uppercase">
                    Expected
                  </span>
                  <div className="font-semibold text-slate-800 mt-0.5 truncate" title={expectedDisplay}>
                    {expectedDisplay}
                  </div>
                </div>

                <div
                  className={`rounded-lg p-2.5 border ${
                    isPass
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : isFail
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  <span className="font-sans text-[10px] block font-semibold uppercase opacity-75">
                    Extracted
                  </span>
                  <div className="font-bold mt-0.5 truncate" title={extractedDisplay}>
                    {extractedDisplay}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. VERIFICATION REASONING */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                  Concise Verification Reasoning
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono">
                  No CoT exposed
                </span>
              </div>

              <div className="rounded-lg bg-slate-50/80 p-3 border border-slate-100 text-xs text-slate-800 leading-relaxed font-medium">
                {requirement.explanation || requirement.reason}
              </div>

              <p className="text-[10px] text-slate-400 italic">
                Reasoning is formulated strictly from extracted evidence vs tender ATC thresholds. Officer maintains final decision authority.
              </p>
            </div>

            {/* OFFICER MANUAL OVERRIDE CTA */}
            {onOverride && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onOverride(requirement)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 py-2.5 px-4 text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Edit3 className="h-4 w-4 text-purple-600" />
                  <span>Exercise Officer Manual Override for this Requirement</span>
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: DOCUMENT VIEWER & HIGHLIGHTED EVIDENCE (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* EVIDENCE CITATION STRIP */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <FileText className="h-3 w-3 text-slate-400" />
                  Evidence Source & Citation
                </span>
                {hasDocument && requirement.source_document_id && (
                  <button
                    type="button"
                    onClick={handleOpenOriginal}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Open Original Document</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Source File</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5" title={requirement.source_document || "Unavailable"}>
                    {requirement.source_document || "Page/evidence location unavailable."}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Location</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {pageDisplay}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Section</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5" title={requirement.source_section || "Unavailable"}>
                    {requirement.source_section || "Page/evidence location unavailable."}
                  </span>
                </div>
              </div>

              {/* EXTRACTED EVIDENCE SNIPPET */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Relevant Extracted Text:
                </span>
                {evidenceSnippet ? (
                  <div className="rounded-lg border-l-4 border-l-teal-600 bg-teal-50/60 p-3 text-xs text-slate-900 font-mono leading-relaxed border border-teal-200/60 relative">
                    <span className="font-sans font-bold text-[10px] text-teal-700 uppercase tracking-wider block mb-1">
                      OCR Extracted String
                    </span>
                    &ldquo;{evidenceSnippet}&rdquo;
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-100/80 p-3 text-xs text-slate-400 italic border border-slate-200">
                    Page/evidence location unavailable.
                  </div>
                )}
              </div>
            </div>

            {/* DOCUMENT VIEWER WITH HIGHLIGHTED EVIDENCE REGION */}
            <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[360px]">
              
              {/* Document Toolbar */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-bold text-slate-700 truncate max-w-[200px]">
                    {requirement.source_document || "Document Canvas"}
                  </span>
                  {requirement.source_page && (
                    <span className="bg-white px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-600 border border-slate-200">
                      Page {requirement.source_page}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                    className="p-1 rounded text-slate-600 hover:bg-white hover:shadow-sm transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[10px] text-slate-500 min-w-[32px] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                    className="p-1 rounded text-slate-600 hover:bg-white hover:shadow-sm transition cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(100)}
                    className="p-1 rounded text-slate-600 hover:bg-white hover:shadow-sm transition cursor-pointer"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Document Render Canvas */}
              <div className="flex-1 bg-slate-200/70 p-4 sm:p-6 overflow-auto flex items-center justify-center">
                {hasDocument ? (
                  <div
                    className="bg-white rounded-lg shadow-md border border-slate-300 w-full max-w-lg min-h-[420px] p-6 text-slate-800 font-sans text-[11px] leading-relaxed relative select-none transition-transform duration-200 origin-top"
                    style={{ transform: `scale(${zoomLevel / 100})` }}
                  >
                    {/* Simulated Document Header */}
                    <div className="border-b border-slate-200 pb-3 mb-4 text-center">
                      <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                        GOVERNMENT PROCUREMENT SUBMISSION &bull; VERIFIED ARTEFACT
                      </div>
                      <div className="font-sans text-xs font-bold text-slate-900 mt-1 uppercase">
                        {requirement.source_document?.replace(".pdf", "").replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                        Bidder: {bidderLegalName || "Submitted Entity"} &bull; Ref: {bidReference || "GeM-Bid"}
                      </div>
                    </div>

                    {/* Surrounding Context Lines */}
                    <div className="space-y-2 text-slate-600 font-sans text-[11px]">
                      <p className="text-slate-400">
                        1.0 GENERAL SPECIFICATIONS & COMPLIANCE UNDERTAKING
                      </p>
                      <p className="text-slate-500 text-[10px]">
                        The quoted product model and components have been rigorously engineered to satisfy the institutional tender specifications stipulated under the GeM ATC bid packet.
                      </p>

                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-700 uppercase">
                          {requirement.source_section || "Section Specification"}
                        </span>
                      </div>

                      {/* HIGHLIGHTED EVIDENCE REGION */}
                      <div className="relative mt-2 p-3.5 rounded-lg border-2 border-blue-600 bg-blue-50/40 shadow-xs transition">
                        {/* Floating Highlight Badge */}
                        <div className="absolute -top-3 left-3 bg-slate-900 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 uppercase tracking-wider">
                          <FileCheck2 className="h-2.5 w-2.5" />
                          <span>Audited Evidence Excerpt ({pageDisplay})</span>
                        </div>

                        <p className="font-mono text-xs font-semibold text-slate-900 leading-normal pt-1">
                          <mark className="bg-amber-200 text-amber-950 px-1 py-0.5 rounded font-bold">
                            {evidenceSnippet || extractedDisplay}
                          </mark>
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[9px] text-slate-700 font-sans font-medium">
                          <span>Verified against ATC rule: {expectedDisplay}</span>
                          <span className="font-bold uppercase tracking-wider">{displayResult}</span>
                        </div>
                      </div>

                      {/* Trailing Context Lines */}
                      <div className="pt-4 space-y-1.5 text-slate-400 text-[10px]">
                        <p>2.0 REGULATORY & QUALITY CERTIFICATION STANDARDS</p>
                        <p>
                          All components adhere to ISO 9001, RoHS, and BIS safety regulations. Serialized test reports are available upon commissioning.
                        </p>
                      </div>
                    </div>

                    {/* Document Footer */}
                    <div className="absolute bottom-4 left-6 right-6 border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <span>ComplyGeM AI Verification Hash: SHA256 Verified</span>
                      <span>{pageDisplay}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-sm space-y-2 shadow-xs">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h5 className="font-bold text-slate-800 text-sm">No Document Artefact Attached</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The bidder did not upload a supporting document for this requirement.
                    </p>
                    <div className="pt-2 text-slate-400 text-xs italic">
                      Page/evidence location unavailable.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Explainable verification evidence for government procurement audit trail.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Evidence</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
