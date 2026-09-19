import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Building,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  Wrench,
  Camera,
  FileText,
  HelpCircle,
  PauseCircle,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { formatDate } from "../lib/format";

interface HumanInspectionModalProps {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const HumanInspectionModal: React.FC<HumanInspectionModalProps> = ({
  caseId,
  onClose,
  onSuccess,
}) => {
  const [caseData, setCaseData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [finalDecision, setFinalDecision] = useState<"ACCEPT" | "REJECT" | "RETEST" | "HOLD" | "REQUEST_CLARIFICATION">("HOLD");
  const [justification, setJustification] = useState("");
  const [officerRemarks, setOfficerRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCase();
  }, [caseId]);

  async function loadCase() {
    try {
      setLoading(true);
      const data = await api.getInspectionCase(caseId);
      setCaseData(data);
      setChecklist(data.checklist || []);
      if (data.final_decision && data.final_decision !== "PENDING") {
        setFinalDecision(data.final_decision);
      }
      if (data.decision_justification) {
        setJustification(data.decision_justification);
      }
      if (data.officer_remarks) {
        setOfficerRemarks(data.officer_remarks);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load inspection case dossier");
    } finally {
      setLoading(false);
    }
  }

  function handleToggleChecklist(index: number, newStatus: "PASS" | "FAIL" | "NOT_TESTED") {
    const updated = [...checklist];
    updated[index] = {
      ...updated[index],
      status: newStatus,
    };
    setChecklist(updated);
  }

  function handleChecklistNoteChange(index: number, notes: string) {
    const updated = [...checklist];
    updated[index] = {
      ...updated[index],
      notes,
    };
    setChecklist(updated);
  }

  async function handleSubmitDecision(e: React.FormEvent) {
    e.preventDefault();

    if (!justification.trim() || justification.trim().length < 5) {
      toast.error("Detailed justification reason (at least 5 characters) is mandatory to record human determination.");
      return;
    }

    try {
      setSubmitting(true);
      await api.submitInspectionDecision(caseId, {
        final_decision: finalDecision,
        decision_justification: justification.trim(),
        checklist,
        officer_remarks: officerRemarks.trim() || undefined,
      });

      toast.success(`Human determination '${finalDecision}' recorded permanently in audit trail`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record human determination");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !caseData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
        <div className="rounded-2xl bg-white p-8 shadow-2xl flex items-center gap-3 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          <span className="text-sm font-semibold">Loading Human Inspection Dossier...</span>
        </div>
      </div>
    );
  }

  const passedCount = checklist.filter((c) => c.status === "PASS").length;
  const failedCount = checklist.filter((c) => c.status === "FAIL").length;
  const notTestedCount = checklist.filter((c) => c.status === "NOT_TESTED").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Human Inspection Case Dossier
                </h2>
                <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                  {caseData.case_id}
                </span>
                <span
                  className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase ${
                    caseData.final_decision === "ACCEPT"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : caseData.final_decision === "REJECT"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : caseData.final_decision === "HOLD"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : caseData.final_decision === "RETEST"
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : caseData.final_decision === "REQUEST_CLARIFICATION"
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}
                >
                  Status: {caseData.final_decision}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Asset: <span className="font-mono font-bold text-slate-700">{caseData.asset_id}</span> &bull; SN:{" "}
                <span className="font-mono font-bold text-slate-700">{caseData.serial_number}</span> &bull; {caseData.model_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statutory Human Authority Safeguard Banner */}
          <div className="rounded-xl border border-sky-300 bg-sky-50/80 p-4 text-xs text-sky-950 shadow-sm">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wide">
                  Statutory Human Officer Authority Mandate:
                </span>{" "}
                The automated system identifies discrepancies and pre-fills checklist items for guidance only.
                <strong> The system MUST NEVER make this final acceptance or rejection decision automatically.</strong> As the authorized
                human inspector, you retain sole authority to adjust checklist items, evaluate vendor variances, determine the final outcome,
                and record official justification in the immutable audit trail.
              </div>
            </div>
          </div>

          {/* Case Overview Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Tender Contract</span>
              <span className="font-semibold text-slate-800 line-clamp-1">{caseData.tender_title}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Awarded Supplier</span>
              <span className="font-semibold text-slate-800 line-clamp-1">{caseData.supplier_name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Batch Lot</span>
              <span className="font-mono font-semibold text-slate-800">{caseData.batch_number}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Inspector</span>
              <span className="font-semibold text-slate-800">{caseData.inspector_name}</span>
            </div>
          </div>

          {/* Detected Anomaly Banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-950 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase text-[11px] text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>AI-Detected Discrepancy / Anomaly</span>
            </div>
            <p className="font-medium text-slate-800 leading-relaxed">
              {caseData.detected_issue}
            </p>
          </div>

          {/* 13-Item Laptop Inspection Checklist */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Comprehensive 13-Point Hardware Inspection Checklist
                </h3>
                <p className="text-xs text-slate-500">
                  AI pre-fills items based on hardware telemetry. The inspector can override any result.
                </p>
              </div>

              {/* Counts Badge */}
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800 font-semibold">
                  Passed: {passedCount}
                </span>
                <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-rose-800 font-semibold">
                  Failed: {failedCount}
                </span>
                <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-600 font-semibold">
                  Not Tested: {notTestedCount}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Checklist Item</th>
                    <th className="py-2.5 px-3">Contracted Spec</th>
                    <th className="py-2.5 px-3">Observed Reading</th>
                    <th className="py-2.5 px-3 text-center">Inspector Result</th>
                    <th className="py-2.5 px-3">Inspector Notes / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {checklist.map((item, idx) => {
                    const isPass = item.status === "PASS";
                    const isFail = item.status === "FAIL";
                    const isNotTested = item.status === "NOT_TESTED";

                    return (
                      <tr key={item.item} className={isFail ? "bg-rose-50/40" : ""}>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.is_ai_prefilled && (
                              <span className="rounded bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.2 text-[9px] font-mono">
                                AI Pre-filled
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-600">{item.expected}</td>
                        <td className="py-2.5 px-3">
                          <span className={`font-semibold ${isFail ? "text-rose-700 font-bold" : "text-slate-800"}`}>
                            {item.observed}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {/* Tri-state buttons: PASS, FAIL, NOT_TESTED */}
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleToggleChecklist(idx, "PASS")}
                              className={`px-2 py-0.5 rounded transition ${
                                isPass
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "text-slate-600 hover:text-emerald-700"
                              }`}
                            >
                              PASS
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleChecklist(idx, "FAIL")}
                              className={`px-2 py-0.5 rounded transition ${
                                isFail
                                  ? "bg-rose-600 text-white shadow-sm"
                                  : "text-slate-600 hover:text-rose-700"
                              }`}
                            >
                              FAIL
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleChecklist(idx, "NOT_TESTED")}
                              className={`px-1.5 py-0.5 rounded transition ${
                                isNotTested
                                  ? "bg-slate-300 text-slate-800"
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              N/T
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.notes || ""}
                            onChange={(e) => handleChecklistNoteChange(idx, e.target.value)}
                            placeholder="Add technician notes..."
                            className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evidence Photos & Forensic Attachments */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Camera className="h-4 w-4 text-purple-600" />
              <span>Inspection Evidence &amp; Disassembly Photos ({caseData.evidence_photos?.length || 0})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(caseData.evidence_photos || []).map((photo: any, i: number) => (
                <div key={i} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-sm">
                  <div className="h-40 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover opacity-90 hover:opacity-100 transition"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                      {photo.title}
                    </div>
                  </div>
                  <div className="p-2.5 text-xs text-slate-600 bg-white">
                    <span className="font-bold text-slate-800 block text-[11px]">Field Observation:</span>
                    <p className="text-[11px] text-slate-500 leading-tight">{photo.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Officer Final Determination Form */}
          <form onSubmit={handleSubmitDecision} className="rounded-2xl border border-teal-200 bg-teal-50/30 p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  <span>Official Human Inspection Determination</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-semibold">
                  Rule 173 GFR Mandate
                </span>
              </div>

              {/* 5 Final Outcome Options */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "ACCEPT", label: "Accept Unit", desc: "Approve delivery", icon: CheckCircle2, color: "emerald" },
                  { id: "REJECT", label: "Reject Unit", desc: "Issue rejection notice", icon: XCircle, color: "rose" },
                  { id: "RETEST", label: "Retest Unit", desc: "Secondary testing cycle", icon: RotateCcw, color: "blue" },
                  { id: "HOLD", label: "Hold Lot", desc: "Administrative freeze", icon: PauseCircle, color: "amber" },
                  { id: "REQUEST_CLARIFICATION", label: "Clarify", desc: "Vendor show-cause", icon: HelpCircle, color: "purple" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = finalDecision === opt.id;

                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setFinalDecision(opt.id as any)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? "border-teal-600 bg-white ring-2 ring-teal-500/30 shadow-xs"
                          : "border-slate-200 bg-white/70 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-teal-700" : "text-slate-500"}`} />
                        <span className={`text-xs font-bold ${isSelected ? "text-teal-900" : "text-slate-800"}`}>
                          {opt.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mandatory Justification */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                Mandatory Officer Determination Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain the statutory and technical basis for this decision (e.g., physical disassembly confirmed 256 GB drive instead of 512 GB, vendor instructed to replace under warranty clause, show cause issued)..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-500">
                Minimum 5 characters. Permanently logged to the immutable audit trail with inspector credentials.
              </span>
            </div>

            {/* Officer Remarks */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Official Remarks &amp; Vendor Communication Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={officerRemarks}
                onChange={(e) => setOfficerRemarks(e.target.value)}
                placeholder="Reference GeM portal rectification tickets, vendor response deadlines, or committee memo numbers..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-teal-200/60">
              <div className="text-[11px] text-slate-500">
                {caseData.decided_at && (
                  <span>
                    Previously determined by <strong>{caseData.decided_by_name}</strong> on {formatDate(caseData.decided_at)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !justification.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Commit Human Determination</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
