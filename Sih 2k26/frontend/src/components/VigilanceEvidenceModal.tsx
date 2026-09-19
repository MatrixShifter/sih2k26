import React from "react";
import {
  X,
  ShieldAlert,
  Building,
  Users,
  MapPin,
  Phone,
  Mail,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
} from "lucide-react";

interface VigilanceEvidenceModalProps {
  alert: any | null;
  onClose: () => void;
  onOpenAction: (alert: any) => void;
}

export const VigilanceEvidenceModal: React.FC<VigilanceEvidenceModalProps> = ({
  alert,
  onClose,
  onOpenAction,
}) => {
  if (!alert) return null;

  const { bidder_a: a, bidder_b: b, indicators, risk_level, risk_score, alert_id } = alert;

  // Helpers to detect matching fields
  const isDirectorMatch =
    a.director && b.director && a.director.toLowerCase() === b.director.toLowerCase();
  const isAddressMatch =
    a.address &&
    b.address &&
    (a.address.toLowerCase() === b.address.toLowerCase() ||
      a.address.toLowerCase().includes(b.address.toLowerCase()) ||
      b.address.toLowerCase().includes(a.address.toLowerCase()));
  const isPhoneMatch =
    a.phone &&
    b.phone &&
    a.phone.replace(/\D/g, "") === b.phone.replace(/\D/g, "");
  const isEmailDomainMatch =
    a.email &&
    b.email &&
    a.email.split("@")[1]?.toLowerCase() === b.email.split("@")[1]?.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Relationship Evidence Dossier
                </h2>
                <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                  Case #{alert_id}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                    risk_level === "HIGH"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : risk_level === "MEDIUM"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {risk_level} RISK (Score: {risk_score})
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cross-entity correlation and forensic document inspection
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statutory Vigilance Disclaimer */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wide">
                  Non-Collusion &amp; Fairness Notice:
                </span>{" "}
                Evidence indicates a potential relationship; it does not establish collusion or illegal bid rigging.
                Under GeM vigilance directives, this finding requires formal verification and evaluation by the procurement officer.
              </div>
            </div>
          </div>

          {/* Side-by-Side Entity Comparison */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building className="h-4 w-4 text-teal-600" />
              <span>Comparative Entity Profiles</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Entity A */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Bidder Entity A</span>
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200">
                    ID #{a.id}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{a.name}</h4>
                  <p className="text-xs text-slate-500">{a.trade_name || "Sole Proprietor / Enterprise"}</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className={`p-2 rounded-lg ${isDirectorMatch ? "bg-rose-50 border border-rose-200" : "bg-white border border-slate-200"}`}>
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                      <span>Director / Key Management</span>
                      {isDirectorMatch && <span className="text-rose-600 font-bold">MATCH</span>}
                    </div>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>{a.director || "Not recorded"}</span>
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg ${isAddressMatch ? "bg-amber-50 border border-amber-200" : "bg-white border border-slate-200"}`}>
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                      <span>Registered Office</span>
                      {isAddressMatch && <span className="text-amber-600 font-bold">OVERLAP</span>}
                    </div>
                    <div className="font-medium text-slate-700 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{a.address} (PIN: {a.pincode})</span>
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg ${isPhoneMatch ? "bg-blue-50 border border-blue-200" : "bg-white border border-slate-200"}`}>
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                      <span>Contact Telephone</span>
                      {isPhoneMatch && <span className="text-blue-600 font-bold">MATCH</span>}
                    </div>
                    <div className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{a.phone}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Official Email</div>
                    <div className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{a.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-1.5 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">GSTIN</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-800">{a.gstin || "N/A"}</span>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">CIN</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-800">{a.cin || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Entity B */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Bidder Entity B</span>
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200">
                    ID #{b.id}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                  <p className="text-xs text-slate-500">{b.trade_name || "Sole Proprietor / Enterprise"}</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className={`p-2 rounded-lg ${isDirectorMatch ? "bg-rose-50 border border-rose-200" : "bg-white border border-slate-200"}`}>
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                      <span>Director / Key Management</span>
                      {isDirectorMatch && <span className="text-rose-600 font-bold">MATCH</span>}
                    </div>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>{b.director || "Not recorded"}</span>
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg ${isAddressMatch ? "bg-amber-50 border border-amber-200" : "bg-white border border-slate-200"}`}>
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                      <span>Registered Office</span>
                      {isAddressMatch && <span className="text-amber-600 font-bold">OVERLAP</span>}
                    </div>
                    <div className="font-medium text-slate-700 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{b.address} (PIN: {b.pincode})</span>
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg ${isPhoneMatch ? "bg-blue-50 border border-blue-200" : "bg-white border border-slate-200"}`}>
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                      <span>Contact Telephone</span>
                      {isPhoneMatch && <span className="text-blue-600 font-bold">MATCH</span>}
                    </div>
                    <div className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{b.phone}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Official Email</div>
                    <div className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{b.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-1.5 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">GSTIN</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-800">{b.gstin || "N/A"}</span>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">CIN</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-800">{b.cin || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detected Forensic Indicators */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-purple-600" />
              <span>Forensic &amp; Document Artifact Indicators ({indicators.length})</span>
            </h3>

            <div className="space-y-2.5">
              {indicators.map((ind: any, i: number) => {
                const isDocHash = ind.code === "DUPLICATE_DOCUMENT_HASH";

                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-3.5 text-xs ${
                      ind.severity === "HIGH"
                        ? "border-rose-200 bg-rose-50/40"
                        : "border-amber-200 bg-amber-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{ind.title}</span>
                      <span
                        className={`rounded px-2 py-0.5 font-bold text-[10px] uppercase ${
                          ind.severity === "HIGH"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {ind.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{ind.detail}</p>

                    {/* Evidence details */}
                    {isDocHash && ind.evidence && (
                      <div className="mt-2 rounded-lg bg-white border border-purple-200 p-2.5 font-mono text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-purple-900 font-semibold">
                          <span>SHA-256 Fingerprint:</span>
                          <span className="text-[10px] bg-purple-100 px-1.5 py-0.5 rounded">Exact 256-Bit Match</span>
                        </div>
                        <div className="text-slate-600 break-all select-all">{ind.evidence.sha256_hash}</div>
                        <div className="grid grid-cols-2 gap-2 pt-1.5 text-slate-700">
                          <div>
                            <span className="text-slate-400">Bidder A File: </span>
                            <span className="font-semibold">{ind.evidence.doc_a_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Bidder B File: </span>
                            <span className="font-semibold">{ind.evidence.doc_b_name}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-3.5">
          <div className="text-xs text-slate-500">
            Current Status: <span className="font-bold text-slate-800">{alert.action_status}</span>
            {alert.officer_name && ` by ${alert.officer_name}`}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close Dossier
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenAction(alert);
              }}
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 shadow-sm transition"
            >
              Take Officer Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
