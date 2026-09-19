import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Upload,
  RefreshCw,
  Layers,
  FileCheck,
  Award,
  ChevronRight,
  Download,
} from "lucide-react";
import { api, ApiError } from "../api";
import type { BidListItem, DocumentRecord, DocumentType } from "../types";
import { DOCUMENT_LABELS, formatDate, inr } from "../lib/format";
import { EmptyState } from "../components/EmptyState";
import { RiskBadge, StatusBadge } from "../components/RiskBadge";
import { TableSkeleton } from "../components/Skeleton";

const TYPES = Object.keys(DOCUMENT_LABELS) as DocumentType[];

export function BidderDashboard() {
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<DocumentType>("udyam");
  const [tenderId, setTenderId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function chooseFile(next: File | undefined) {
    setUploadError("");
    if (!next) return;
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(next.type) || next.size > 10 * 1024 * 1024) {
      setFile(null);
      setUploadError("Use a PDF, PNG, JPG or DOCX file up to 10 MB.");
      return;
    }
    setFile(next);
  }

  async function load() {
    setLoading(true);
    try {
      const bidRes = await api.listBids({});
      setBids(bidRes.items);
      const bidDocs = await Promise.all(
        bidRes.items.map(async (bid) => {
          try {
            const rows = await api.listDocuments(bid.id);
            return rows;
          } catch {
            return [] as DocumentRecord[];
          }
        })
      );
      setDocs(bidDocs.flat());
      if (bidRes.items[0] && !tenderId) setTenderId(String(bidRes.items[0].id));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadError("Choose a PDF, PNG, JPG or DOCX file up to 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const selectedBidId = tenderId ? Number(tenderId) : undefined;
      if (selectedBidId === undefined) {
        setUploadError("Select a bid before uploading a document.");
        return;
      }
      setUploadProgress(0);
      await api.uploadDocumentWithProgress(
        selectedBidId,
        file,
        docType,
        setUploadProgress
      );
      await api.uploadDocumentWithProgress(selectedBidId, file, docType, setUploadProgress);
      toast.success(`${DOCUMENT_LABELS[docType]} successfully uploaded and scheduled for verification`);
      setFile(null);
      setUploadProgress(0);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Bidder Portal & Artefacts Manager
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Upload statutory documents, track real-time AI compliance scores, and resolve officer queries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Active Bids</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-sans text-2xl font-bold text-slate-900">{bids.length}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Uploaded Artefacts</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-sans text-2xl font-bold text-slate-900">{docs.length}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Packets</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-sans text-2xl font-bold text-slate-900">
            {bids.filter((b) => b.verification_status === "verified").length}
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-teal-500/20 p-1.5 text-teal-600">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Upload Statutory Artefact</h2>
            <p className="text-xs text-slate-500">Provide certificates for OCR extraction and automated registry matching.</p>
          </div>
        </div>

        <form onSubmit={onUpload} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target GeM Bid</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
              value={tenderId}
              onChange={(e) => setTenderId(e.target.value)}
            >
              {bids.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.gem_bid_number} ({b.reference_code})
                </option>
              ))}
            </select>
          </div>

          <div
            className={`rounded-xl border-2 border-dashed p-3 text-xs transition cursor-pointer ${
              dragging ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              chooseFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              id="file-upload-input"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              className="sr-only"
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />
            <label htmlFor="file-upload-input" className="cursor-pointer block text-center">
              <span className="font-semibold text-slate-700 block truncate">
                {file ? `Selected: ${file.name}` : "Drop document or Browse"}
              </span>
              <span className="text-[10px] text-slate-400">PDF, PNG, JPG up to 10 MB</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 transition"
            >
              {uploading ? `Uploading ${uploadProgress}%…` : "Upload Document"}
            </button>
          </div>

          {uploadError && (
            <p className="text-xs font-semibold text-rose-600 sm:col-span-2 lg:col-span-4" role="alert">
              {uploadError}
            </p>
          )}

          {uploading && (
            <div className="sm:col-span-2 lg:col-span-4 space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Bids Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          My Submitted GeM Applications
        </h2>

        {loading ? (
          <TableSkeleton />
        ) : bids.length === 0 ? (
          <EmptyState
            title="No bids found"
            detail="You haven't submitted any bid applications under this account yet."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Bid Reference</th>
                    <th className="px-4 py-3">Tender</th>
                    <th className="px-4 py-3">Estimated Value</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Risk Level</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bids.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        <Link to={`/bids/${b.id}`} className="hover:text-teal-700 hover:underline">
                          {b.reference_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-semibold text-slate-800 block truncate">{b.title}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{b.gem_bid_number}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                        {inr(b.estimated_value_inr)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.overall_score != null ? (
                          <span className="font-bold text-slate-900 font-mono">
                            {Math.round(b.overall_score)}/100
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not scored</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RiskBadge level={b.risk_level} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge value={b.status} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/bids/${b.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                        >
                          <span>Track Packet</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Uploaded Documents List */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Uploaded Statutory Documents ({docs.length})
        </h2>

        {docs.length === 0 ? (
          <p className="text-xs text-slate-500">No documents uploaded yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => {
              const label = DOCUMENT_LABELS[doc.document_type] || doc.document_type;
              const isClean = doc.integrity_status === "clean" || doc.integrity_status === "verified";
              const isExpiring = doc.expiry_state === "expiring_soon";

              return (
                <div
                  key={doc.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between hover:shadow-sm transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">{label}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isClean
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {isClean ? "✓ Tamper Free" : "⚠ Review Flagged"}
                      </span>
                    </div>

                    <p className="font-mono text-[11px] text-slate-500 truncate mb-2">{doc.original_filename}</p>

                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">File size:</span>
                        <span>{Math.round(doc.file_size_bytes / 1024)} KB</span>
                      </div>
                      {doc.expiry_date && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Expiry date:</span>
                          <span className={isExpiring ? "text-amber-600 font-bold" : "text-slate-700"}>
                            {formatDate(doc.expiry_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Uploaded {formatDate(doc.created_at)}
                    </span>
                    <a
                      href={`/api/documents/${doc.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
