import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  Code2,
  RefreshCw,
  Building,
  Info,
  Check,
  X,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

interface GatewayStatus {
  id: string;
  name: string;
  registry: string;
  url: string;
  status: "ONLINE" | "SIMULATED" | "DEGRADED";
  latencyMs: number;
  description: string;
  authMethod: string;
}

const GATEWAYS: GatewayStatus[] = [
  {
    id: "gstn",
    name: "Goods & Services Tax Network (GSTN)",
    registry: "Central Board of Indirect Taxes & Customs",
    url: "https://api.gst.gov.in/v1.0",
    status: "SIMULATED",
    latencyMs: 142,
    description: "Validates 15-digit GSTIN active state, filing frequency, and legal entity title matching.",
    authMethod: "GSP / ASP Public Key Infrastructure (DSC Class 3)",
  },
  {
    id: "udyam",
    name: "Udyam MSME Registry Gateway",
    registry: "Ministry of Micro, Small and Medium Enterprises",
    url: "https://udyamregistration.gov.in/api/v2",
    status: "SIMULATED",
    latencyMs: 198,
    description: "Confirms Micro/Small/Medium classification, enterprise Udyam active status for MSE price preference.",
    authMethod: "Aadhaar e-KYC / OTP B2B Auth Gateway",
  },
  {
    id: "pan",
    name: "NSDL / Income Tax Department PAN Verification",
    registry: "Directorate of Income Tax (Systems)",
    url: "https://tin-nsdl.com/pan-api",
    status: "SIMULATED",
    latencyMs: 96,
    description: "Authenticates permanent account number format, active tax status, and exact legal name alignment.",
    authMethod: "API Setu OAuth2 Token Gateway",
  },
  {
    id: "mca21",
    name: "Ministry of Corporate Affairs (MCA21)",
    registry: "Registrar of Companies (RoC)",
    url: "https://mca.gov.in/v3/company-master",
    status: "SIMULATED",
    latencyMs: 210,
    description: "Inspects Corporate Identification Number (CIN), active incorporation status, CIRP / strike-off debarment.",
    authMethod: "MCA API Portal JWT Token",
  },
  {
    id: "epfo",
    name: "Employees' Provident Fund Organisation (EPFO)",
    registry: "Ministry of Labour and Employment",
    url: "https://unifiedportal-epfo.epfindia.gov.in",
    status: "SIMULATED",
    latencyMs: 180,
    description: "Checks 15-character establishment code and monthly Electronic Challan cum Return (ECR) compliance.",
    authMethod: "Unified Shram Suvidha API Gateway",
  },
  {
    id: "esic",
    name: "Employees' State Insurance Corporation (ESIC)",
    registry: "Ministry of Labour and Employment",
    url: "https://esic.nic.in/insurance-api",
    status: "SIMULATED",
    latencyMs: 165,
    description: "Verifies 17-digit ESIC employer code and wage statutory insurance coverage thresholds.",
    authMethod: "National Health / Labour Gateway",
  },
  {
    id: "digilocker",
    name: "DigiLocker National Document Exchange",
    registry: "National e-Governance Division (NeGD) / MeitY",
    url: "https://api.digitallocker.gov.in/public/oauth2/1/token",
    status: "SIMULATED",
    latencyMs: 85,
    description: "Verifies cryptographic URI issued directly by issuing departments without third-party modification.",
    authMethod: "DigiLocker B2B e-Sign PKI Signature",
  },
  {
    id: "startup",
    name: "Startup India Hub Registry",
    registry: "Department for Promotion of Industry and Internal Trade (DPIIT)",
    url: "https://www.startupindia.gov.in/api/v1",
    status: "SIMULATED",
    latencyMs: 130,
    description: "Validates DIPP recognition number for GeM procurement turnover and prior experience exemptions.",
    authMethod: "Invest India DPIIT Service Hub",
  },
];

