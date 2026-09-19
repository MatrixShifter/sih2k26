import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

interface VigilanceActionModalProps {
  alert: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const VigilanceActionModal: React.FC<VigilanceActionModalProps> = ({
  alert,
  onClose,
  onSuccess,
}) => {
  if (!alert) return null;

  const [action, setAction] = useState<"ACKNOWLEDGE" | "INVESTIGATE" | "DISMISS" | "ESCALATE">("INVESTIGATE");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (action === "DISMISS" && (!reason.trim() || reason.trim().length < 5)) {
      toast.error("Substantive justification reason (at least 5 characters) is mandatory to dismiss an alert.");
      return;
    }

    try {
      setLoading(true);
      await api.recordVigilanceAction({
        alert_id: alert.alert_id,
        action,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Action '${action}' recorded in audit trail successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record vigilance action");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-teal-100 p-2 text-teal-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Record Vigilance Determination
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Case Ref: {alert.alert_id} ({alert.bidder_a.name} &amp; {alert.bidder_b.name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Select Official Disposition
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "INVESTIGATE", label: "Investigate", desc: "Order formal enquiry", icon: Search, color: "teal" },
                { id: "ACKNOWLEDGE", label: "Acknowledge", desc: "Flag for tender board", icon: CheckCircle2, color: "blue" },
                { id: "ESCALATE", label: "Escalate", desc: "Refer to Vigilance Wing", icon: AlertTriangle, color: "purple" },
                { id: "DISMISS", label: "Dismiss with Reason", desc: "Deem authorized/false", icon: XCircle, color: "rose" },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = action === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setAction(item.id as any)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${isSelected ? "text-teal-700" : "text-slate-500"}`} />
                      <span className={`text-xs font-bold ${isSelected ? "text-teal-900" : "text-slate-800"}`}>
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {action === "DISMISS" && (
            <div className="space-y-1 animate-in fade-in">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
                Mandatory Justification Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this potential relationship does not constitute non-compliance or unfair bidding (e.g., legally separated divisions, holding company exemptions, state JV)..."
                className="w-full rounded-xl border border-rose-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <span className="text-[10px] text-slate-400">
                Minimum 5 characters. This reason is permanently recorded in the immutable audit log.
              </span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Confidential Officer Audit Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes, MCA21/GeM ticket numbers, or committee meeting references..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 shadow-sm transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Submit Determination</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
