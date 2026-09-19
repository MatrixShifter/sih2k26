import { useEffect, useState } from "react";
import {
  FileText,
  Printer,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { formatDate, formatCurrency } from "../lib/format";
import { RiskBadge } from "../components/RiskBadge";

export function ReportsPage() {
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recFilter, setRecFilter] = useState("all");

  // Inline preview modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewRef, setPreviewRef] = useState<string>("");
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    loadBids();
  }, []);

  async function loadBids() {
    try {
      setLoading(true);
      const res = await api.listBids({});
      setBids(res.items);
    } catch (err) {
      toast.error("Failed to load evaluation packets");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenReport(bidId: number, refCode: string) {
    try {
      setLoadingReport(true);
      setPreviewRef(refCode);
      const html = await api.reportHtml(bidId);
      setPreviewHtml(html);
    } catch (err) {
      toast.error("Failed to generate compliance report");
    } finally {
      setLoadingReport(false);
    }
  }

  function handlePrintDirect(bidId: number) {
    window.open(`http://localhost:8000/api/bids/${bidId}/report`, "_blank");
  }

  const filteredBids = bids.filter((b) => {
    const matchesSearch =
      b.reference_code.toLowerCase().includes(search.toLowerCase()) ||
      b.bidder_legal_name.toLowerCase().includes(search.toLowerCase()) ||
      b.gem_bid_number.toLowerCase().includes(search.toLowerCase()) ||
      b.title.toLowerCase().includes(search.toLowerCase());
    const matchesRec =
      recFilter === "all" || (b.recommendation && b.recommendation.toLowerCase() === recFilter.toLowerCase());
    return matchesSearch && matchesRec;
  });

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
          <span className="rounded bg-teal-100 px-2.5 py-0.5 text-xs font-bold uppercase text-teal-800 border border-teal-200">
            Audit Documentation
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance Evaluation Reports</h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          Generate official, print-ready GeM compliance summaries containing full requirement checklists,
          cross-document anomaly findings, and officer decision override audit trails.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports by bidder, reference code, or GeM tender..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <select
            value={recFilter}
            onChange={(e) => setRecFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All Recommendations</option>
            <option value="approve">Approve</option>
            <option value="request_clarification">Request Clarification</option>
            <option value="reject">Reject</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-3.5 pl-4 pr-3 sm:pl-6">Application Ref</th>
              <th className="px-3 py-3.5">Bidder Entity</th>
              <th className="px-3 py-3.5">Tender Number & Title</th>
              <th className="px-3 py-3.5">Score & Risk</th>
              <th className="px-3 py-3.5">AI Recommendation</th>
              <th className="px-3 py-3.5 text-right pr-4 sm:pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Loading report index...
                </td>
              </tr>
            ) : filteredBids.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No evaluation reports found matching filter.
                </td>
              </tr>
            ) : (
              filteredBids.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 pl-4 pr-3 sm:pl-6">
                    <span className="font-mono font-bold text-slate-900 block">{b.reference_code}</span>
                    <span className="text-[11px] text-slate-400 font-medium">Evaluated: {formatDate(b.updated_at)}</span>
                  </td>

                  <td className="px-3 py-4 text-xs">
                    <span className="font-bold text-slate-900 block">{b.bidder_legal_name}</span>
                    <span className="text-slate-500">Bidder #{b.bidder_id}</span>
                  </td>

                  <td className="px-3 py-4 text-xs">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                      {b.gem_bid_number}
                    </span>
                    <span className="text-slate-600 block mt-1 line-clamp-1">{b.title}</span>
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {b.overall_score !== null ? `${b.overall_score}%` : "—"}
                      </span>
                      {b.risk_level && <RiskBadge risk={b.risk_level} />}
                    </div>
                  </td>

                  <td className="px-3 py-4 text-xs">
                    {b.recommendation ? (
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          b.recommendation === "approve"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : b.recommendation === "reject"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {b.recommendation.replace("_", " ")}
                      </span>
                    ) : (
                      <span className="text-slate-400">Pending</span>
                    )}
                  </td>

                  <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReport(b.id, b.reference_code)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Eye className="h-3.5 w-3.5 text-teal-600" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintDirect(b.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* INLINE REPORT PREVIEW MODAL */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl h-[90vh] rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Official GeM Compliance Evaluation Report</h3>
                <p className="text-xs text-slate-400">Reference: {previewRef}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(previewHtml);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewHtml(null)}
                  className="rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-white"
                >
                  <span className="sr-only">Close</span>
                  &times;
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              <div
                className="bg-white rounded-xl shadow-xs overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
