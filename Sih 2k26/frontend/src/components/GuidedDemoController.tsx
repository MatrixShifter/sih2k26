import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileText,
  ShieldAlert,
  PackageCheck,
  Check,
  Building,
  Info,
  Layers,
  Wrench,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

export interface DemoStep {
  step: number;
  title: string;
  milestone: string;
  route: string;
  badge: string;
  badgeColor: string;
  actor: string;
  description: string;
  keyHighlight: string;
  actionHint: string;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    step: 1,
    milestone: "Tender Setup & Configuration",
    title: "1. Tender Definition (₹10 Cr, 20,000 Laptops)",
    route: "/tenders",
    badge: "GeM Bid #GEM/2026/B/9082341",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    actor: "Procurement Officer",
    description:
      "Review the official ₹10 Crore Government Laptop Procurement tender with 12 structured compliance rules across Technical, Financial, Legal, Experience, and OEM pillars.",
    keyHighlight:
      "Tender requirements are dynamically structured, weighted, and bound to mandatory conditions rather than hardcoded.",
    actionHint: "Notice the 12 evaluation criteria and closing deadlines.",
  },
  {
    step: 2,
    milestone: "Document Repository",
    title: "2. Bidder Document Upload & Repository",
    route: "/documents",
    badge: "11 Document Types",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    actor: "Bidder / System",
    description:
      "All submitted bid documents (GST, PAN, MCA, CA Turnover, OEM Authorization, Technical Datasheet, Warranty) are catalogued with cryptographic SHA-256 hashes.",
    keyHighlight:
      "Tamper-proof storage ensures submitted PDFs cannot be altered after bid closure.",
    actionHint: "Inspect uploaded datasheets, balance sheets, and OEM authorizations.",
  },
  {
    step: 3,
    milestone: "OCR & Field Extraction",
    title: "3. Advanced OCR & Field Extraction",
    route: "/documents",
    badge: "Automated OCR Extraction",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    actor: "AI Verification Pipeline",
    description:
      "AI extracts structured data fields (RAM, CPU, SSD, Turnover, GSTIN, UDIN) with bounding box coordinates, page numbers, and confidence scores.",
    keyHighlight:
      "Moves procurement verification from raw unstructured PDFs to structured, queryable data models.",
    actionHint: "Look at the structured JSON attributes extracted from documents.",
  },
  {
    step: 4,
    milestone: "Rule Engine Evaluation",
    title: "4. Dynamic Rule Engine Evaluation",
    route: "/compliance",
    badge: "12 Deterministic Rules",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    actor: "Rule Engine",
    description:
      "Every requirement is matched against extracted fields using comparison operators (>= 16 GB RAM, >= ₹50 Cr turnover, >= 512 GB SSD).",
    keyHighlight:
      "Completely decoupled from AI black-box decisions. Each rule returns PASS, FAIL, or NEEDS_REVIEW.",
    actionHint: "Observe how mandatory rules flag non-compliances automatically.",
  },
  {
    step: 5,
    milestone: "Explainable Evidence",
    title: "5. Explainable Evidence Viewer",
    route: "/bids",
    badge: "Why PASS / FAIL?",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    actor: "Procurement Officer",
    description:
      "Clicking any compliance status displays exact snippet quotes, source PDF filename, page number, confidence score, and concise human-readable justification.",
    keyHighlight:
      "Zero hidden chain-of-thought. Complete evidentiary transparency for government audits.",
    actionHint: "Click 'View Details' or 'Why PASS/FAIL' on any evaluated bid application.",
  },
  {
    step: 6,
    milestone: "Bid Review Queue & Scoring",
    title: "6. Bid Evaluation & Compliance Scores",
    route: "/bids",
    badge: "4 Evaluation Packets",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    actor: "Evaluation Committee",
    description:
      "Review the 4 competing bidders: ABC Technologies (95.4%), XYZ Computers (68.0%), TechNova Systems (52.5%), and Digital Systems (88.5%).",
    keyHighlight:
      "Scores indicate rule compliance, not automated procurement awards. Final decisions remain with human officers.",
    actionHint: "Review the compliance score breakdown across all 4 competing vendors.",
  },
  {
    step: 7,
    milestone: "Multi-Bid Comparison Matrix",
    title: "7. Multi-Bid Comparison Matrix",
    route: "/compare?tender_id=7",
    badge: "Side-by-Side Matrix",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    actor: "Evaluation Committee",
    description:
      "Side-by-side comparison across all 12 criteria, pillar breakdown bars (Technical, Financial, Legal, Experience), and critical mandatory failures.",
    keyHighlight:
      "Bidders are NOT ranked purely by AI score. Dense, accessible comparison grid with full evidence drilldown.",
    actionHint: "Compare ABC Technologies against XYZ Computers and TechNova Systems.",
  },
  {
    step: 8,
    milestone: "Vigilance & Relationship Detection",
    title: "8. Vigilance & Collusion Alert",
    route: "/anomalies",
    badge: "HIGH RISK Alert",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    actor: "Chief Vigilance Officer",
    description:
      "Detects covert links between ABC Technologies and Digital Systems: Shared Director (Vikramaditya Sharma), common registered address, identical phone numbers, and matching PDF creator metadata.",
    keyHighlight:
      "Surfaces objective relationship indicators without alleging fraud; prompts officer scrutiny.",
    actionHint: "Inspect the flagged relationship graph and shared directors indicator.",
  },
  {
    step: 9,
    milestone: "Officer Due Diligence",
    title: "9. Officer Review & Discrepancy Scrutiny",
    route: "/officer/bid/19",
    badge: "Dossier Drilldown",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    actor: "Procurement Officer",
    description:
      "Examine ABC Technologies' verified dossier, review the vigilance disclaimer, and verify technical certificates before award consideration.",
    keyHighlight:
      "Allows the officer to request clarification, accept explanations, or mark requirements verified.",
    actionHint: "Review the simulated registry checks (GSTN, MCA21, DigiLocker).",
  },
  {
    step: 10,
    milestone: "Contract Award",
    title: "10. Tender Award to ABC Technologies",
    route: "/compare?tender_id=7",
    badge: "Contract Awarded",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    actor: "Competent Authority",
    description:
      "Contract for 20,000 laptops is officially awarded to ABC Technologies Private Limited (L1 compliant vendor with resolved commercial terms).",
    keyHighlight:
      "Award triggers post-award delivery milestone tracking and serial-number registry generation.",
    actionHint: "Confirm ABC Technologies as the approved contractor.",
  },
  {
    step: 11,
    milestone: "Delivery Batch Creation",
    title: "11. Delivery Batch Registration",
    route: "/deliveries",
    badge: "Batch #BAT-2026-001",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    actor: "Warehouse / Inward Logistics",
    description:
      "Vendor dispatches Batch BAT-2026-001 (5,000 laptops). Expected specs (Intel i5, 16GB RAM, 512GB SSD, 15.6 FHD) are inherited directly from tender requirements.",
    keyHighlight:
      "Post-award verification guarantees delivered hardware matches tender commitments.",
    actionHint: "View Batch BAT-2026-001 registered for ABC Technologies.",
  },
  {
    step: 12,
    milestone: "QR & Hardware Verification",
    title: "12. Hardware Telemetry & QR Verification",
    route: "/deliveries",
    badge: "Serial Scan: ASSET-2026-001",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    actor: "Receiving Inspector",
    description:
      "Scan Unit 1 (SN-DELL-5530-001). Hardware telemetry queries CPU, RAM, SSD, and display against tender specifications.",
    keyHighlight:
      "Unit 1 is verified with 100% specification match: Intel Core i5, 16GB RAM, 512GB SSD -> PASS.",
    actionHint: "Test scanning asset ASSET-2026-001 using the Quick Test Device buttons.",
  },
  {
    step: 13,
    milestone: "Specification Mismatch",
    title: "13. Critical Hardware Mismatch Detected",
    route: "/deliveries",
    badge: "SSD MISMATCH: 256GB vs 512GB",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    actor: "Automated Verifier",
    description:
      "Scan Unit 3 (ASSET-2026-003 / SN-DELL-5530-MIS-02). System detects SSD size is only 256 GB NVMe SSD instead of mandatory 512 GB SSD.",
    keyHighlight:
      "System flags SPECIFICATION MISMATCH immediately without rejecting the entire shipment automatically.",
    actionHint: "Click test device 'Unit 2 (SSD Mismatch)' or search 'ASSET-2026-003'.",
  },
  {
    step: 14,
    milestone: "Human Inspection & Decision",
    title: "14. Human Physical Inspection Case",
    route: "/inspections",
    badge: "Case #INSP-CASE-001",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    actor: "Physical Inspector / Officer",
    description:
      "Case INSP-CASE-001 opened for Unit 3. Inspector reviews the 13-point physical checklist, examines photos of 256GB SSD packaging, and issues a 'HOLD' pending vendor replacement.",
    keyHighlight:
      "System NEVER rejects or accepts automatically. The human inspector retains full sovereign decision authority.",
    actionHint: "Open Case INSP-CASE-001 to view checklist and recorded HOLD decision.",
  },
  {
    step: 15,
    milestone: "Tamper-Evident Audit Trail",
    title: "15. Tamper-Evident Cryptographic Audit Trail",
    route: "/audit-log",
    badge: "SHA-256 Chained Integrity",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    actor: "Auditor / CVC / CAG",
    description:
      "Every single action across the 14 milestones is cryptographically chained (Event N references Event N-1 hash). Click 'Verify Audit Integrity' to validate zero record tampering.",
    keyHighlight:
      "Ensures non-repudiation, tamper-evidence, and forensic compliance suitable for public scrutiny.",
    actionHint: "Click 'Verify Audit Chain Integrity' to confirm 100% chain validity.",
  },
];

