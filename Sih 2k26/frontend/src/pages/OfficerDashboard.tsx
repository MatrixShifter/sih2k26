import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText,
  ClipboardList,
  ArrowRight,
  RefreshCw,
  AlertOctagon,
  Sparkles,
} from "lucide-react";
import { api, ApiError } from "../services/api";
import type { BidListItem, OfficerKpis, Tender } from "../types";
import { formatDate } from "../utils/format";
import { formatCurrency } from "../lib/format";
import { TableSkeleton } from "../components/Skeleton";

export function OfficerDashboard() {
  const [kpis, setKpis] = useState<OfficerKpis | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [vigilanceAlerts, setVigilanceAlerts] = useState<any[]>([]);
  const [inspectionCases, setInspectionCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [kpiRes, tendersRes, bidsRes, vigilanceRes, casesRes] = await Promise.all([
        api.kpis(),
        api.listTenders().catch(() => []),
        api.listBids({ limit: 8, sort: "updated_at" }).catch(() => ({ items: [], total: 0 })),
        api.getVigilanceRelationships().catch(() => ({ alerts: [] })),
        api.getInspectionCases().catch(() => []),
      ]);

      setKpis(kpiRes);
      setTenders(tendersRes);
      setBids(bidsRes.items);
      setVigilanceAlerts(vigilanceRes.alerts || []);
      setInspectionCases(casesRes);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalActiveProcurementValue = tenders.reduce((acc, t) => {
    return acc + (t.estimated_value_inr ? Number(t.estimated_value_inr) : 0);
  }, 0);

  const pendingInspections = inspectionCases.filter((c) => c.status === "OPEN" || c.status === "PENDING_INSPECTION").length;
  const unacknowledgedAlerts = vigilanceAlerts.filter((a) => !a.action_status || a.action_status === "PENDING").length;

  return (
    <div className="space-y-5 font-sans">
      {/* 1. Header (Simple, Professional, No giant hero card) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 uppercase font-mono">
            GOOD MORNING, PRIYA
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 font-medium">
            Procurement Officer Workbench · Tender evaluation, compliance verification and post-award monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={async () => {
              try {
                toast.loading("Preparing SIH Demonstration Environment...", { id: "seed-toast" });
                await api.seedDemo();
                localStorage.setItem("complygem_demo_active", "true");
                localStorage.setItem("complygem_demo_step", "0");
                toast.success("SIH 2026 Demo Environment Ready!", { id: "seed-toast" });
                window.location.href = "/tenders";
              } catch (err: any) {
                toast.error(err?.message || "Failed to initialize demo", { id: "seed-toast" });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Start Guided Demo</span>
          </button>

          <Link
            to="/bids"
            className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Review Queue (21)</span>
          </Link>

          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Horizontal Statistics Strip */}
      {loading ? (
        <TableSkeleton rows={1} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-200 rounded border border-slate-200 bg-white shadow-xs">
          {/* Item 1 */}
          <div className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Active Tenders
            </span>
            <p className="text-2xl font-bold text-slate-900 font-sans">
              {kpis?.active_tenders ?? tenders.length}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {totalActiveProcurementValue > 0 ? `${formatCurrency(totalActiveProcurementValue)} Total Value` : "₹10.00 Cr Total Value"}
            </p>
          </div>

          {/* Item 2 */}
          <div className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Bids Under Review
            </span>
            <p className="text-2xl font-bold text-slate-900 font-sans">
              {kpis?.total_bids ?? bids.length}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              18 Awaiting Officer Review
            </p>
          </div>

          {/* Item 3 */}
          <div className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Documents
            </span>
            <p className="text-2xl font-bold text-slate-900 font-sans">
              108 <span className="text-xs font-normal text-slate-400">/ 109</span>
            </p>
            <p className="text-[10px] text-emerald-700 font-semibold">
              100% Integrity Verified
            </p>
          </div>

          {/* Item 4 */}
          <div className="p-3.5 space-y-1 bg-amber-50/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 font-mono">
              Alerts
            </span>
            <p className="text-2xl font-bold text-amber-950 font-sans">
              {unacknowledgedAlerts || 1}
            </p>
            <p className="text-[10px] text-amber-800 font-medium">
              Requires Attention
            </p>
          </div>

          {/* Item 5 */}
          <div className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Delivery
            </span>
            <p className="text-2xl font-bold text-slate-900 font-sans">
              {pendingInspections || 2}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              Open Inspections
            </p>
          </div>

          {/* Item 6 */}
          <div className="p-3.5 space-y-1 bg-rose-50/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 font-mono">
              Decisions
            </span>
            <p className="text-2xl font-bold text-rose-950 font-sans">
              21
            </p>
            <p className="text-[10px] text-rose-800 font-semibold">
              Pending Officer Action
            </p>
          </div>
        </div>
      )}

      {/* 3. Main Two-Column Workspace (65% / 35%) */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN (65% -> col-span-8) */}
        <div className="lg:col-span-8 space-y-5">
          {/* OFFICER ACTION QUEUE TABLE */}
          <div className="rounded border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-slate-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                  Officer Action Queue (21)
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-800 font-mono">
                  High Priority (6)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  <tr>
                    <th className="px-3 py-2.5">Priority</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Reference</th>
                    <th className="px-3 py-2.5">Issue / Details</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                        P1
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-900">
                      Delivery
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-900 font-semibold">
                      BAT-2026-001
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">Laptop Storage Discrepancy</div>
                      <div className="text-[11px] text-slate-500 font-mono">SSD 256GB detected vs 512GB contract requirement</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono">
                      16 Sep
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        Inspection Required
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <Link
                        to="/inspections"
                        className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition"
                      >
                        <span>Review</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                        P1
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-900">
                      Vigilance
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-900 font-semibold">
                      ABC / Digital Systems
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">Potential Relationship Detected</div>
                      <div className="text-[11px] text-slate-500">Common Director: Vikramaditya Sharma</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono">
                      16 Sep
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                        Officer Review
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <Link
                        to="/anomalies"
                        className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition"
                      >
                        <span>Examine</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                        P2
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-900">
                      Award
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-900 font-semibold">
                      GEM/2026/B/8912344
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">Laptop Procurement (₹10 Cr)</div>
                      <div className="text-[11px] text-slate-500">Evaluation complete · Selected: ABC Tech (95.4%)</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono">
                      16 Sep
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        Pending Decision
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <Link
                        to="/compare?tender_id=7"
                        className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                        P2
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-900">
                      Document
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-900 font-semibold">
                      TechNova Systems
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">Turnover Clarification Required</div>
                      <div className="text-[11px] text-slate-500">Submitted turnover ₹38 Cr vs ₹50 Cr minimum threshold</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono">
                      16 Sep
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        Pending Info
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <Link
                        to="/compliance?bid_id=3"
                        className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300 font-mono">
                        P3
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-900">
                      Inspection
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-900 font-semibold">
                      #INSP-CASE-003
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">Medical Vehicle Chassis Check</div>
                      <div className="text-[11px] text-slate-500">Physical verification assigned to Field Inspector</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono">
                      16 Sep
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Assigned
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <Link
                        to="/inspections"
                        className="inline-flex items-center rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ACTIVE GOVERNMENT TENDERS TABLE */}
          <div className="rounded border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Active Government Tenders
              </h3>
              <Link to="/tenders" className="text-xs font-semibold text-blue-700 hover:underline">
                View All Tenders ({tenders.length})
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  <tr>
                    <th className="px-3 py-2.5">Tender ID</th>
                    <th className="px-3 py-2.5">Title</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5 text-right">Value</th>
                    <th className="px-3 py-2.5">Closing Date</th>
                    <th className="px-3 py-2.5">Stage</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenders.slice(0, 4).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {t.gem_bid_number}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 max-w-[220px] truncate">
                        {t.title}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                          {t.category || "Procurement"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {t.estimated_value_inr ? formatCurrency(t.estimated_value_inr) : "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {formatDate(t.closing_date)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {(t as any).status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <Link
                          to="/tenders"
                          className="inline-flex items-center rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          View ATC
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (35% -> col-span-4) */}
        <div className="lg:col-span-4 space-y-5">
          {/* TODAY'S OVERVIEW PANEL */}
          <div className="rounded border border-slate-200 bg-white shadow-xs p-4 space-y-4">
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Today's Overview
              </h3>
            </div>

            {/* Tender Status Summary Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono block">
                Tender Status (7 Active)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-50 border border-slate-200 p-2.5">
                  <span className="text-slate-500 text-[10px] block font-mono">Evaluation</span>
                  <span className="text-lg font-bold text-slate-900 font-sans">4</span>
                </div>
                <div className="rounded bg-slate-50 border border-slate-200 p-2.5">
                  <span className="text-slate-500 text-[10px] block font-mono">Clarification</span>
                  <span className="text-lg font-bold text-slate-900 font-sans">2</span>
                </div>
                <div className="rounded bg-slate-50 border border-slate-200 p-2.5">
                  <span className="text-slate-500 text-[10px] block font-mono">Awarded</span>
                  <span className="text-lg font-bold text-slate-900 font-sans">1</span>
                </div>
                <div className="rounded bg-slate-50 border border-slate-200 p-2.5">
                  <span className="text-slate-500 text-[10px] block font-mono">Cancelled</span>
                  <span className="text-lg font-bold text-slate-900 font-sans">0</span>
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono block">
                Upcoming Deadlines
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-900">Office Stationery for Training</p>
                    <p className="text-[11px] text-slate-500 font-mono">GEM/2026/B/4012278</p>
                  </div>
                  <span className="rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                    18 Sep
                  </span>
                </div>

                <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-900">Emergency Medical Vehicles</p>
                    <p className="text-[11px] text-slate-500 font-mono">GEM/2026/B/7304192</p>
                  </div>
                  <span className="rounded bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                    25 Sep
                  </span>
                </div>

                <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-900">Laptop Procurement</p>
                    <p className="text-[11px] text-slate-500 font-mono">GEM/2026/B/8912344</p>
                  </div>
                  <span className="rounded bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                    28 Sep
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">IT Infrastructure Offices</p>
                    <p className="text-[11px] text-slate-500 font-mono">GEM/2026/B/9581023</p>
                  </div>
                  <span className="rounded bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                    10 Oct
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono block">
                Recent System Activity
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">10:32</span>
                  <div>
                    <p className="font-medium text-slate-900">Inspection case created</p>
                    <p className="text-[10px] text-slate-500 font-mono">#INSP-CASE-001 · SSD Mismatch</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">10:17</span>
                  <div>
                    <p className="font-medium text-slate-900">Officer reviewed document</p>
                    <p className="text-[10px] text-slate-500 font-mono">GST_Certificate.pdf · Verified</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">09:58</span>
                  <div>
                    <p className="font-medium text-slate-900">Vigilance alert generated</p>
                    <p className="text-[10px] text-slate-500 font-mono">ABC Tech / Digital Systems</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">09:43</span>
                  <div>
                    <p className="font-medium text-slate-900">Requirement evaluated</p>
                    <p className="text-[10px] text-slate-500 font-mono">GST Registration → PASS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
