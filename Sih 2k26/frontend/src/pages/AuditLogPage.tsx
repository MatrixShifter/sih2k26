import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  List,
  Clock,
  User as UserIcon,
  FileText,
  ArrowRight,
  Shield,
  Terminal,
  Play,
  RotateCcw,
} from "lucide-react";
import { api, ApiError } from "../api";
import type { AuditLog, AuditIntegrityResult } from "../types";
import { formatDateTime } from "../lib/format";
import { EmptyState } from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeleton";

export function AuditLogPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  // Filters
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [skip, setSkip] = useState(0);

  // Integrity Check State
  const [integrityModalOpen, setIntegrityModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<AuditIntegrityResult | null>(null);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Expanded payloads in timeline
  const [expandedPayloads, setExpandedPayloads] = useState<Record<number, boolean>>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  async function load(nextSkip = skip) {
    setLoading(true);
    try {
      const res = await api.listAudit({
        q,
        action,
        result,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        skip: nextSkip,
        limit: 20,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load audit trail"
      );
    } finally {
      setLoading(false);
    }
  }

  // Load audit trail on filter or page change
  useEffect(() => {
    void load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick background verification check on mount to update top badge
  useEffect(() => {
    api.verifyAuditIntegrity()
      .then((res) => setIntegrityResult(res))
      .catch(() => {});
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSkip(0);
    void load(0);
  }

  function resetFilters() {
    setQ("");
    setAction("");
    setResult("");
    setDateFrom("");
    setDateTo("");
    setSkip(0);
    setTimeout(() => {
      void api.listAudit({ limit: 20 }).then((res) => {
        setItems(res.items);
        setTotal(res.total);
      });
    }, 50);
  }

  async function runIntegrityVerification() {
    setVerifying(true);
    setIntegrityModalOpen(true);
    try {
      const res = await api.verifyAuditIntegrity();
      setIntegrityResult(res);
      if (res.is_valid) {
        toast.success(`Ledger Verified Intact: All ${res.total_events} events cryptographically sealed.`);
      } else {
        toast.error(`Tampering Detected: ${res.broken_chain_count} broken hash chain links found!`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Integrity check failed");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSimulateTampering() {
    if (!items.length) return;
    const target = items[0];
    setTamperLoading(true);
    try {
      const res = await api.simulateAuditTampering(target.id);
      toast.success(res.message);
      // Re-verify immediately to reveal the tamper detection
      const verifyRes = await api.verifyAuditIntegrity();
      setIntegrityResult(verifyRes);
      void load(skip);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Tampering simulation failed");
    } finally {
      setTamperLoading(false);
    }
  }

  async function handleRestoreChain() {
    setRestoreLoading(true);
    try {
      const res = await api.restoreAuditChain();
      toast.success(`Audit trail restored and ${res.events_resealed} blocks cryptographically resealed.`);
      // Re-verify
      const verifyRes = await api.verifyAuditIntegrity();
      setIntegrityResult(verifyRes);
      void load(skip);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Chain restoration failed");
    } finally {
      setRestoreLoading(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    toast.success("Hash copied to clipboard");
    setTimeout(() => setCopiedHash(null), 2000);
  }

  function togglePayload(id: number) {
    setExpandedPayloads((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function exportCsv() {
    const rows = [
      [
        "Sequence",
        "Timestamp",
        "Action",
        "Actor",
        "Role",
        "Entity Type",
        "Entity ID",
        "Result",
        "Previous Value",
        "New Value",
        "Officer Reason",
        "Previous Hash",
        "Event Hash",
        "Detail",
      ],
      ...items.map((row) => [
        row.sequence_number ?? row.id,
        formatDateTime(row.created_at),
        row.action,
        row.actor_name ?? "System",
        row.actor_role ?? "SYSTEM",
        row.entity_type,
        row.entity_id ?? "",
        row.result ?? "",
        typeof row.previous_value === "object"
          ? JSON.stringify(row.previous_value)
          : row.previous_value ?? "",
        typeof row.new_value === "object"
          ? JSON.stringify(row.new_value)
          : row.new_value ?? "",
        row.reason ?? "",
        row.previous_event_hash ?? "",
        row.event_hash ?? "",
        row.detail,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `complygem-tamper-evident-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function getActionBadgeStyle(act: string) {
    if (act.includes("decision") || act.includes("award") || act.includes("complete")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (act.includes("alert") || act.includes("vigilance") || act.includes("mismatch")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (act.includes("verify") || act.includes("scan") || act.includes("inspect")) {
      return "bg-blue-50 text-blue-800 border-blue-200";
    }
    if (act.includes("create") || act.includes("upload")) {
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Verification Bar */}
      <div className="flex flex-col gap-4 rounded-xl bg-gradient-to-r from-slate-900 via-navy to-slate-900 p-6 text-white shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/40">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Tamper-Evident Audit Log
                </h1>
                <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-400/30">
                  SHA-256 Chained
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Cryptographically chained audit ledger with deterministic hash verification. Every tender, evaluation, transition, and human officer decision is immutably linked.
              </p>
            </div>
          </div>

          {/* Quick Integrity Status Banner */}
          {integrityResult && (
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                  integrityResult.is_valid
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse"
                }`}
              >
                {integrityResult.is_valid ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Cryptographic Ledger: VERIFIED INTACT ({integrityResult.total_events} blocks)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <span>LEDGER COMPROMISED: {integrityResult.broken_chain_count} broken hash links detected!</span>
                  </>
                )}
              </div>
              <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                Head Hash: {integrityResult.head_hash ? integrityResult.head_hash.slice(0, 16) + "..." : "Genesis"}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={runIntegrityVerification}
            disabled={verifying}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all disabled:opacity-50"
          >
            {verifying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-blue-200" />
            )}
            Verify Audit Integrity
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-800/80 px-3.5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 active:scale-95 transition-all"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>

          {/* View Toggle */}
          <div className="inline-flex rounded-xl bg-slate-800/90 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "timeline"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" /> Chain Timeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Ledger Table
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form
        onSubmit={onSearch}
        className="grid gap-3 rounded-xl bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-6 items-end"
      >
        <label className="text-xs font-medium text-slate-600 sm:col-span-2">
          Search Events
          <div className="relative mt-1">
            <input
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Search details, actor, action or hash..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Filter Action
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">All Action Types</option>
            <option value="tender.">Tender Lifecycle</option>
            <option value="document.">Document Upload & OCR</option>
            <option value="compliance.">AI Compliance Verification</option>
            <option value="registry.">Registry Check</option>
            <option value="vigilance.">Vigilance & Collusion</option>
            <option value="delivery.">Delivery Verification</option>
            <option value="inspection.">Human Inspection</option>
            <option value="bid.decision">Final Officer Decision</option>
            <option value="user.login">Authentication</option>
          </select>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Result Filter
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          >
            <option value="">All Results</option>
            <option value="success">Success / Verified</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="mismatch">Specification Mismatch</option>
            <option value="alert">Alert Generated</option>
          </select>
        </label>

        <label className="text-xs font-medium text-slate-600">
          From Date
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-all shadow-sm"
          >
            Search
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
            title="Reset Filters"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Main Content Area */}
      {loading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="No audit events found"
          detail="No events matched your current search filters. Clear filters to view the complete ledger."
        />
      ) : viewMode === "timeline" ? (
        /* Visual Chained Timeline View */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Cryptographic Chain Timeline (Top is Latest Block)</span>
            <span>Total Events: {total}</span>
          </div>

          <div className="relative pl-6 sm:pl-8 before:absolute before:bottom-3 before:left-[17px] sm:before:left-[21px] before:top-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-indigo-400 before:to-slate-300">
            <div className="space-y-6">
              {items.map((row) => {
                const seq = row.sequence_number ?? row.id;
                const isExpanded = expandedPayloads[row.id] || false;
                const prevHashShort = row.previous_event_hash
                  ? row.previous_event_hash.slice(0, 8) + "..." + row.previous_event_hash.slice(-6)
                  : "00000000...000000";
                const hashShort = row.event_hash
                  ? row.event_hash.slice(0, 8) + "..." + row.event_hash.slice(-6)
                  : "NOT_SEALED";

                const canonicalPayload = {
                  seq: seq,
                  action: row.action,
                  actor_role: row.actor_role,
                  actor_user_id: row.actor_user_id,
                  detail: row.detail,
                  entity_id: row.entity_id,
                  entity_type: row.entity_type,
                  new_value: row.new_value,
                  prev_hash: row.previous_event_hash,
                  previous_value: row.previous_value,
                  reason: row.reason,
                };

                return (
                  <div key={row.id} className="relative group">
                    {/* Chaining Node Dot */}
                    <div className="absolute -left-[30px] sm:-left-[34px] top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white border-2 border-blue-500 shadow-sm group-hover:border-indigo-600 transition-colors">
                      <LinkIcon className="h-3.5 w-3.5 text-blue-600" />
                    </div>

                    {/* Timeline Event Card */}
                    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card hover:shadow-md transition-shadow">
                      {/* Top Row: Sequence, Action Badge, Timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-blue-300">
                            #{String(seq).padStart(4, "0")}
                          </span>
                          <span
                            className={`rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${getActionBadgeStyle(
                              row.action
                            )}`}
                          >
                            {row.action}
                          </span>
                          {row.result && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              Result: {row.result}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <time dateTime={row.created_at}>
                            {formatDateTime(row.created_at)}
                          </time>
                        </div>
                      </div>

                      {/* Middle Row: Cryptographic Hash Link Bar */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-xs font-mono text-slate-600 border border-slate-200/60">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Prev Hash:</span>
                          <span
                            className="text-slate-700 cursor-pointer hover:underline"
                            title={row.previous_event_hash ?? "Genesis"}
                            onClick={() =>
                              copyToClipboard(row.previous_event_hash ?? "", `prev-${row.id}`)
                            }
                          >
                            {prevHashShort}
                          </span>
                          {copiedHash === `prev-${row.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy
                              className="h-3 w-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                              onClick={() =>
                                copyToClipboard(row.previous_event_hash ?? "", `prev-${row.id}`)
                              }
                            />
                          )}
                        </div>

                        <ArrowRight className="h-3 w-3 text-blue-500 mx-1 hidden sm:inline" />

                        <div className="flex items-center gap-1">
                          <span className="text-blue-600 font-semibold">Block Hash:</span>
                          <span
                            className="font-bold text-navy cursor-pointer hover:underline"
                            title={row.event_hash ?? ""}
                            onClick={() =>
                              copyToClipboard(row.event_hash ?? "", `curr-${row.id}`)
                            }
                          >
                            {hashShort}
                          </span>
                          {copiedHash === `curr-${row.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy
                              className="h-3 w-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                              onClick={() =>
                                copyToClipboard(row.event_hash ?? "", `curr-${row.id}`)
                              }
                            />
                          )}
                        </div>
                      </div>

                      {/* Detail Description */}
                      <p className="mt-3 text-sm text-slate-800 leading-relaxed">
                        {row.detail}
                      </p>

                      {/* Actor & Entity Info */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                          {row.actor_name ?? "System"} ({row.actor_role ?? "SYSTEM"})
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          Entity: {row.entity_type} {row.entity_id != null ? `#${row.entity_id}` : ""}
                        </span>
                        {row.bid_id != null && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600">Bid ID: #{row.bid_id}</span>
                          </>
                        )}
                      </div>

                      {/* Previous vs New Value Transition (if any) */}
                      {((row.previous_value !== undefined && row.previous_value !== null) ||
                        (row.new_value !== undefined && row.new_value !== null)) && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                            State / Value Transition
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="rounded-lg bg-white p-2 border border-slate-200">
                              <span className="font-semibold text-slate-500 block mb-1">Previous State:</span>
                              <pre className="font-mono text-slate-700 whitespace-pre-wrap text-[11px] overflow-x-auto">
                                {typeof row.previous_value === "object"
                                  ? JSON.stringify(row.previous_value, null, 2)
                                  : String(row.previous_value ?? "None")}
                              </pre>
                            </div>
                            <div className="rounded-lg bg-white p-2 border border-emerald-200 bg-emerald-50/20">
                              <span className="font-semibold text-emerald-700 block mb-1">New State:</span>
                              <pre className="font-mono text-slate-800 whitespace-pre-wrap text-[11px] overflow-x-auto">
                                {typeof row.new_value === "object"
                                  ? JSON.stringify(row.new_value, null, 2)
                                  : String(row.new_value ?? "None")}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reason / Human Officer Justification */}
                      {row.reason && (
                        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-950">
                          <span className="font-semibold text-blue-800 block mb-0.5">
                            Officer Justification / Reason:
                          </span>
                          <p className="italic text-slate-700 font-sans text-sm">
                            "{row.reason}"
                          </p>
                        </div>
                      )}

                      {/* Expandable Canonical Payload Inspector */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => togglePayload(row.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" /> Hide Canonical Payload
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-3.5 w-3.5" /> Inspect Canonical Hash Payload
                            </>
                          )}
                        </button>
                        <span className="text-[11px] text-slate-400 font-mono">
                          SHA256(canonical_json)
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 rounded-xl bg-slate-900 p-3 text-emerald-400 font-mono text-xs overflow-x-auto">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 mb-2 border-b border-slate-800">
                            <span>Canonical Payload Object</span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(canonicalPayload, null, 2),
                                  `payload-${row.id}`
                                )
                              }
                              className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
                            >
                              <Copy className="h-3 w-3" /> Copy Payload
                            </button>
                          </div>
                          <pre>{JSON.stringify(canonicalPayload, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Tabular Ledger View */
        <div className="overflow-x-auto rounded-xl bg-white shadow-card border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3"># Seq</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor / Role</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">SHA-256 Hash</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                    #{String(row.sequence_number ?? row.id).padStart(4, "0")}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-semibold ${getActionBadgeStyle(
                        row.action
                      )}`}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <span className="font-medium text-slate-900">
                      {row.actor_name ?? "System"}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {row.actor_role ?? "SYSTEM"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {row.entity_type} {row.entity_id != null ? `#${row.entity_id}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    <span
                      className="cursor-pointer hover:underline text-navy font-semibold"
                      title={row.event_hash ?? ""}
                      onClick={() => copyToClipboard(row.event_hash ?? "", `tbl-${row.id}`)}
                    >
                      {row.event_hash ? row.event_hash.slice(0, 10) + "..." : "Genesis"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {row.result ? (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {row.result}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">
                    {row.detail}
                    {row.reason && (
                      <span className="text-blue-600 block text-[11px] truncate">
                        Reason: {row.reason}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && items.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm rounded-xl bg-white p-4 shadow-card">
          <span className="text-slate-600 text-xs sm:text-sm">
            Showing <strong className="text-navy">{skip + 1}</strong> to{" "}
            <strong className="text-navy">{Math.min(skip + items.length, total)}</strong> of{" "}
            <strong className="text-navy">{total}</strong> chained events
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all"
              disabled={skip === 0}
              onClick={() => {
                const next = Math.max(0, skip - 20);
                setSkip(next);
                void load(next);
              }}
            >
              Previous 20
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all"
              disabled={skip + 20 >= total}
              onClick={() => {
                const next = skip + 20;
                setSkip(next);
                void load(next);
              }}
            >
              Next 20
            </button>
          </div>
        </div>
      ) : null}

      {/* Integrity Verification Modal */}
      {integrityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-sans text-xl font-bold text-navy">
                    Audit Ledger Integrity Verification
                  </h2>
                  <p className="text-xs text-slate-500">
                    Deterministic cryptographic recomputation of all event hashes and previous block pointers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIntegrityModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Verification Status Banner */}
            {verifying ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <RefreshCw className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="font-semibold text-slate-800">
                  Recomputing SHA-256 Digest Chain...
                </p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Walking sequence from Genesis block (0000...) to Head block, checking data canonicalization and cryptographic links.
                </p>
              </div>
            ) : integrityResult ? (
              <div className="space-y-4">
                <div
                  className={`rounded-xl p-4 border ${
                    integrityResult.is_valid
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                      : "bg-red-50/80 border-red-200 text-red-950"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {integrityResult.is_valid ? (
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-red-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="font-bold text-base">
                        {integrityResult.is_valid
                          ? "Cryptographic Ledger: VERIFIED INTACT"
                          : "SECURITY ALERT: LEDGER COMPROMISED"}
                      </h3>
                      <p className="text-xs mt-0.5">
                        {integrityResult.is_valid
                          ? `All ${integrityResult.total_events} audit events have valid, untampered hashes and continuous cryptographic links.`
                          : `${integrityResult.broken_chain_count} broken hash links or altered canonical payloads detected!`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Audit Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                      Total Blocks
                    </span>
                    <span className="font-sans text-lg font-bold text-navy">
                      {integrityResult.total_events}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                      Broken Chains
                    </span>
                    <span
                      className={`font-sans text-lg font-bold ${
                        integrityResult.broken_chain_count > 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {integrityResult.broken_chain_count}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                      Genesis Block
                    </span>
                    <span className="font-mono text-xs text-slate-700 truncate block" title={integrityResult.genesis_hash}>
                      {integrityResult.genesis_hash.slice(0, 10)}...
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                      Head Block
                    </span>
                    <span className="font-mono text-xs text-navy font-bold truncate block" title={integrityResult.head_hash}>
                      {integrityResult.head_hash.slice(0, 10)}...
                    </span>
                  </div>
                </div>

                {/* Discrepancies (if any) */}
                {integrityResult.discrepancies.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-2">
                    <h4 className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Detected Tamper Discrepancies:
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {integrityResult.discrepancies.map((d, i) => (
                        <div key={i} className="rounded-lg bg-white p-2.5 text-xs font-mono border border-red-200 space-y-1">
                          <div className="flex justify-between text-red-800 font-bold">
                            <span>Event #{d.event_id} (Seq: {d.sequence}) - {d.action}</span>
                            <span>
                              {!d.link_intact && !d.hash_intact
                                ? "LINK & HASH BROKEN"
                                : !d.link_intact
                                ? "BROKEN LINK"
                                : "ALTERED PAYLOAD"}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            <div>Stored Hash: <span className="text-red-700">{d.stored_hash}</span></div>
                            <div>Expected Hash: <span className="text-emerald-700">{d.computed_hash}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tamper Resistance Test Demonstration Sandbox */}
                <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Anti-Tampering Demonstration Sandbox
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Test the tamper-evident cryptographic chain by simulating an unauthorized database injection attack, then observe automatic detection and restoration.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={tamperLoading || restoreLoading || items.length === 0}
                      onClick={handleSimulateTampering}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {tamperLoading ? "Injecting Tamper..." : "Simulate Row Tampering"}
                    </button>
                    <button
                      type="button"
                      disabled={tamperLoading || restoreLoading}
                      onClick={handleRestoreChain}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {restoreLoading ? "Restoring..." : "Restore & Reseal Ledger"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIntegrityModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close Report
              </button>
              <button
                type="button"
                onClick={runIntegrityVerification}
                disabled={verifying}
                className="rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Re-Run Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