export function GuidedDemoController() {
  const navigate = useNavigate();
  const location = useLocation();

  const [active, setActive] = useState<boolean>(() => {
    return localStorage.getItem("complygem_demo_active") === "true";
  });
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(() => {
    const saved = localStorage.getItem("complygem_demo_step");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [minimized, setMinimized] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("complygem_demo_active", active ? "true" : "false");
  }, [active]);

  useEffect(() => {
    localStorage.setItem("complygem_demo_step", currentStepIdx.toString());
  }, [currentStepIdx]);

  const currentStep = DEMO_STEPS[currentStepIdx] || DEMO_STEPS[0];

  const handleStartDemo = async () => {
    setSeeding(true);
    try {
      toast.loading("Preparing SIH Demonstration Environment...", { id: "seed-toast" });
      const res = await api.seedDemo();
      toast.success("SIH 2026 Demo Environment Ready!", { id: "seed-toast" });
      setActive(true);
      setCurrentStepIdx(0);
      setMinimized(false);
      navigate(DEMO_STEPS[0].route);
    } catch (err: any) {
      toast.error(err?.message || "Failed to initialize demo environment", { id: "seed-toast" });
    } finally {
      setSeeding(false);
    }
  };

  const handleStopDemo = () => {
    setActive(false);
    localStorage.removeItem("complygem_demo_active");
    localStorage.removeItem("complygem_demo_step");
    toast.success("Exited SIH Demonstration Mode");
  };

  const handleStepChange = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= DEMO_STEPS.length) return;
    setCurrentStepIdx(newIdx);
    const targetStep = DEMO_STEPS[newIdx];
    navigate(targetStep.route);
  };

  const handleNext = () => {
    if (currentStepIdx < DEMO_STEPS.length - 1) {
      handleStepChange(currentStepIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      handleStepChange(currentStepIdx - 1);
    }
  };

  if (!active) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          type="button"
          onClick={handleStartDemo}
          disabled={seeding}
          className="group inline-flex items-center gap-2.5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-2xl hover:bg-slate-900 border border-slate-700 transition hover:scale-105 active:scale-95"
          title="Start 15-Stage SIH Evaluation Demo"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-slate-950">
            <Sparkles className="h-3 w-3" />
          </span>
          <div className="text-left">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-amber-400">
              SIH 2026 Evaluation
            </span>
            <span className="block font-semibold">
              {seeding ? "Preparing Demo..." : "Start Guided Demo"}
            </span>
          </div>
          <Play className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    );
  }

  // Active Demo Dock (Floating Controller)
  return (
    <>
      {/* Top Banner indicating Demo Mode */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-amber-500 text-slate-950 px-4 py-1.5 shadow-md flex items-center justify-between text-xs font-semibold border-b border-amber-600 select-none">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex items-center gap-1 rounded bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <Sparkles className="h-2.5 w-2.5" />
            SIH Demo Mode
          </span>
          <span className="hidden sm:inline font-mono text-[11px] text-slate-900">
            [Fictional Procurement Data: GeM Tender ₹10 Cr / 20,000 Laptops]
          </span>
          <span className="text-slate-800 text-[11px] truncate">
            Step {currentStep.step} of 15: <strong className="text-slate-950">{currentStep.milestone}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            className="rounded bg-amber-600/40 hover:bg-amber-600/70 p-1 text-slate-950 transition"
            title={minimized ? "Expand Tour Controller" : "Minimize Tour Controller"}
          >
            {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleStopDemo}
            className="inline-flex items-center gap-1 rounded bg-slate-950 hover:bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-amber-400 transition"
          >
            <X className="h-3 w-3" />
            Exit Demo
          </button>
        </div>
      </div>

      {/* Floating Interactive Dock */}
      {!minimized && (
        <div className="fixed bottom-5 right-5 z-50 w-full max-w-lg rounded-xl border border-slate-300 bg-white/95 backdrop-blur-md p-4 shadow-2xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-amber-400 font-bold text-xs">
                {currentStep.step}
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Milestone {currentStep.step} of 15 • {currentStep.actor}
                </span>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">
                  {currentStep.title}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${currentStep.badgeColor}`}>
                {currentStep.badge}
              </span>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                title="Minimize controller"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="py-3 space-y-2.5">
            <p className="text-xs text-slate-700 leading-relaxed">
              {currentStep.description}
            </p>

            {/* Key Highlight Callout */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block text-[11px]">System Architecture Note:</span>
                  <span className="text-slate-600 text-[11px] leading-tight block">
                    {currentStep.keyHighlight}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Hint */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>Recommended: {currentStep.actionHint}</span>
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-md overflow-hidden mb-3">
            <div
              className="bg-amber-500 h-full transition-all duration-300 rounded-md"
              style={{ width: `${((currentStepIdx + 1) / DEMO_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStepIdx === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <select
                aria-label="Select Demo Step"
                value={currentStepIdx}
                onChange={(e) => handleStepChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                {DEMO_STEPS.map((s, idx) => (
                  <option key={s.step} value={idx}>
                    {s.step}. {s.milestone}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStartDemo()}
                title="Reset/Re-seed Demo Data"
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              {currentStepIdx < DEMO_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
                >
                  Next Step
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopDemo}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete Tour
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
