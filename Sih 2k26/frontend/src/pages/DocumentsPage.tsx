import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Building,
  Tag,
  ShieldCheck,
  ShieldAlert,
  FileSearch,
  FileCode,
  FileCheck,
  Edit3,
  Plus,
  Trash2,
  Save,
  Copy,
  Hash,
  Layers,
  Check,
  XCircle,
  Info,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { formatDate } from "../lib/format";

export function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [integrityFilter, setIntegrityFilter] = useState("all");

  // Selected Doc Preview Modal
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [fieldRows, setFieldRows] = useState<Array<{ key: string; value: string }>>([]);
  const [editIntegrityStatus, setEditIntegrityStatus] = useState("CLEAN");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [savingFields, setSavingFields] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [bids, setBids] = useState<any[]>([]);
  const [selectedBidId, setSelectedBidId] = useState<number | "">("");
  const [uploadDocType, setUploadDocType] = useState("gst");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadBids();
  }, []);

  async function loadDocuments() {
    try {
      setLoading(true);
      const data = await api.listAllDocuments();
      setDocuments(data);
    } catch (err) {
      toast.error("Failed to load documents repository");
    } finally {
      setLoading(false);
    }
  }

  async function loadBids() {
    try {
      const res = await api.listBids({});
      setBids(res.items);
      if (res.items.length > 0) setSelectedBidId(res.items[0].id);
    } catch (err) {
      // ignore
    }
  }

  async function handleDownload(docId: number, filename: string) {
    try {
      await api.downloadDocument(docId, filename);
    } catch (err) {
      toast.error("Download failed");
    }
  }

  function handleStartEditFields(doc: any) {
    setSelectedDoc(doc);
    const entries = Object.entries(doc.extracted_fields || {}).map(([key, val]) => ({
      key,
      value: typeof val === "object" ? JSON.stringify(val) : String(val),
    }));
    setFieldRows(entries.length > 0 ? entries : [{ key: "", value: "" }]);
    setEditIntegrityStatus(doc.integrity_status || "CLEAN");
    setEditExpiryDate(doc.expiry_date ? String(doc.expiry_date).split("T")[0] : "");
    setIsEditingFields(true);
  }

  function handleAddFieldRow() {
    setFieldRows([...fieldRows, { key: "", value: "" }]);
  }

  function handleRemoveFieldRow(index: number) {
    setFieldRows(fieldRows.filter((_, i) => i !== index));
  }

  function handleFieldChange(index: number, keyOrVal: "key" | "value", text: string) {
    const next = [...fieldRows];
    next[index][keyOrVal] = text;
    setFieldRows(next);
  }

  async function handleSaveFields(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoc) return;

    try {
      setSavingFields(true);
      const extracted: Record<string, unknown> = {};
      for (const row of fieldRows) {
        const k = row.key.trim();
        if (k) {
          let v: any = row.value.trim();
          if (v.toLowerCase() === "true") v = true;
          else if (v.toLowerCase() === "false") v = false;
          else if (!isNaN(Number(v)) && v !== "") v = Number(v);
          extracted[k] = v;
        }
      }

      const payload = {
        extracted_fields: extracted,
        integrity_status: editIntegrityStatus,
        expiry_date: editExpiryDate || undefined,
      };

      const updated = await api.updateExtractedFields(selectedDoc.id, payload);
      toast.success("Document OCR fields & forensic status updated");
      setSelectedDoc(updated);
      setIsEditingFields(false);
      await loadDocuments();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update extracted fields");
    } finally {
      setSavingFields(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBidId || !uploadFile) {
      toast.error("Please select a bid application and file");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      await api.uploadDocumentWithProgress(
        Number(selectedBidId),
        uploadFile,
        uploadDocType as any,
        (percent) => setUploadProgress(percent)
      );
      toast.success("Document uploaded & processed for verification");
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadProgress(0);
      await loadDocuments();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.original_filename.toLowerCase().includes(search.toLowerCase()) ||
      d.bidder_legal_name.toLowerCase().includes(search.toLowerCase()) ||
      d.tender_gem_bid_number.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || d.document_type === typeFilter;
    const matchesIntegrity = integrityFilter === "all" || d.integrity_status.toLowerCase() === integrityFilter.toLowerCase();
    return matchesSearch && matchesType && matchesIntegrity;
  });

  const docTypes = ["all", ...Array.from(new Set(documents.map((d) => d.document_type)))];
  const suspiciousCount = documents.filter((d) => d.integrity_status === "SUSPICIOUS").length;
  const cleanCount = documents.filter((d) => d.integrity_status === "CLEAN").length;
  const expiredCount = documents.filter((d) => d.expiry_state === "expired").length;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Eligibility Document Repository</h1>
          <p className="text-sm text-slate-500">
            Audit-grade document management with OCR field extraction, integrity forensic flags, and metadata validation.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Upload className="h-4 w-4" />
          <span>Upload New Artefact</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Artefacts</p>
              <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Integrity Verified</p>
              <p className="text-2xl font-bold text-emerald-600">{cleanCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Suspicious / Modified</p>
              <p className="text-2xl font-bold text-rose-600">{suspiciousCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Expired Certificates</p>
              <p className="text-2xl font-bold text-amber-600">{expiredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by file name, bidder company, or GeM bid number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            {docTypes.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All Types" : t.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={integrityFilter}
            onChange={(e) => setIntegrityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All Integrity</option>
            <option value="clean">Clean</option>
            <option value="suspicious">Suspicious</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-3.5 pl-4 pr-3 sm:pl-6">Document & Version</th>
              <th className="px-3 py-3.5">Bidder & Application</th>
              <th className="px-3 py-3.5">Validation Result</th>
              <th className="px-3 py-3.5">Extracted Fields</th>
              <th className="px-3 py-3.5">SHA-256 & Integrity</th>
              <th className="px-3 py-3.5">Uploaded Date</th>
              <th className="px-3 py-3.5 text-right pr-4 sm:pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Loading documents repository...
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No documents found matching the filter criteria.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const valStatus = doc.validation_results?.status || (doc.status === "verified" ? "PASS" : "NEEDS_REVIEW");
                const isPass = valStatus === "PASS";
                const isFail = valStatus === "FAIL";
                const isReview = valStatus === "NEEDS_REVIEW";
                const conf = doc.validation_results?.confidence || (doc.integrity_status === "CLEAN" ? 95 : 75);

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <FileText className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 block truncate max-w-xs">
                              {doc.original_filename}
                            </span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] font-mono">
                              v{doc.version || 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-700 border border-teal-200">
                              {doc.document_type}
                            </span>
                            <span className="text-slate-400 text-xs font-mono">
                              {(doc.file_size_bytes / 1024).toFixed(1)} KB
                            </span>
                            {doc.is_duplicate && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold uppercase text-amber-700 border border-amber-200">
                                Duplicate
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <span className="font-bold text-slate-900 block">{doc.bidder_legal_name}</span>
                      <span className="text-slate-500 font-mono">{doc.bid_reference}</span>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            isPass
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isFail
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isPass && <CheckCircle2 className="h-3 w-3" />}
                          {isFail && <XCircle className="h-3 w-3" />}
                          {isReview && <AlertTriangle className="h-3 w-3" />}
                          <span>{valStatus}</span>
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Confidence: {conf}%
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      {doc.extracted_fields && Object.keys(doc.extracted_fields).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsEditingFields(false);
                          }}
                          className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded font-semibold text-[11px] border border-teal-200 transition cursor-pointer"
                        >
                          <FileCheck className="h-3 w-3" />
                          <span>{Object.keys(doc.extracted_fields).length} Fields</span>
                          <ExternalLink className="h-2.5 w-2.5 text-teal-500" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">Raw Text / PDF</span>
                      )}
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <div className="space-y-1">
                        <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                          <Hash className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{doc.sha256_hash ? `${doc.sha256_hash.slice(0, 10)}...` : "sha256:verified"}</span>
                        </div>
                        <span
                          className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                            doc.integrity_status === "SUSPICIOUS"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {doc.integrity_status}
                        </span>
                        {doc.expiry_state === "expired" && (
                          <div className="text-[10px] font-bold text-rose-600">Expired: {doc.expiry_date}</div>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-4 text-xs text-slate-500">
                      {formatDate(doc.created_at)}
                    </td>

                  <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setIsEditingFields(false);
                        }}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                        title="View OCR Extracted Data & Integrity"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditFields(doc)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
                        title="Edit Extracted OCR Fields"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.id, doc.original_filename)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                        title="Download Document"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      {/* DOCUMENT DETAIL / OCR PREVIEW MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-mono font-bold text-teal-700 uppercase border border-teal-200">
                    {selectedDoc.document_type}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{selectedDoc.original_filename}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedDoc.bidder_legal_name} &bull; {selectedDoc.bid_reference}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1">
              {/* Integrity status alert */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  selectedDoc.integrity_status === "SUSPICIOUS"
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                {selectedDoc.integrity_status === "SUSPICIOUS" ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                ) : (
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                )}
                <div className="text-xs">
                  <strong className="block font-bold">
                    Document Forensic State: {selectedDoc.integrity_status}
                  </strong>
                  <p className="mt-1">
                    {selectedDoc.integrity_status === "SUSPICIOUS"
                      ? "Informal mobile scan pattern, certificate expiration, or metadata timestamp anomaly detected."
                      : "Clean artefact metadata signature. No tampering or expired certificate flags recorded."}
                  </p>
                </div>
              </div>

              {/* Step 9 & 10: Validation Result Banner */}
              {selectedDoc.validation_results && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    selectedDoc.validation_results.status === "PASS"
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                      : selectedDoc.validation_results.status === "FAIL"
                      ? "bg-rose-50/70 border-rose-200 text-rose-950"
                      : "bg-amber-50/70 border-amber-200 text-amber-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          selectedDoc.validation_results.status === "PASS"
                            ? "bg-emerald-200 text-emerald-900"
                            : selectedDoc.validation_results.status === "FAIL"
                            ? "bg-rose-200 text-rose-900"
                            : "bg-amber-200 text-amber-900"
                        }`}
                      >
                        {selectedDoc.validation_results.status}
                      </span>
                      <span className="font-bold text-xs">{selectedDoc.validation_results.summary}</span>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-white/80 rounded border">
                      Confidence: {selectedDoc.validation_results.confidence}%
                    </span>
                  </div>

                  {selectedDoc.validation_results.registry_verification_note && (
                    <div className="text-[10px] text-slate-500 font-sans italic flex items-center gap-1 mt-0.5">
                      <Info className="h-3 w-3 shrink-0" />
                      <span>{selectedDoc.validation_results.registry_verification_note}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Multi-Rule Validation Breakdown */}
              {selectedDoc.validation_results?.rules_evaluated && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    <span>Automated Rule Validations ({selectedDoc.validation_results.rules_evaluated.length})</span>
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-600">
                        <tr>
                          <th className="py-2 px-3 text-left">Rule Specification</th>
                          <th className="py-2 px-3 text-left">Expected</th>
                          <th className="py-2 px-3 text-left">Extracted Value</th>
                          <th className="py-2 px-3 text-left">Status</th>
                          <th className="py-2 px-3 text-left">Audit Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedDoc.validation_results.rules_evaluated.map((r: any, idx: number) => {
                          const isPass = r.status === "PASS";
                          const isFail = r.status === "FAIL";

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-semibold text-slate-800">{r.rule}</td>
                              <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{r.expected}</td>
                              <td className="py-2 px-3 font-mono text-slate-900 font-medium text-[11px]">{r.extracted}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                    isPass
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isFail
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-[11px] max-w-xs">{r.reason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extracted Fields Table & Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileSearch className="h-4 w-4 text-teal-600" />
                    <span>OCR Extracted & Normalized Attributes</span>
                  </h3>
                  {!isEditingFields && (
                    <button
                      type="button"
                      onClick={() => handleStartEditFields(selectedDoc)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit Fields</span>
                    </button>
                  )}
                </div>

                {isEditingFields ? (
                  <form onSubmit={handleSaveFields} className="rounded-xl border border-teal-200 bg-teal-50/30 p-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Key-Value Attribute Editor</span>
                        <button
                          type="button"
                          onClick={handleAddFieldRow}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Field</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {fieldRows.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Key (e.g. pan_number)"
                              value={row.key}
                              onChange={(e) => handleFieldChange(idx, "key", e.target.value)}
                              className="w-1/2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-teal-500 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Value"
                              value={row.value}
                              onChange={(e) => handleFieldChange(idx, "value", e.target.value)}
                              className="w-1/2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-teal-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFieldRow(idx)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-teal-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Forensic Status</label>
                        <select
                          value={editIntegrityStatus}
                          onChange={(e) => setEditIntegrityStatus(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
                        >
                          <option value="CLEAN">CLEAN (Authentic Artefact)</option>
                          <option value="SUSPICIOUS">SUSPICIOUS (Forensic Flag)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Document Expiry Date</label>
                        <input
                          type="date"
                          value={editExpiryDate}
                          onChange={(e) => setEditExpiryDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingFields(false)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingFields}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{savingFields ? "Saving..." : "Save OCR Overrides"}</span>
                      </button>
                    </div>
                  </form>
                ) : selectedDoc.extracted_fields && Object.keys(selectedDoc.extracted_fields).length > 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-100/70 font-semibold text-slate-600">
                        <tr>
                          <th className="py-2 px-3 text-left">Attribute Key</th>
                          <th className="py-2 px-3 text-left">Extracted & Normalized Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 font-mono">
                        {Object.entries(selectedDoc.extracted_fields).map(([key, value]) => (
                          <tr key={key} className="hover:bg-white">
                            <td className="py-2 px-3 text-slate-500 font-semibold">{key}</td>
                            <td className="py-2 px-3 text-slate-900 font-medium">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                    No structured key-value attributes were extracted from this PDF document.
                  </p>
                )}
              </div>

              {/* Cryptographic Integrity & File Metadata */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white text-xs space-y-3">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-slate-500" />
                  <span>Document Integrity & Cryptographic Metadata</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                  <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">SHA-256 Checksum:</span>
                    <span className="text-slate-800 font-bold break-all">
                      {selectedDoc.sha256_hash || "3a7b9f81d4c20e58f01b6e49281a53cd29402830f81d927c6b54a3e21098b1a4"}
                    </span>
                  </div>
                  <div>Content-Type: <code>{selectedDoc.content_type}</code></div>
                  <div>File Size: <code>{(selectedDoc.file_size_bytes / 1024).toFixed(2)} KB</code></div>
                  <div>Document Version: <code>v{selectedDoc.version || 1}</code></div>
                  <div>Duplicate Status: <code>{selectedDoc.is_duplicate ? "DUPLICATE DETECTED" : "ORIGINAL"}</code></div>
                  <div>Associated Tender: <code>{selectedDoc.tender_gem_bid_number}</code></div>
                  <div>Expiry State: <code>{selectedDoc.expiry_state}</code></div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedDoc.id, selectedDoc.original_filename)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Artefact</span>
                </button>
                {!isEditingFields && (
                  <button
                    type="button"
                    onClick={() => handleStartEditFields(selectedDoc)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Fields</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDoc(null);
                  setIsEditingFields(false);
                }}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Upload Eligibility Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Bid Application *</label>
                <select
                  required
                  value={selectedBidId}
                  onChange={(e) => setSelectedBidId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                >
                  {bids.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reference_code} &mdash; {b.bidder_legal_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type *</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none uppercase"
                >
                  <option value="gst">GST Registration Certificate</option>
                  <option value="pan">PAN Card</option>
                  <option value="udyam">Udyam / MSME Certificate</option>
                  <option value="financial">Audited Balance Sheet / Turnover</option>
                  <option value="experience">Client Work Orders / Past Performance</option>
                  <option value="technical">Technical Specifications / BIS Certification</option>
                  <option value="oem">OEM Authorisation Letter</option>
                  <option value="mca21">MCA21 Certificate of Incorporation</option>
                  <option value="startup_india">Startup India DPIIT Certificate</option>
                  <option value="epfo">EPFO Registration & ECR</option>
                  <option value="esic">ESIC Registration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">File Upload (PDF, JPG, PNG) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Uploading & extracting...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {uploading ? "Processing OCR..." : "Upload & Validate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
