import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Search,
  RefreshCw,
  GitCompare,
  Building,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, ApiError } from "../services/api";
import type { BidListItem, BidStatus, Tender } from "../types";
import { formatDate } from "../utils/format";
import { TableSkeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { RiskBadge, StatusBadge } from "../components/RiskBadge";

export function OfficerReviewQueuePage() {
  const navigate = useNavigate();
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [tenderFilter, setTenderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selectedBidIds, setSelectedBidIds] = useState<number[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [bidsRes, tendersRes] = await Promise.all([
        api.listBids({
          q: q || undefined,
          status: statusFilter !== "all" ? (statusFilter as BidStatus) : undefined,
          risk: riskFilter !== "all" ? riskFilter : undefined,
          limit: 50,
          sort: "updated_at",
        }),
        api.listTenders().catch(() => []),
      ]);

      let items = bidsRes.items;
      if (tenderFilter !== "all") {
        const tid = parseInt(tenderFilter, 10);
        items = items.filter((b) => b.tender_id === tid);
      }

      setBids(items);
      setTotal(bidsRes.total);
      setTenders(tendersRes);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderFilter, statusFilter, riskFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadData();
  }

  function toggleSelectBid(id: number) {
    setSelectedBidIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function navigateToCompare() {
    if (selectedBidIds.length < 2) {
      toast.error("Please select at least 2 bids to compare");
      return;
    }
    const firstBid = bids.find((b) => selectedBidIds.includes(b.id));
    const tenderId = firstBid ? firstBid.tender_id : 1;
    navigate(`/compare?tender_id=${tenderId}&bid_ids=${selectedBidIds.join(",")}`);
  }

  // Queue Statistics
  const underReviewCount = bids.filter((b) => b.status === "under_review" || b.status === "submitted").length;
  const highRiskCount = bids.filter((b) => b.risk_level === "high").length;
  const awaitingActionCount = bids.filter((b) => b.verification_status === "verified" && b.status !== "approved" && b.status !== "rejected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-white p-5 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm">
              <ClipboardList className="h-4 w-4" />
            </span>
            <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">
              Procurement Officer Review Queue
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Active bid evaluation workbench. Review submitted bid packets, inspect requirement compliance evidence, verify anomalies, and record human procurement decisions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedBidIds.length > 0 && (
            <button
              type="button"
              onClick={navigateToCompare}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 transition"
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Compare Selected ({selectedBidIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Queue Stat Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Submissions
          </span>
          <p className="mt-1 font-sans text-2xl font-bold text-slate-900">{total}</p>
          <span className="text-[11px] text-slate-500">Across active tenders</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
            Awaiting Officer Action
          </span>
          <p className="mt-1 font-sans text-2xl font-bold text-amber-900">{awaitingActionCount}</p>
          <span className="text-[11px] text-amber-700">Verification complete, decision pending</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Bids Under Review
          </span>
          <p className="mt-1 font-sans text-2xl font-bold text-slate-900">{underReviewCount}</p>
          <span className="text-[11px] text-slate-500">Compliance check completed</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
            High Vigilance Risk
          </span>
          <p className="mt-1 font-sans text-2xl font-bold text-rose-900">{highRiskCount}</p>
          <span className="text-[11px] text-rose-700">Requires enhanced scrutiny</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form
        onSubmit={handleSearch}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 items-end"
      >
        <label className="text-xs font-medium text-slate-600 sm:col-span-2">
          Search Bidder or Reference
          <div className="relative mt-1">
            <input
              type="text"
              placeholder="Search legal name or bid #..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Filter by Tender
          <select
            value={tenderFilter}
            onChange={(e) => setTenderFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs focus:border-slate-400 focus:outline-none"
          >
            <option value="all">All Tenders ({tenders.length})</option>
            {tenders.map((t) => (
              <option key={t.id} value={t.id}>
                {t.gem_bid_number} - {t.title.slice(0, 32)}...
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Review Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs focus:border-slate-400 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="under_review">Under Review</option>
            <option value="submitted">Submitted</option>
            <option value="clarification">Clarification Requested</option>
            <option value="approved">Officer Approved</option>
            <option value="rejected">Officer Rejected</option>
          </select>
        </label>

        <div className="flex gap-2">
          <label className="text-xs font-medium text-slate-600 flex-1">
            Vigilance Risk
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs focus:border-slate-400 focus:outline-none"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 self-end transition"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Information-Dense Review Queue Table */}
      {loading ? (
        <TableSkeleton />
      ) : bids.length === 0 ? (
        <EmptyState
          title="No bids in review queue"
          detail="All bids matching the current filters have been reviewed or no bids are submitted yet."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3 py-3">Bid Reference</th>
                <th className="px-4 py-3">Bidder Organization</th>
                <th className="px-4 py-3">Tender Scope</th>
                <th className="px-3 py-3 text-center">Compliance Score</th>
                <th className="px-3 py-3 text-center">Verification Status</th>
                <th className="px-3 py-3 text-center">Vigilance Risk</th>
                <th className="px-3 py-3 text-center">Officer Decision</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {bids.map((bid) => {
                const isSelected = selectedBidIds.includes(bid.id);
                const score = bid.overall_score ?? 0;

                return (
                  <tr
                    key={bid.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectBid(bid.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        title="Select for comparison"
                      />
                    </td>

                    <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <Link
                        to={`/officer/bid/${bid.id}`}
                        className="text-blue-700 hover:underline hover:text-blue-900"
                      >
                        {bid.reference_code || `BID-${bid.id}`}
                      </Link>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {formatDate(bid.created_at)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {bid.bidder_legal_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Building className="h-3 w-3 text-slate-400" />
                        <span>Supplier #{bid.bidder_id}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 block truncate">
                        {bid.gem_bid_number || `TENDER #${bid.tender_id}`}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {bid.title || "Procurement Contract"}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`font-sans text-sm font-bold ${
                            score >= 80
                              ? "text-emerald-700"
                              : score >= 60
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}
                        >
                          {score}/100
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          bid.verification_status === "verified"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {bid.verification_status === "verified" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-slate-400" />
                        )}
                        {bid.verification_status === "verified" ? "Verified" : "Pending"}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <RiskBadge level={bid.risk_level || "low"} />
                    </td>

                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <StatusBadge value={bid.status} />
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/officer/bid/${bid.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition"
                      >
                        <span>Review Packet</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
