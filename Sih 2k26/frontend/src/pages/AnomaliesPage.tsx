import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  ArrowRight,
  Clock,
  Building,
  FileWarning,
  Sparkles,
  Network,
  Users,
  Eye,
  CheckCircle2,
  FileText,
  FileCode,
  MapPin,
  Phone,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { formatDate } from "../lib/format";
import { RelationshipGraph } from "../components/RelationshipGraph";
import { VigilanceEvidenceModal } from "../components/VigilanceEvidenceModal";
import { VigilanceActionModal } from "../components/VigilanceActionModal";

export function AnomaliesPage() {
  const [activeTab, setActiveTab] = useState<"relationships" | "anomalies" | "audit">("relationships");

  // Phase 6 Vigilance Data
  const [vigilanceData, setVigilanceData] = useState<any>(null);
  const [vigilanceActions, setVigilanceActions] = useState<any[]>([]);
  const [selectedAlertForEvidence, setSelectedAlertForEvidence] = useState<any | null>(null);
  const [selectedAlertForAction, setSelectedAlertForAction] = useState<any | null>(null);

  // Original Anomalies Data
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      const [anomaliesRes, vigilanceRes, actionsRes] = await Promise.all([
        api.listAnomalies().catch(() => []),
        api.getVigilanceRelationships().catch(() => null),
        api.getVigilanceActions().catch(() => []),
      ]);

      setAnomalies(anomaliesRes || []);
      setVigilanceData(vigilanceRes);
      setVigilanceActions(actionsRes || []);
    } catch (err) {
      toast.error("Failed to load vigilance intelligence data");
    } finally {
      setLoading(false);
    }
  }

  // Filtered anomalies
  const filteredAnomalies = anomalies.filter((a) => {
    const s = search.toLowerCase();
    const matchesSearch =
      (a.title || "").toLowerCase().includes(s) ||
      (a.bidder_name || "").toLowerCase().includes(s) ||
      (a.bid_reference || "").toLowerCase().includes(s) ||
      (a.detail || "").toLowerCase().includes(s);
    const matchesSeverity = severityFilter === "all" || (a.severity || "").toLowerCase() === severityFilter.toLowerCase();
    const matchesCategory = categoryFilter === "all" || (a.category || "").toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  // Filtered relationship alerts
  const relationshipAlerts = (vigilanceData?.alerts || []).filter((al: any) => {
    const s = search.toLowerCase();
    const matchesSearch =
      al.bidder_a.name.toLowerCase().includes(s) ||
      al.bidder_b.name.toLowerCase().includes(s) ||
      (al.bidder_a.director || "").toLowerCase().includes(s) ||
      (al.bidder_b.director || "").toLowerCase().includes(s) ||
      al.alert_id.toLowerCase().includes(s);
    const matchesSeverity = severityFilter === "all" || al.risk_level.toLowerCase() === severityFilter.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  const highRiskRels = vigilanceData?.stats?.high_risk || 0;
  const pendingActions = vigilanceData?.stats?.pending_review || 0;
  const criticalAnomalies = anomalies.filter((a) => a.severity === "CRITICAL").length;

  return (
    <div className="space-y-6">
      {/* Top Banner Non-Collusion & Decision-Support Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 text-xs text-amber-900 shadow-xs">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold uppercase tracking-wider text-amber-950 flex items-center gap-2">
            <span>Procurement Vigilance &amp; Decision Support Notice</span>
            <span className="rounded bg-amber-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900">
              Statutory
            </span>
          </div>
          <p className="leading-relaxed">
            Evidence indicates a potential relationship; it does not establish collusion or anti-competitive behavior.
            AI is a decision-support system. Final qualification or vigilance action remains exclusively with the authorized procurement officer.
          </p>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase text-rose-800 border border-rose-200">
              Vigilance &amp; Integrity Framework
            </span>
            <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
              GeM AI Shield
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Vigilance &amp; Relationship Detection
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl">
            Automated cross-bidder entity resolution, shared director linkage, address and phone correlations, and binary document duplicate detection.
          </p>
        </div>

        <button
          onClick={loadAllData}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-100 p-2.5 text-rose-600">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase tracking-wide">High Risk Relationships</p>
              <p className="text-2xl font-bold text-rose-600">{highRiskRels}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Pending Officer Action</p>
              <p className="text-2xl font-bold text-amber-600">{pendingActions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2.5 text-purple-600">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Reused Document Hashes</p>
              <p className="text-2xl font-bold text-purple-600">
                {vigilanceData?.graph?.nodes?.filter((n: any) => n.type === "DOCUMENT_HASH").length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
              <AlertTriangle className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contradiction Radar</p>
              <p className="text-2xl font-bold text-slate-900">{criticalAnomalies}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("relationships")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeTab === "relationships"
              ? "border-teal-600 text-teal-700 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Network className="h-4 w-4" />
          <span>Potential Relationships &amp; Network ({vigilanceData?.total_alerts || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("anomalies")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeTab === "anomalies"
              ? "border-teal-600 text-teal-700 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Cross-Doc Contradictions ({anomalies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeTab === "audit"
              ? "border-teal-600 text-teal-700 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Vigilance Determination Log ({vigilanceActions.length})</span>
        </button>
      </div>

      {/* TAB 1: RELATIONSHIPS & NETWORK GRAPH */}
      {activeTab === "relationships" && (
        <div className="space-y-6">
          {/* Interactive Relationship Graph */}
          {vigilanceData?.graph && (
            <RelationshipGraph
              nodes={vigilanceData.graph.nodes || []}
              edges={vigilanceData.graph.edges || []}
              onSelectNode={(nodeId) => {
                const bidderMatch = vigilanceData.alerts?.find(
                  (a: any) =>
                    `bidder_${a.bidder_a.id}` === nodeId ||
                    `bidder_${a.bidder_b.id}` === nodeId
                );
                if (bidderMatch) {
                  setSelectedAlertForEvidence(bidderMatch);
                }
              }}
            />
          )}

          {/* Filters & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search potential relationships by bidder name, director, or case ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-4 text-xs placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>
          </div>

          {/* Relationship Alerts List */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-slate-400">Analyzing vigilance linkages...</div>
            ) : relationshipAlerts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                No potential relationship alerts matching criteria.
              </div>
            ) : (
              relationshipAlerts.map((alert: any) => {
                const isHigh = alert.risk_level === "HIGH";
                const isMedium = alert.risk_level === "MEDIUM";

                return (
                  <div
                    key={alert.alert_id}
                    className={`rounded-xl border bg-white shadow-sm overflow-hidden transition hover:shadow-md ${
                      isHigh
                        ? "border-rose-300 ring-1 ring-rose-200/50"
                        : isMedium
                        ? "border-amber-300 ring-1 ring-amber-200/50"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Header Banner */}
                    <div
                      className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b ${
                        isHigh
                          ? "bg-gradient-to-r from-rose-50 via-rose-50/50 to-white border-rose-200"
                          : "bg-gradient-to-r from-amber-50 via-amber-50/50 to-white border-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            isHigh
                              ? "bg-rose-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          Potential Relationship Detected
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          Case #{alert.alert_id}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          Risk Score: {alert.risk_score}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            alert.action_status === "INVESTIGATE"
                              ? "bg-teal-100 text-teal-800 border border-teal-200"
                              : alert.action_status === "DISMISSED"
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : alert.action_status === "ESCALATED"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          Status: {alert.action_status}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-4">
                      {/* Bidder Entities Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/80">
                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">Bidder Entity A</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">{alert.bidder_a.name}</div>
                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span>Director: <strong>{alert.bidder_a.director || "N/A"}</strong></span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{alert.bidder_a.address}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">Bidder Entity B</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">{alert.bidder_b.name}</div>
                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span>Director: <strong>{alert.bidder_b.director || "N/A"}</strong></span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{alert.bidder_b.address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detected Indicators List */}
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          Correlated Identifiers &amp; Indicators ({alert.indicator_count}):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {alert.indicators.map((ind: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs flex items-start gap-2 shadow-sm"
                            >
                              <span
                                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                  ind.severity === "HIGH"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {ind.code}
                              </span>
                              <div className="space-y-0.5">
                                <p className="font-semibold text-slate-900">{ind.title}</p>
                                <p className="text-[11px] text-slate-500 leading-tight">{ind.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Officer Decision Display if already recorded */}
                      {alert.action_reason && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                            <span>Officer Determination: {alert.action_status} (by {alert.officer_name || "Officer"})</span>
                          </div>
                          <p className="text-slate-600 italic">"{alert.action_reason}"</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="text-[11px] text-slate-400 italic">
                          * Evidence indicates relationship; requires officer determination before proceeding.
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedAlertForEvidence(alert)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition"
                          >
                            <Eye className="h-3.5 w-3.5 text-teal-600" />
                            <span>Inspect Side-by-Side Evidence</span>
                          </button>

                          <button
                            onClick={() => setSelectedAlertForAction(alert)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 shadow-sm transition"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Take Officer Action</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANOMALY RADAR */}
      {activeTab === "anomalies" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search cross-document contradictions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-4 text-xs placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="contradiction">Contradictions</option>
                <option value="risk_signal">Risk Signals</option>
                <option value="document_integrity">Document Integrity</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredAnomalies.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                No active anomalies found matching filter criteria.
              </div>
            ) : (
              filteredAnomalies.map((anomaly) => {
                const isCritical = anomaly.severity === "CRITICAL";
                const isHigh = anomaly.severity === "HIGH";

                return (
                  <div
                    key={anomaly.id}
                    className={`rounded-xl border p-4 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md ${
                      isCritical
                        ? "border-rose-300 bg-gradient-to-r from-rose-50/40 to-white"
                        : isHigh
                        ? "border-amber-300 bg-gradient-to-r from-amber-50/40 to-white"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isCritical
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : isHigh
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {anomaly.severity} SEVERITY
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {anomaly.category}
                        </span>
                        <span className="text-slate-400 text-xs font-mono">{anomaly.type}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{anomaly.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-mono">{anomaly.detail}</p>

                      <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{anomaly.bidder_name}</span>
                        <span>&bull;</span>
                        <span className="font-mono">{anomaly.bid_reference}</span>
                        <span>&bull;</span>
                        <span>Tender: {anomaly.tender_gem_number}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end">
                      {anomaly.bid_id ? (
                        <Link
                          to={`/compliance?bid_id=${anomaly.bid_id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 hover:border-teal-200 transition shadow-sm"
                        >
                          <span>Investigate in Matrix</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Global Artefact</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VIGILANCE AUDIT DETERMINATIONS LOG */}
      {activeTab === "audit" && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70">
            <h3 className="text-sm font-bold text-slate-900">Official Officer Determinations Log</h3>
            <p className="text-xs text-slate-500">
              Immutable audit history of officer actions, investigations, and reasoned dismissals under vigilance guidelines.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {vigilanceActions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No officer vigilance determinations recorded yet.
              </div>
            ) : (
              vigilanceActions.map((act) => (
                <div key={act.id} className="p-4 space-y-1.5 text-xs hover:bg-slate-50/60 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          act.action === "INVESTIGATE"
                            ? "bg-teal-100 text-teal-800 border border-teal-200"
                            : act.action === "DISMISS"
                            ? "bg-slate-100 text-slate-800 border border-slate-200"
                            : act.action === "ESCALATE"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {act.action}
                      </span>
                      <span className="font-mono font-semibold text-slate-800">Alert: {act.alert_id}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-slate-600">Officer: <strong>{act.officer_name || "Procurement Officer"}</strong></span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {act.created_at ? formatDate(act.created_at) : "Recent"}
                    </span>
                  </div>

                  {act.reason && (
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700">
                      <span className="font-bold text-[10px] uppercase text-slate-400 block">Justification Reason:</span>
                      <p className="italic">{act.reason}</p>
                    </div>
                  )}

                  {act.notes && (
                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-600">Audit Notes: </span>
                      {act.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedAlertForEvidence && (
        <VigilanceEvidenceModal
          alert={selectedAlertForEvidence}
          onClose={() => setSelectedAlertForEvidence(null)}
          onOpenAction={(al) => setSelectedAlertForAction(al)}
        />
      )}

      {selectedAlertForAction && (
        <VigilanceActionModal
          alert={selectedAlertForAction}
          onClose={() => setSelectedAlertForAction(null)}
          onSuccess={loadAllData}
        />
      )}
    </div>
  );
}
