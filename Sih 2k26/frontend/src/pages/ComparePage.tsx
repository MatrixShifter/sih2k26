import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Building2,
  FileCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Scale,
  FileSearch,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api, ApiError } from "../services/api";
import type { BidDetail, BidListItem, Tender, RequirementResult } from "../types";
import { EvidenceViewerModal } from "../components/EvidenceViewerModal";
import { formatDate, inr } from "../utils/format";

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-300";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-300";
  return "text-rose-700 bg-rose-50 border-rose-300";
}

function riskBadge(risk: string | undefined | null) {
  const r = (risk || "").toLowerCase();
  if (r === "high" || r === "critical") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (r === "medium") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

interface BidPillarScore {
  key: string;
  name: string;
  score: number;
  passed: number;
  total: number;
}

function calculatePillarScores(b: BidDetail): BidPillarScore[] {
  const reqs = b.latest_check?.requirement_results || [];
  const pillars: Record<string, { name: string; passed: number; total: number }> = {
    technical: { name: "Technical Specs", passed: 0, total: 0 },
    financial: { name: "Financial & Turnover", passed: 0, total: 0 },
    legal: { name: "Legal & Statutory", passed: 0, total: 0 },
    experience: { name: "Experience & OEM", passed: 0, total: 0 },
    integrity: { name: "Integrity & Vigilance", passed: 0, total: 0 },
  };

  for (const r of reqs) {
    const cat = (r.category || "").toUpperCase();
    const isPass =
      r.status === "PASS" ||
      r.comparison_result === "COMPLIANT" ||
      r.status === "COMPLIANT";

    let key = "technical";
    if (cat === "FINANCIAL") key = "financial";
    else if (cat === "LEGAL" || cat === "TAX" || cat === "IDENTITY" || cat === "MSME")
      key = "legal";
    else if (cat === "EXPERIENCE" || cat === "AUTHORIZATION") key = "experience";
    else if (cat === "INTEGRITY") key = "integrity";
    else key = "technical";

    pillars[key].total++;
    if (isPass) pillars[key].passed++;
  }

  return Object.entries(pillars).map(([key, data]) => ({
    key,
    name: data.name,
    score: data.total > 0 ? Math.round((data.passed / data.total) * 100) : 100,
    passed: data.passed,
    total: data.total,
  }));
}

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<number | "">("");
  const [tenderBids, setTenderBids] = useState<BidListItem[]>([]);
  const [selectedBidIds, setSelectedBidIds] = useState<number[]>([]);

  const [result, setResult] = useState<{
    tender: Tender;
    bids: BidDetail[];
  } | null>(null);

  // DO NOT rank bidders purely by AI score. Default to alphabetical legal name.
  const [sortBy, setSortBy] = useState<"name" | "ref" | "score" | "risk">("name");

  // Explainable Evidence Modal State
  const [selectedEvidenceData, setSelectedEvidenceData] = useState<{
    req: RequirementResult;
    bid: BidDetail;
  } | null>(null);

  // Filter category in matrix
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Load tenders on mount & parse query parameters
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setLoading(true);
        const allTenders = await api.listTenders();
        if (cancelled) return;
        setTenders(allTenders);

        if (!allTenders.length) {
          setError("No tenders found in the system.");
          return;
        }

        const paramTenderId = searchParams.get("tender_id");
        const paramBidIds = searchParams.get("bid_ids");

        let targetTenderId = paramTenderId ? Number(paramTenderId) : 0;

        if (!targetTenderId || isNaN(targetTenderId)) {
          for (const t of allTenders) {
            try {
              const res = await api.listBids({ tender_id: t.id });
              if (res.items && res.items.length >= 2) {
                targetTenderId = t.id;
                break;
              }
            } catch {
              // continue check
            }
          }
          if (!targetTenderId) {
            targetTenderId = allTenders[0].id;
          }
        }

        setSelectedTenderId(targetTenderId);

        const bidRes = await api.listBids({ tender_id: targetTenderId });
        if (cancelled) return;
        setTenderBids(bidRes.items);

        let initialSelectedIds: number[] = [];
        if (paramBidIds) {
          const parsed = paramBidIds
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0);
          const availableIds = new Set(bidRes.items.map((b) => b.id));
          const validParamIds = parsed.filter((id) => availableIds.has(id));
          if (validParamIds.length >= 2) {
            initialSelectedIds = validParamIds;
          }
        }

        if (initialSelectedIds.length < 2 && bidRes.items.length >= 2) {
          initialSelectedIds = bidRes.items.slice(0, 4).map((b) => b.id);
        }

        setSelectedBidIds(initialSelectedIds);

        if (initialSelectedIds.length >= 2) {
          await executeCompare(targetTenderId, initialSelectedIds);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load tenders for comparison.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTenderChange(newTenderId: number) {
    setSelectedTenderId(newTenderId);
    setError(null);
    setResult(null);

    try {
      const bidRes = await api.listBids({ tender_id: newTenderId });
      setTenderBids(bidRes.items);

      if (bidRes.items.length >= 2) {
        const topIds = bidRes.items.slice(0, 4).map((b) => b.id);
        setSelectedBidIds(topIds);
        setSearchParams({ tender_id: String(newTenderId), bid_ids: topIds.join(",") });
        await executeCompare(newTenderId, topIds);
      } else {
        setSelectedBidIds(bidRes.items.map((b) => b.id));
        setSearchParams({ tender_id: String(newTenderId) });
        if (bidRes.items.length === 0) {
          setError("This tender does not have any submitted bids yet.");
        } else {
          setError("This tender has only 1 bid submitted. At least 2 bids are required for side-by-side comparison.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load bids for selected tender.");
    }
  }

  function toggleBid(bidId: number) {
    const updated = selectedBidIds.includes(bidId)
      ? selectedBidIds.filter((id) => id !== bidId)
      : [...selectedBidIds, bidId];

    setSelectedBidIds(updated);
    if (selectedTenderId) {
      setSearchParams({
        tender_id: String(selectedTenderId),
        bid_ids: updated.join(","),
      });
    }
  }

  async function executeCompare(tId: number, bIds: number[]) {
    if (!tId || bIds.length < 2) {
      setError("Please select a tender and at least 2 bids to compare side-by-side.");
      return;
    }

    try {
      setComparing(true);
      setError(null);
      const comparison = await api.compare(tId, bIds);
      setResult({ tender: comparison.tender, bids: comparison.bids });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Unable to load bid comparison.";
      setError(msg);
      toast.error(msg);
    } finally {
      setComparing(false);
    }
  }

  function handleManualCompare() {
    if (!selectedTenderId) {
      setError("Please select a tender.");
      return;
    }
    if (selectedBidIds.length < 2) {
      setError("Please select at least 2 bids to compare.");
      return;
    }
    setSearchParams({
      tender_id: String(selectedTenderId),
      bid_ids: selectedBidIds.join(","),
    });
    void executeCompare(Number(selectedTenderId), selectedBidIds);
  }

  const displayedBids = useMemo(() => {
    if (!result) return [];
    return [...result.bids].sort((left, right) => {
      if (sortBy === "name") {
        return left.bidder.legal_name.localeCompare(right.bidder.legal_name);
      }
      if (sortBy === "ref") {
        return left.reference_code.localeCompare(right.reference_code);
      }
      if (sortBy === "score") {
        return (
          (right.latest_check?.overall_score ?? -1) -
          (left.latest_check?.overall_score ?? -1)
        );
      }
      if (sortBy === "risk") {
        const rOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const lRisk = rOrder[left.latest_check?.risk_level || "low"] || 0;
        const rRisk = rOrder[right.latest_check?.risk_level || "low"] || 0;
        return rRisk - lRisk;
      }
      return 0;
    });
  }, [result, sortBy]);

  // Aggregate unique requirements from all bids to build side-by-side ATC compliance matrix
  const matrixRequirements = useMemo(() => {
    if (!result || !result.bids.length) return [];
    const map = new Map<
      number | string,
      {
        id: number | string;
        text: string;
        title: string;
        category: string;
        mandatory: boolean;
        expected_value_display?: string;
        comparison_operator?: string;
      }
    >();

    for (const b of result.bids) {
      const reqList = b.latest_check?.requirement_results || [];
      for (const r of reqList) {
        const key = r.requirement_id || r.requirement_text || r.requirement;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            text: r.requirement_text || r.requirement || "ATC Requirement",
            title: r.title || r.requirement_text || r.requirement,
            category: r.category || "GENERAL",
            mandatory: Boolean(r.mandatory),
            expected_value_display: r.expected_value_display || r.required_value,
            comparison_operator: r.comparison_operator,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [result]);

  const filteredMatrixRequirements = useMemo(() => {
    if (categoryFilter === "ALL") return matrixRequirements;
    return matrixRequirements.filter((r) => r.category.toUpperCase() === categoryFilter);
  }, [matrixRequirements, categoryFilter]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    matrixRequirements.forEach((r) => set.add(r.category.toUpperCase()));
    return Array.from(set);
  }, [matrixRequirements]);

  // Bidder Summary Statistics Calculation
  const bidderStats = useMemo(() => {
    if (!result) return new Map<number, any>();
    const statsMap = new Map<number, any>();

    for (const b of result.bids) {
      const reqList = b.latest_check?.requirement_results || [];
      const passedCount = reqList.filter(
        (r) =>
          r.status === "PASS" ||
          r.comparison_result === "COMPLIANT" ||
          r.status === "COMPLIANT"
      ).length;
      const failedCount = reqList.filter(
        (r) =>
          r.status === "FAIL" ||
          r.comparison_result === "NON-COMPLIANT" ||
          r.comparison_result === "NON_COMPLIANT" ||
          r.status === "NON-COMPLIANT" ||
          r.status === "EXPIRED"
      ).length;
      const reviewCount = reqList.filter(
        (r) =>
          r.status === "NEEDS_REVIEW" ||
          r.comparison_result === "NEEDS REVIEW" ||
          r.status === "PARTIAL" ||
          r.comparison_result === "MISMATCH"
      ).length;
      const criticalFailures = reqList.filter(
        (r) =>
          r.mandatory &&
          (r.status === "FAIL" ||
            r.comparison_result === "NON-COMPLIANT" ||
            r.status === "EXPIRED" ||
            r.status === "NOT_EVALUATED")
      ).length;

      const pillars = calculatePillarScores(b);

      statsMap.set(b.id, {
        overallScore: Math.round(b.latest_check?.overall_score ?? 0),
        passedCount,
        failedCount,
        reviewCount,
        criticalFailures,
        pillars,
      });
    }

    return statsMap;
  }, [result]);

  function exportCsv() {
    if (!result) return;

    const rows: string[][] = [];
    rows.push(["GOVERNMENT PROCUREMENT COMMITTEE - MULTI-BID COMPARISON EVALUATION SHEET"]);
    rows.push([`Tender GEM Bid Number: ${result.tender.gem_bid_number}`, `Tender Title: ${result.tender.title}`]);
    rows.push([`Department: ${result.tender.department}`, `Estimated Value: INR ${result.tender.estimated_value_inr}`]);
    rows.push([`Export Date: ${new Date().toLocaleDateString("en-IN")}`, "Status: STATUTORY HUMAN DECISION PENDING"]);
    rows.push([
      "NOTICE: Compliance scores reflect automated AI rule matching only. Bidders are not auto-ranked. Procurement decision rests exclusively with the Procurement Officer.",
    ]);
    rows.push([]);

    // Headers
    const headers = [
      "Evaluation Metric / Requirement",
      "Category",
      "Mandatory",
      "Expected Condition",
      ...displayedBids.map((b) => `${b.bidder.legal_name} [${b.reference_code}]`),
    ];
    rows.push(headers);

    // Executive Metrics Rows
    rows.push([
      "Overall Compliance Score (0-100)",
      "OVERALL",
      "—",
      "Qualifying Benchmark",
      ...displayedBids.map((b) => `${bidderStats.get(b.id)?.overallScore ?? 0}/100`),
    ]);

    rows.push([
      "Passed Criteria Count",
      "METRICS",
      "—",
      "Satisfied",
      ...displayedBids.map((b) => `${bidderStats.get(b.id)?.passedCount ?? 0}`),
    ]);

    rows.push([
      "Failed Criteria Count",
      "METRICS",
      "—",
      "Zero Preferred",
      ...displayedBids.map((b) => `${bidderStats.get(b.id)?.failedCount ?? 0}`),
    ]);

    rows.push([
      "Criteria Needing Officer Review",
      "METRICS",
      "—",
      "Officer Attention",
      ...displayedBids.map((b) => `${bidderStats.get(b.id)?.reviewCount ?? 0}`),
    ]);

    rows.push([
      "Critical Mandatory Failures",
      "METRICS",
      "YES",
      "0 Mandatory Failures Required",
      ...displayedBids.map((b) => `${bidderStats.get(b.id)?.criticalFailures ?? 0}`),
    ]);

    // Pillar scores rows
    const samplePillars = bidderStats.get(displayedBids[0]?.id)?.pillars || [];
    for (const p of samplePillars) {
      rows.push([
        `Pillar: ${p.name}`,
        "PILLAR",
        "—",
        "Pillar Pass Rate",
        ...displayedBids.map((b) => {
          const cur = bidderStats.get(b.id)?.pillars?.find((x: any) => x.key === p.key);
          return `${cur?.score ?? 0}% (${cur?.passed ?? 0}/${cur?.total ?? 0})`;
        }),
      ]);
    }

    rows.push([]);
    rows.push(["--- DETAILED ATC RULE BY RULE COMPLIANCE MATRIX ---"]);

    // Requirement Rows
    for (const req of matrixRequirements) {
      const row = [
        req.title,
        req.category,
        req.mandatory ? "MANDATORY" : "OPTIONAL",
        req.expected_value_display || "Specified in ATC",
      ];
      for (const b of displayedBids) {
        const match = b.latest_check?.requirement_results?.find(
          (r) =>
            (r.requirement_id && r.requirement_id === req.id) ||
            r.requirement_text === req.text ||
            r.requirement === req.text
        );
        if (match) {
          const st = match.status || match.comparison_result;
          const ext = match.extracted_value_display || "";
          const doc = match.source_document ? `[Doc: ${match.source_document} p.${match.source_page || 1}]` : "";
          row.push(`${st} | ${ext} ${doc} - ${match.explanation || ""}`);
        } else {
          row.push("NOT EVALUATED | Supporting artefact not provided");
        }
      }
      rows.push(row);
    }

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `GeM-Committee-Comparison-${result.tender.gem_bid_number}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Procurement committee matrix exported to CSV!");
  }

  function handleOpenEvidence(reqItem: (typeof matrixRequirements)[0], bid: BidDetail) {
    const match = bid.latest_check?.requirement_results?.find(
      (r) =>
        (r.requirement_id && r.requirement_id === reqItem.id) ||
        r.requirement_text === reqItem.text ||
        r.requirement === reqItem.text
    );

    const requirementRecord: RequirementResult = match || {
      requirement_id: typeof reqItem.id === "number" ? reqItem.id : 0,
      requirement: reqItem.text,
      title: reqItem.title,
      category: reqItem.category,
      mandatory: reqItem.mandatory,
      evidence: "Required evidence artefact",
      status: "NOT_EVALUATED",
      comparison_result: "NOT_EVALUATED",
      confidence: 0,
      reason: "This requirement was not evaluated or supporting artefact was not submitted by bidder.",
      source_document: null,
      source_page: null,
      extracted_text_snippet: null,
      expected_value_display: reqItem.expected_value_display,
      comparison_operator: reqItem.comparison_operator,
    };

    setSelectedEvidenceData({
      req: requirementRecord,
      bid,
    });
  }

  return (
    <div className="space-y-5">
      {/* TOP TITLE & CSV EXPORT HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/officer/dashboard" className="hover:text-slate-900 flex items-center gap-1 font-medium">
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-slate-700 font-semibold">Procurement Committee Multi-Bid Matrix</span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
            <Scale className="h-7 w-7 text-teal-600" />
            Multi-Bid Comparison Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Side-by-side compliance verification across multiple tender bids with clickable evidence inspection.
          </p>
        </div>

        {result && (
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-teal-600" />
            <span>Export Evaluation Sheet (CSV)</span>
          </button>
        )}
      </div>

      {/* STATUTORY PROCUREMENT NOTICE BANNER */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50/80 via-white to-slate-50/80 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-600 p-2 text-white shrink-0 mt-0.5 shadow-xs">
            <Scale className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-teal-900">
                Statutory Human Authority Notice — Rule 173 GFR 2017
              </h3>
              <span className="bg-teal-100 text-teal-800 px-2 py-0.2 rounded text-[10px] font-bold uppercase">
                AI Decision Support Only
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Compliance Score ≠ Procurement Decision.</strong> Bidders are not auto-ranked or disqualified by AI.
              The AI compliance matrix provides verified document evidence and rule checks. Final commercial evaluation,
              L1 determination, and contract award remain the exclusive statutory responsibility of the Procurement Committee.
            </p>
          </div>
        </div>
      </div>

      {/* TENDER PICKER & BID SELECTION BAR */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="grid gap-4 lg:grid-cols-[340px_1fr_auto] items-start">
          {/* Tender Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Procurement Tender Packet
            </label>
            <select
              value={selectedTenderId}
              onChange={(e) => handleTenderChange(Number(e.target.value))}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none shadow-sm"
            >
              {tenders.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.gem_bid_number} — {t.title.slice(0, 38)}...
                </option>
              ))}
            </select>
          </div>

          {/* Bid Selector Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Bidders to Compare ({selectedBidIds.length} of {tenderBids.length} selected)
              </label>
              {tenderBids.length >= 2 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBidIds(tenderBids.map((b) => b.id))}
                    className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBidIds([])}
                    className="text-[11px] font-medium text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {tenderBids.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                No submitted bids found for this tender.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {tenderBids.map((bid) => {
                  const isSelected = selectedBidIds.includes(bid.id);
                  return (
                    <button
                      key={bid.id}
                      type="button"
                      onClick={() => toggleBid(bid.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? "border-teal-500 bg-teal-50 text-teal-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isSelected ? "bg-teal-600 ring-2 ring-teal-200" : "bg-slate-300"
                        }`}
                      />
                      <span>{bid.bidder_legal_name}</span>
                      <span className="font-mono text-[10px] text-slate-400 font-normal">
                        ({bid.reference_code})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <div className="flex flex-col justify-end h-full pt-4 lg:pt-0">
            <button
              type="button"
              disabled={comparing || selectedBidIds.length < 2}
              onClick={handleManualCompare}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{comparing ? "Comparing..." : "Update Comparison"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-800">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* COMPARISON CONTENT */}
      {result && result.bids.length > 0 && (
        <div className="space-y-5">
          
          {/* TENDER OVERVIEW & SORTING CONTROLS */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                  Tender ATC Specification
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs font-mono font-bold text-slate-700">{result.tender.gem_bid_number}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                {result.tender.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span>{result.tender.department}</span>
                <span>&bull;</span>
                <span>Estimated Value: <strong>{inr(result.tender.estimated_value_inr)}</strong></span>
                <span>&bull;</span>
                <span>Comparing <strong>{displayedBids.length} Bidders</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                Display Order:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none shadow-sm"
              >
                <option value="name">Supplier Legal Name (A-Z)</option>
                <option value="ref">Submission Reference Code</option>
                <option value="score">Compliance Score (Informational Only)</option>
                <option value="risk">Risk Assessment Level</option>
              </select>
            </div>
          </div>

          {/* 1. EXECUTIVE BIDDER SUMMARY & PILLAR CARDS */}
          <div
            className={`grid gap-4 ${
              displayedBids.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : displayedBids.length === 3
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
            }`}
          >
            {displayedBids.map((bid) => {
              const stats = bidderStats.get(bid.id) || {
                overallScore: 0,
                passedCount: 0,
                failedCount: 0,
                reviewCount: 0,
                criticalFailures: 0,
                pillars: [],
              };
              const risk = bid.latest_check?.risk_level;

              return (
                <div
                  key={bid.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="inline-block font-mono text-[10px] text-slate-400 font-bold">
                          {bid.reference_code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">
                          {bid.bidder.legal_name}
                        </h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{bid.bidder.state || "India"} &bull; {bid.bidder.trade_name || "Registered"}</span>
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border shrink-0 ${riskBadge(
                          risk
                        )}`}
                      >
                        {risk || "Low"} Risk
                      </span>
                    </div>

                    {/* Overall Compliance Score Card */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">AI Compliance Score</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold border ${scoreColor(
                            stats.overallScore
                          )}`}
                        >
                          {stats.overallScore}/100
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            stats.overallScore >= 80
                              ? "bg-emerald-500"
                              : stats.overallScore >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, stats.overallScore))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block italic">
                        Informational benchmark only
                      </span>
                    </div>

                    {/* Requirements Breakdown Metrics */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/80 p-2">
                        <span className="text-xs font-extrabold text-emerald-800 block">
                          {stats.passedCount}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                          Passed
                        </span>
                      </div>
                      <div className="rounded-lg bg-rose-50/70 border border-rose-200/80 p-2">
                        <span className="text-xs font-extrabold text-rose-800 block">
                          {stats.failedCount}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700">
                          Failed
                        </span>
                      </div>
                      <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2">
                        <span className="text-xs font-extrabold text-amber-800 block">
                          {stats.reviewCount}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">
                          Review
                        </span>
                      </div>
                    </div>

                    {/* Critical Requirement Failures Alert */}
                    <div
                      className={`rounded-xl p-2.5 text-xs border ${
                        stats.criticalFailures > 0
                          ? "bg-rose-50 text-rose-900 border-rose-200 font-semibold"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-bold">
                          Critical Failures:
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            stats.criticalFailures > 0 ? "text-rose-700" : "text-emerald-700"
                          }`}
                        >
                          {stats.criticalFailures > 0 ? `${stats.criticalFailures} Mandatory Failed` : "0 Critical Gaps"}
                        </span>
                      </div>
                    </div>

                    {/* Pillar Scores Section */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Compliance Pillar Scores:
                      </span>
                      {stats.pillars.map((p: BidPillarScore) => (
                        <div key={p.key} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600">{p.name}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {p.score}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                p.score >= 80 ? "bg-teal-600" : p.score >= 60 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, p.score))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {bid.documents?.length || 0} Artefacts
                    </span>
                    <Link
                      to={`/officer/bid/${bid.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 transition underline decoration-teal-300"
                    >
                      <span>Full Bid Dossier</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. ROW-BY-ROW REQUIREMENTS COMPLIANCE MATRIX */}
          <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            {/* Table Controls Header */}
            <div className="border-b border-slate-200/80 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Row-by-Row Tender Requirement Evaluation Matrix ({matrixRequirements.length} Criteria)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any cell to open explainable evidence, OCR source document, and verification reasoning.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    categoryFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  All ({matrixRequirements.length})
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      categoryFilter === cat
                        ? "bg-teal-700 text-white"
                        : "text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100/90 font-bold text-slate-700 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4 min-w-[280px]">Tender Clause / Requirement</th>
                    {displayedBids.map((b) => (
                      <th key={b.id} className="py-3 px-4 min-w-[220px] text-center border-l border-slate-200">
                        <div className="font-bold text-slate-900 truncate">{b.bidder.legal_name}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal">
                          {b.reference_code}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMatrixRequirements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={displayedBids.length + 1}
                        className="py-10 text-center text-xs text-slate-400"
                      >
                        No requirements match this category filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrixRequirements.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition">
                        {/* Requirement Specification Column */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-600 border border-slate-200">
                              {req.category}
                            </span>
                            {req.mandatory && (
                              <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 border border-rose-200">
                                Mandatory
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-bold text-slate-900 text-xs leading-snug">
                            {req.title}
                          </p>
                          {req.expected_value_display && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Expected: {req.comparison_operator ? `${req.comparison_operator} ` : ""}{req.expected_value_display}
                            </div>
                          )}
                        </td>

                        {/* Each Bidder's Cell */}
                        {displayedBids.map((b) => {
                          const match = b.latest_check?.requirement_results?.find(
                            (r) =>
                              (r.requirement_id && r.requirement_id === req.id) ||
                              r.requirement_text === req.text ||
                              r.requirement === req.text
                          );

                          const rawStatus = (match?.comparison_result || match?.status || "NOT_EVALUATED").toUpperCase();
                          const isPass = rawStatus === "PASS" || rawStatus === "COMPLIANT";
                          const isFail =
                            rawStatus === "FAIL" ||
                            rawStatus === "NON-COMPLIANT" ||
                            rawStatus === "EXPIRED" ||
                            rawStatus === "MISSING";
                          const isReview =
                            rawStatus === "NEEDS_REVIEW" ||
                            rawStatus === "NEEDS REVIEW" ||
                            rawStatus === "PARTIAL" ||
                            rawStatus === "MISMATCH";
                          const isNotEval = !match || rawStatus === "NOT_EVALUATED";

                          const cellStatus = isPass ? "PASS" : isFail ? "FAIL" : isReview ? "NEEDS REVIEW" : "NOT EVALUATED";

                          return (
                            <td key={b.id} className="py-3 px-3 text-center border-l border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleOpenEvidence(req, b)}
                                className={`w-full text-left p-2.5 rounded-xl border transition shadow-sm group cursor-pointer ${
                                  isPass
                                    ? "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300"
                                    : isFail
                                    ? "bg-rose-50/50 border-rose-200 hover:bg-rose-100/70 hover:border-rose-300"
                                    : isReview
                                    ? "bg-amber-50/50 border-amber-200 hover:bg-amber-100/70 hover:border-amber-300"
                                    : "bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                }`}
                                title="Click to view explainable evidence and OCR source document"
                              >
                                {/* Status Pill Header */}
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-extrabold uppercase tracking-wide border ${
                                      isPass
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                        : isFail
                                        ? "bg-rose-100 text-rose-800 border-rose-300"
                                        : isReview
                                        ? "bg-amber-100 text-amber-800 border-amber-300"
                                        : "bg-slate-200 text-slate-700 border-slate-300"
                                    }`}
                                  >
                                    {isPass && <CheckCircle2 className="h-3 w-3" />}
                                    {isFail && <XCircle className="h-3 w-3" />}
                                    {isReview && <AlertTriangle className="h-3 w-3" />}
                                    <span>{cellStatus}</span>
                                  </span>

                                  <span className="text-[10px] text-teal-700 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 font-bold transition">
                                    <FileSearch className="h-3 w-3" />
                                    <span>Evidence</span>
                                  </span>
                                </div>

                                {/* Extracted Value Snippet */}
                                <div className="text-[11px] font-mono font-medium text-slate-800 truncate" title={match?.extracted_value_display || "Not Provided"}>
                                  {match?.extracted_value_display || (match?.extracted_values ? JSON.stringify(match.extracted_values).slice(0, 24) : "—")}
                                </div>

                                {/* Document / Citation preview */}
                                <div className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                                  {match?.source_document ? (
                                    <>
                                      <FileCheck className="h-2.5 w-2.5 text-teal-600 shrink-0" />
                                      <span className="truncate">{match.source_document}</span>
                                      {match.source_page && <span className="text-slate-400">p.{match.source_page}</span>}
                                    </>
                                  ) : (
                                    <span className="italic text-slate-400">No artefact</span>
                                  )}
                                </div>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXPLAINABLE EVIDENCE VIEWER MODAL */}
      {selectedEvidenceData && (
        <EvidenceViewerModal
          requirement={selectedEvidenceData.req}
          bidReference={selectedEvidenceData.bid.reference_code}
          bidderLegalName={selectedEvidenceData.bid.bidder.legal_name}
          onClose={() => setSelectedEvidenceData(null)}
        />
      )}
    </div>
  );
}
