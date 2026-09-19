import { useState } from "react";
import {
  Settings as SettingsIcon,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Server,
  Database,
  Cpu,
  Lock,
  Info,
  Save,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

export function SettingsPage() {
  const [weights, setWeights] = useState({
    identity: 20,
    tax: 15,
    msme: 15,
    financial: 15,
    experience: 15,
    technical: 10,
    integrity: 5,
    consistency: 5,
  });

  const [simMode, setSimMode] = useState<"sandbox" | "live">("sandbox");
  const [autoOcr, setAutoOcr] = useState(true);
  const [strictThreshold, setStrictThreshold] = useState(true);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (totalWeight !== 100) {
      toast.error(`Total weight must equal 100% (currently ${totalWeight}%)`);
      return;
    }
    toast.success("Compliance engine parameters saved to runtime cache");
  }

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

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700 border border-slate-200">
            System Administration
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings &amp; Rule Engine Configuration</h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          Configure transparent compliance scoring weights, verification gateway sandbox parameters, and OCR forensic heuristics.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Compliance Scoring Weights */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-teal-600" />
                Transparent Evaluation Weights (0–100 Scale)
              </h3>
              <p className="text-xs text-slate-500">
                Rule-based weighting applied across mandatory eligibility criteria. Formula:{" "}
                <code>Score = &Sigma;(Satisfied Weight) / &Sigma;(Total Weight) * 100</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Weight:</span>
              <span
                className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                  totalWeight === 100 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}
              >
                {totalWeight}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">Identity &amp; PAN (20%)</label>
              <input
                type="number"
                value={weights.identity}
                onChange={(e) => setWeights({ ...weights, identity: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">PAN format &amp; legal title verification</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">Tax / GSTN (15%)</label>
              <input
                type="number"
                value={weights.tax}
                onChange={(e) => setWeights({ ...weights, tax: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Active GSTIN &amp; expiry validity</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">MSME / Udyam (15%)</label>
              <input
                type="number"
                value={weights.msme}
                onChange={(e) => setWeights({ ...weights, msme: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">MSE purchase preference eligibility</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">Financial Turnover (15%)</label>
              <input
                type="number"
                value={weights.financial}
                onChange={(e) => setWeights({ ...weights, financial: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Average annual turnover benchmark</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">Past Experience (15%)</label>
              <input
                type="number"
                value={weights.experience}
                onChange={(e) => setWeights({ ...weights, experience: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Years in comparable domain</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">Technical &amp; OEM (10%)</label>
              <input
                type="number"
                value={weights.technical}
                onChange={(e) => setWeights({ ...weights, technical: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">OEM authorization &amp; BIS certs</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">Document Integrity (5%)</label>
              <input
                type="number"
                value={weights.integrity}
                onChange={(e) => setWeights({ ...weights, integrity: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Metadata tampering &amp; scan heuristics</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">Consistency (5%)</label>
              <input
                type="number"
                value={weights.consistency}
                onChange={(e) => setWeights({ ...weights, consistency: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Cross-document name/address matching</span>
            </div>
          </div>
        </div>

        {/* Verification Architecture & Mode */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="h-4 w-4 text-teal-600" />
              Government Data Verification Gateway Mode
            </h3>
            <p className="text-xs text-slate-500">
              Configure integration mode for GSTN, Udyam, MCA21, EPFO, ESIC, and DigiLocker registries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div
              onClick={() => setSimMode("sandbox")}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                simMode === "sandbox"
                  ? "border-teal-500 bg-teal-50/30 ring-1 ring-teal-500"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <strong className="text-slate-900 font-bold">Sandbox Simulator Mode (Active)</strong>
                <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                  SIH Demo Mode
                </span>
              </div>
              <p className="text-slate-600 mt-2 leading-relaxed">
                Uses realistic structured mock responses validated against official OpenAPI schemas. Safe for local
                and offline hackathon demonstration without API quota limits or production keys.
              </p>
            </div>

            <div
              onClick={() => setSimMode("live")}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                simMode === "live"
                  ? "border-teal-500 bg-teal-50/30 ring-1 ring-teal-500"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <strong className="text-slate-900 font-bold">API Setu / GSP Production Gateway</strong>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  Production
                </span>
              </div>
              <p className="text-slate-600 mt-2 leading-relaxed">
                Binds live calls to National Informatics Centre (NIC) and GST Suvidha Provider (GSP) gateways. Requires
                Class 3 DSC certificate and approved Departmental IP whitelisting.
              </p>
            </div>
          </div>
        </div>

        {/* SIH Principles & Architecture Declaration */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Info className="h-4 w-4 text-teal-600" />
            SIH 2026 Core Architecture &amp; Procurement Standards
          </h3>
          <div className="text-xs text-slate-600 leading-relaxed space-y-2">
            <p>
              <strong>Core Differentiator:</strong> Requirement-to-evidence comparison with explainable compliance
              analysis and verification support.
            </p>
            <p>
              <strong>Decision Support Mandate:</strong> The AI core never renders final legal qualification outcomes.
              The final qualification decision remains strictly with the authorized procurement officer.
            </p>
            <p>
              <strong>Immutable Audit Logging:</strong> Every action, verification execution, and manual officer
              override is permanently cryptographically stamped with actor ID, timestamp, and justification reason.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Save className="h-4 w-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