export function VerificationPage() {
  const [bidders, setBidders] = useState<any[]>([]);
  const [selectedBidderId, setSelectedBidderId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  // Inspector Input State
  const [testGstin, setTestGstin] = useState("27AABCB1234C1Z5");
  const [testUdyam, setTestUdyam] = useState("UDYAM-MH-26-0123456");
  const [testPan, setTestPan] = useState("AABCB1234C");
  const [testCin, setTestCin] = useState("U33100MH2014PTC251234");
  const [testEpfo, setTestEpfo] = useState("PUPUN0123456000");

  // Output response
  const [inspectorResult, setInspectorResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadBidders();
  }, []);

  async function loadBidders() {
    try {
      const data = await api.listBidders();
      setBidders(data);
      if (data.length > 0) {
        populateFields(data[0]);
      }
    } catch (err) {
      // ignore
    }
  }

  function populateFields(bidder: any) {
    setSelectedBidderId(bidder.id);
    setTestGstin(bidder.gstin || "");
    setTestUdyam(bidder.udyam_number || "");
    setTestPan(bidder.pan || "");
    setTestCin(bidder.cin || "");
    setTestEpfo(bidder.epfo_code || "");
  }

  function handleSelectBidder(id: number) {
    const found = bidders.find((b) => b.id === id);
    if (found) populateFields(found);
  }

  function handleRunSimulation() {
    setSimulating(true);
    setInspectorResult(null);

    setTimeout(() => {
      const gstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(testGstin);
      const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(testPan);
      const udyamValid = testUdyam.startsWith("UDYAM-") && !testUdyam.includes("INVALID");

      setInspectorResult({
        simulation_mode: "SANDBOX_MOCK_VERIFICATION",
        disclaimer: "Government portal verification is simulated for prototype demonstration. Not live API data.",
        timestamp: new Date().toISOString(),
        checks: {
          gstn: {
            source: "GSTN_API_GATEWAY (Simulated)",
            query_identifier: testGstin,
            status: gstinValid ? "VERIFIED_ACTIVE" : "UNABLE_TO_VERIFY",
            verification_level: "SIMULATED",
            payload: {
              gstin: testGstin,
              legal_name: bidders.find((b) => b.id === selectedBidderId)?.legal_name || "Enterprise",
              status: gstinValid ? "Active" : "Invalid Checksum / Inactive",
              taxpayer_type: "Regular",
              compliance_rating: gstinValid ? "10/10" : "Suspended",
            },
          },
          udyam: {
            source: "UDYAM_REGISTRATION (Simulated)",
            query_identifier: testUdyam,
            status: udyamValid ? "VERIFIED_MSME" : "UNABLE_TO_VERIFY",
            verification_level: "SIMULATED",
            payload: {
              udyam_registration_number: testUdyam,
              classification: udyamValid ? "Small Manufacturing Enterprise" : "Unverified / Format Failure",
              mse_purchase_preference_eligible: udyamValid,
            },
          },
          nsdl_pan: {
            source: "NSDL_INCOME_TAX (Simulated)",
            query_identifier: testPan,
            status: panValid ? "VERIFIED" : "UNABLE_TO_VERIFY",
            verification_level: "SIMULATED",
            payload: {
              pan: testPan,
              format_valid: panValid,
              category: "Company",
            },
          },
        },
      });
      setSimulating(false);
      toast.success("Simulation executed across government gateway sandboxes");
    }, 450);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Disclaimer */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-3.5 text-xs text-amber-900 shadow-xs">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
        <div className="flex-1">
          <span className="font-semibold uppercase tracking-wide">Government Verification Simulator:</span>{" "}
          This sandbox simulates official government API registries (GSTN, Udyam, MCA21, EPFO, ESIC, DigiLocker).
          The UI clearly distinguishes <strong>Verified</strong> vs <strong>Simulated</strong> vs{" "}
          <strong>Unable to Verify</strong>. No claims of unauthorized live API access are made.
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-indigo-100 px-2.5 py-0.5 text-xs font-bold uppercase text-indigo-800 border border-indigo-200">
            Government Registry Sandbox
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Government Data Verification Layer</h1>
        <p className="text-sm text-slate-500 max-w-4xl">
          Clean integration architecture demonstrating how automated procurement compliance connects to official
          tax, MSME, corporate, and statutory labor registries via secure API Setu / GSP gateways.
        </p>
      </div>

      {/* Legend Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
          <Info className="h-4 w-4 text-teal-600" />
          Registry Verification Trust &amp; Confidence Taxonomy
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 text-[11px] mb-1">
              <CheckCircle2 className="h-3 w-3" />
              VERIFIED
            </span>
            <p className="text-slate-600 mt-1">
              Confirmed match against primary authoritative registry with valid checksum, live status, and cryptographic signature.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
            <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-800 text-[11px] mb-1">
              <RefreshCw className="h-3 w-3" />
              SIMULATED / SANDBOX
            </span>
            <p className="text-slate-600 mt-1">
              Executed against simulated government endpoint using standard schemas and realistic test records for SIH prototype evaluation.
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 font-bold text-rose-800 text-[11px] mb-1">
              <AlertCircle className="h-3 w-3" />
              UNABLE TO VERIFY
            </span>
            <p className="text-slate-600 mt-1">
              Identifier missing from bidder submission, expired certificate, registry suspension, or checksum format failure.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Simulator Workbench */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Interactive Portal Verification Tester</h3>
            <p className="text-xs text-slate-500">
              Select a registered supplier or test custom registration codes to inspect simulated portal responses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Quick-load Vendor:</span>
            <select
              value={selectedBidderId}
              onChange={(e) => handleSelectBidder(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-teal-500 focus:outline-none"
            >
              {bidders.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.legal_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number (15 digits)</label>
            <input
              type="text"
              value={testGstin}
              onChange={(e) => setTestGstin(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Udyam Registration Number</label>
            <input
              type="text"
              value={testUdyam}
              onChange={(e) => setTestUdyam(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">PAN Card Number (10 digits)</label>
            <input
              type="text"
              value={testPan}
              onChange={(e) => setTestPan(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={simulating}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 text-teal-400 ${simulating ? "animate-spin" : ""}`} />
            <span>{simulating ? "Validating with Portal Sandboxes..." : "Execute Verification Query"}</span>
          </button>
        </div>

        {/* Output JSON Viewer */}
        {inspectorResult && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-teal-600" />
                Simulated Gateway Response Payload
              </span>
              <span className="text-[11px] font-mono text-slate-400">{inspectorResult.timestamp}</span>
            </div>
            <pre className="rounded-xl bg-slate-950 p-4 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 max-h-72">
              {JSON.stringify(inspectorResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Registered Gateway Connectors Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Integrated Government Registry Gateways ({GATEWAYS.length})
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GATEWAYS.map((gw) => (
            <div
              key={gw.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                    {gw.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{gw.latencyMs}ms</span>
                </div>
                <h4 className="mt-2 text-xs font-bold text-slate-900 leading-snug">{gw.name}</h4>
                <p className="mt-0.5 text-[11px] text-slate-500">{gw.registry}</p>
                <p className="mt-2 text-[11px] text-slate-600 line-clamp-2">{gw.description}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Security: PKI / OAuth2</span>
                <span className="text-teal-600 font-medium">B2B Sandbox</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
