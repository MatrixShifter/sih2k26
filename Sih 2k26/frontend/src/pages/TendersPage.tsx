import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Calendar,
  Building2,
  Tag,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  ChevronRight,
  SlidersHorizontal,
  X,
  ShieldAlert,
  ArrowRight,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import type { Tender, Requirement } from "../types";
import { formatCurrency, formatDate } from "../lib/format";

export function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Requirement Builder Modal State
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [showReqModal, setShowReqModal] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);

  const defaultNewReq = () => ({
    title: "Processor Specification",
    requirement: "CPU >= Intel Core i5 or equivalent",
    description: "Processor must be Intel Core i5 11th Gen or higher or equivalent AMD Ryzen 5.",
    category: "TECHNICAL",
    mandatory: true,
    required_value: "Intel Core i5 or equivalent",
    comparison_operator: ">=",
    weight: "10.0",
    threshold: "16",
    currency: "GB",
    evidence: "technical",
    notes: "Verified against OEM technical datasheet / hardware specification sheet.",
  });
  const [newReq, setNewReq] = useState(defaultNewReq());

  // Create Tender Modal State
  const getDefaultBidNumber = () => `GEM/2026/B/${Math.floor(1000000 + Math.random() * 9000000)}`;
  const getDefaultClosingDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  };

  const defaultCreateForm = () => ({
    gem_bid_number: getDefaultBidNumber(),
    title: "Supply, Installation & Maintenance of Advanced Automated Biochemistry Analyzers",
    department: "Department of Health & Family Welfare",
    category: "Medical Equipment",
    estimated_value_inr: "6500000",
    closing_date: getDefaultClosingDate(),
    description: "Procurement of high-throughput automated analyzers with 5-year comprehensive annual maintenance contract (CAMC) and 24-month OEM manufacturer warranty.",
    source_text: `ATC Clause 1: Bidder must have minimum 3 years experience in supply of diagnostic laboratory equipment to Central/State Government hospitals.
ATC Clause 2: Minimum average annual financial turnover of INR 50,00,000 across last 3 audited financial years (FY 2022-23, 2023-24, 2024-25).
ATC Clause 3: Valid ISO 13485 (Medical Devices Quality Management) and CE / US-FDA certification required.
ATC Clause 4: Bidder must be registered on GSTN with active filing status and possess valid PAN.
ATC Clause 5: Make in India (MII) local content declaration minimum 50% for Class-I local supplier preference.`,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm());
  const [creating, setCreating] = useState(false);

  // Edit Tender Modal State
  const [editingTender, setEditingTender] = useState<Tender | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    department: "",
    category: "Equipment & Supplies",
    estimated_value_inr: "",
    closing_date: "",
    description: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Tender Modal State
  const [deletingTender, setDeletingTender] = useState<Tender | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload Tender Spec Modal State
  const [uploadSpecTender, setUploadSpecTender] = useState<Tender | null>(null);
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [uploadingSpec, setUploadingSpec] = useState(false);

  useEffect(() => {
    loadTenders();
  }, []);

  async function loadTenders() {
    try {
      setLoading(true);
      const data = await api.listTenders();
      setTenders(data);
      if (selectedTender) {
        const updated = data.find((t) => t.id === selectedTender.id);
        if (updated) setSelectedTender(updated);
      }
    } catch (err) {
      toast.error("Failed to load tender catalogue");
    } finally {
      setLoading(false);
    }
  }

  async function handleExtract(tenderId: number) {
    try {
      toast.loading("Running simulated AI ATC requirement extraction...", { id: "ext" });
      const updated = await api.extractRequirements(tenderId);
      toast.success("Extracted requirements successfully", { id: "ext" });
      setSelectedTender(updated);
      await loadTenders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to extract requirements", { id: "ext" });
    }
  }

  async function handleAddRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTender || !newReq.requirement.trim()) return;

    try {
      const payload = {
        requirement: newReq.requirement.trim(),
        title: newReq.title.trim() || undefined,
        description: newReq.description.trim() || undefined,
        category: newReq.category,
        mandatory: newReq.mandatory,
        required_value: newReq.required_value.trim() || undefined,
        comparison_operator: newReq.comparison_operator || ">=",
        weight: newReq.weight ? parseFloat(newReq.weight) : 10.0,
        threshold: newReq.threshold ? parseFloat(newReq.threshold) : null,
        currency: newReq.threshold ? newReq.currency : null,
        evidence_types: newReq.evidence.split(",").map((s) => s.trim()).filter(Boolean),
        notes: newReq.notes.trim() || undefined,
      };

      const updated = await api.addRequirement(selectedTender.id, payload);
      toast.success("Requirement added to tender criteria");
      setSelectedTender(updated);
      setNewReq(defaultNewReq());
      await loadTenders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add requirement");
    }
  }

  async function handleDeleteRequirement(reqId: number) {
    if (!selectedTender) return;
    if (!confirm("Are you sure you want to delete this eligibility requirement?")) return;

    try {
      const updated = await api.deleteRequirement(selectedTender.id, reqId);
      toast.success("Requirement removed");
      setSelectedTender(updated);
      await loadTenders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete requirement");
    }
  }

  async function handleCreateTender(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.gem_bid_number || !createForm.title || !createForm.estimated_value_inr) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      setCreating(true);
      const payload = {
        gem_bid_number: createForm.gem_bid_number.trim(),
        title: createForm.title.trim(),
        department: createForm.department.trim() || "Central Procurement Division",
        category: createForm.category.trim(),
        estimated_value_inr: parseFloat(createForm.estimated_value_inr),
        closing_date: createForm.closing_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        description: createForm.description.trim(),
        source_text: createForm.source_text.trim() || undefined,
      };

      await api.createTender(payload);
      toast.success("Tender created & AI requirements extracted!");
      setShowCreateModal(false);
      setCreateForm(defaultCreateForm());
      await loadTenders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create tender");
    } finally {
      setCreating(false);
    }
  }

  function handleOpenEdit(tender: Tender) {
    setEditingTender(tender);
    setEditForm({
      title: tender.title,
      department: tender.department,
      category: tender.category,
      estimated_value_inr: String(tender.estimated_value_inr || ""),
      closing_date: tender.closing_date ? tender.closing_date.split("T")[0] : "",
      description: tender.description || "",
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTender) return;

    try {
      setSavingEdit(true);
      const payload: Record<string, unknown> = {
        title: editForm.title.trim(),
        department: editForm.department.trim(),
        category: editForm.category.trim(),
        estimated_value_inr: parseFloat(editForm.estimated_value_inr),
        closing_date: editForm.closing_date || undefined,
        description: editForm.description.trim() || undefined,
      };

      await api.updateTender(editingTender.id, payload);
      toast.success("Tender updated successfully");
      setEditingTender(null);
      await loadTenders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update tender");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTender) return;

    try {
      setDeleting(true);
      await api.deleteTender(deletingTender.id);
      toast.success(`Tender ${deletingTender.gem_bid_number} deleted successfully`);
      setDeletingTender(null);
      await loadTenders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete tender");
    } finally {
      setDeleting(false);
    }
  }

  async function handleUploadSpec(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadSpecTender || !specFile) {
      toast.error("Please choose a specification PDF document");
      return;
    }

    try {
      setUploadingSpec(true);
      toast.loading("Uploading ATC document & running OCR extraction...", { id: "spec-upload" });
      await api.uploadTenderDocument(uploadSpecTender.id, specFile);
      toast.success("Specification uploaded and requirements parsed!", { id: "spec-upload" });
      setUploadSpecTender(null);
      setSpecFile(null);
      await loadTenders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload tender document", { id: "spec-upload" });
    } finally {
      setUploadingSpec(false);
    }
  }

  const filteredTenders = tenders.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.gem_bid_number.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(tenders.map((t) => t.category)))];

  const totalValue = tenders.reduce((acc, t) => acc + Number(t.estimated_value_inr || 0), 0);
  const totalReqs = tenders.reduce((acc, t) => acc + (t.requirements?.length || 0), 0);

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tender Catalogue & Requirement Builder</h1>
          <p className="text-sm text-slate-500">
            Publish GeM tenders, review AI-extracted ATC eligibility criteria, and customize evaluation weights.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateForm(defaultCreateForm());
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Publish New Tender</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Active Tenders</p>
              <p className="text-2xl font-bold text-slate-900">{tenders.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Estimated Value</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Extracted Requirements</p>
              <p className="text-2xl font-bold text-slate-900">{totalReqs}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Extraction Engine</p>
              <p className="text-base font-bold text-slate-900">NLP / Rule Hybrid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tender number, title, or ministry department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tender Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading tenders...</div>
      ) : filteredTenders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">No tenders match your filter</h3>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your search terms or create a new tender.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredTenders.map((tender) => (
            <div
              key={tender.id}
              className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-teal-500/50 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700">
                      {tender.gem_bid_number}
                    </span>
                    <span className="ml-2 inline-block rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 border border-teal-200/60">
                      {tender.category}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Due {formatDate(tender.closing_date)}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-2">{tender.title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {tender.department}
                </p>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2">{tender.description}</p>

                {/* Requirements Chips */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      ATC Eligibility Criteria ({tender.requirements?.length || 0})
                    </span>
                    <span className="text-slate-500 font-mono font-medium">
                      Est. {formatCurrency(tender.estimated_value_inr)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(tender.requirements || []).slice(0, 5).map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200/80"
                      >
                        <Tag className="h-2.5 w-2.5 text-slate-400" />
                        {r.category}: {r.requirement.slice(0, 24)}...
                      </span>
                    ))}
                    {(tender.requirements?.length || 0) > 5 && (
                      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        +{(tender.requirements?.length || 0) - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTender(tender);
                      setShowReqModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
                    <span>Requirements</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadSpecTender(tender);
                      setSpecFile(null);
                    }}
                    title="Upload ATC Specification Document & Run OCR"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition"
                  >
                    <Upload className="h-3.5 w-3.5 text-teal-600" />
                    <span>Upload Spec</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleExtract(tender.id)}
                    title="Simulate re-extracting requirements from tender ATC document"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(tender)}
                    title="Edit Tender Details"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingTender(tender)}
                    title="Delete Tender Packet"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <Link
                    to={`/officer/compare?tender_id=${tender.id}`}
                    title="Compare Bids for this Tender"
                    className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/80 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100/80 transition"
                  >
                    <span>Compare</span>
                  </Link>

                  <Link
                    to={`/compliance?tender_id=${tender.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                  >
                    <span>Bids</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REQUIREMENT BUILDER MODAL */}
      {showReqModal && selectedTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-mono font-bold text-teal-700 border border-teal-200">
                    {selectedTender.gem_bid_number}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">Eligibility Requirement Builder</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTender.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExtract(selectedTender.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Re-extract</span>
                </button>
                <button
                  onClick={() => setShowReqModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Existing Requirements Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                  Configured ATC Eligibility Checklist ({selectedTender.requirements?.length || 0})
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Rule Title / Description</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Rule Operator</th>
                        <th className="py-2.5 px-3">Required Value</th>
                        <th className="py-2.5 px-3">Weight</th>
                        <th className="py-2.5 px-3">Mandatory</th>
                        <th className="py-2.5 px-3">Evidence</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedTender.requirements || []).map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 max-w-xs">
                            <div className="font-semibold text-slate-900">{req.title || req.requirement}</div>
                            {req.description && (
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5">{req.description}</div>
                            )}
                            {req.title && req.title !== req.requirement && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{req.requirement}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 border border-slate-200">
                              {req.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-mono font-bold">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                              {req.comparison_operator || ">="}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-mono font-medium">
                            {req.required_value || (req.threshold ? `${req.currency || ""} ${Number(req.threshold).toLocaleString("en-IN")}` : "Required")}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                            {req.weight !== undefined ? `${req.weight} pts` : "10 pts"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                req.mandatory
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {req.mandatory ? "Mandatory" : "Optional"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {(req.evidence_types || []).join(", ") || "declaration"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRequirement(req.id)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Delete requirement"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add New Requirement Form */}
              <form onSubmit={handleAddRequirement} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-teal-600" />
                  Add Tender-Specific Compliance Rule
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Processor Specification"
                      value={newReq.title}
                      onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={newReq.category}
                      onChange={(e) => setNewReq({ ...newReq, category: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    >
                      <option value="TECHNICAL">TECHNICAL (Hardware / Specs)</option>
                      <option value="LEGAL">LEGAL (GST / PAN / Registrations)</option>
                      <option value="FINANCIAL">FINANCIAL (Turnover / Networth)</option>
                      <option value="EXPERIENCE">EXPERIENCE (Past Performance)</option>
                      <option value="AUTHORIZATION">AUTHORIZATION (OEM MAF)</option>
                      <option value="TAX">TAX (GSTN Registration)</option>
                      <option value="IDENTITY">IDENTITY (PAN Card)</option>
                      <option value="MSME">MSME (Udyam / NSIC)</option>
                      <option value="INTEGRITY">INTEGRITY (Debarment / CIRP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Comparison Operator</label>
                    <select
                      value={newReq.comparison_operator}
                      onChange={(e) => setNewReq({ ...newReq, comparison_operator: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none font-mono font-bold"
                    >
                      <option value=">=">&gt;= (Greater than or equal)</option>
                      <option value="==">== (Exact match / verified)</option>
                      <option value="<=">&lt;= (Less than or equal)</option>
                      <option value=">">&gt; (Strictly greater)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Required Value / Standard</label>
                    <input
                      type="text"
                      placeholder="e.g. Intel Core i5 or equivalent"
                      value={newReq.required_value}
                      onChange={(e) => setNewReq({ ...newReq, required_value: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (Score Points)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="10.0"
                      value={newReq.weight}
                      onChange={(e) => setNewReq({ ...newReq, weight: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Evidence Types</label>
                    <input
                      type="text"
                      placeholder="e.g. technical, oem, gst"
                      value={newReq.evidence}
                      onChange={(e) => setNewReq({ ...newReq, evidence: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requirement Specification Text</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CPU >= Intel Core i5 or equivalent"
                    value={newReq.requirement}
                    onChange={(e) => setNewReq({ ...newReq, requirement: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description & Audit Criteria</label>
                  <input
                    type="text"
                    placeholder="e.g. Processor must be Intel Core i5 11th Gen or higher, or equivalent AMD Ryzen 5 processor."
                    value={newReq.description}
                    onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReq.mandatory}
                      onChange={(e) => setNewReq({ ...newReq, mandatory: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <span>Mandatory qualification condition</span>
                  </label>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Save Rule to Tender</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReqModal(false)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close Builder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TENDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Publish New GeM Tender</h2>
                <p className="text-xs text-slate-500">Initiate procurement packet and trigger automated ATC requirement parsing</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GeM Bid Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GEM/2026/B/8901234"
                    value={createForm.gem_bid_number}
                    onChange={(e) => setCreateForm({ ...createForm, gem_bid_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Tender Value (INR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000000"
                    value={createForm.estimated_value_inr}
                    onChange={(e) => setCreateForm({ ...createForm, estimated_value_inr: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tender Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supply and Commissioning of Smart Interactive Classroom Panels"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Procuring Department / Ministry</label>
                  <input
                    type="text"
                    placeholder="e.g. Department of Higher Education"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bid Closing Deadline</label>
                  <input
                    type="date"
                    value={createForm.closing_date}
                    onChange={(e) => setCreateForm({ ...createForm, closing_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Scope</label>
                <textarea
                  rows={2}
                  placeholder="Scope of work and delivery locations..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ATC Document Text (Simulated NLP Source)
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste Additional Terms & Conditions (ATC) text here to simulate NLP requirement extraction..."
                  value={createForm.source_text}
                  onChange={(e) => setCreateForm({ ...createForm, source_text: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 text-teal-400" />
                  <span>{creating ? "Publishing & Extracting..." : "Publish & Extract Requirements"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TENDER MODAL */}
      {editingTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-mono font-bold text-teal-700 border border-teal-200">
                  {editingTender.gem_bid_number}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Edit Tender Details</h2>
              </div>
              <button
                onClick={() => setEditingTender(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tender Title *</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Procuring Department</label>
                  <input
                    type="text"
                    required
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Equipment & Supplies">Equipment & Supplies</option>
                    <option value="IT Hardware">IT Hardware</option>
                    <option value="Medical Equipment">Medical Equipment</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Security & Surveillance">Security & Surveillance</option>
                    <option value="Solar & Energy">Solar & Energy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Value (INR) *</label>
                  <input
                    type="number"
                    required
                    value={editForm.estimated_value_inr}
                    onChange={(e) => setEditForm({ ...editForm, estimated_value_inr: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bid Closing Date</label>
                  <input
                    type="date"
                    value={editForm.closing_date}
                    onChange={(e) => setEditForm({ ...editForm, closing_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Scope</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTender(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-full bg-rose-50 p-2 border border-rose-200">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Tender Packet?</h3>
                <p className="text-xs text-slate-500 font-mono">{deletingTender.gem_bid_number}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-rose-800 space-y-1.5">
              <p className="font-semibold">Notice: Irreversible Cascade Action</p>
              <p>
                Deleting this tender will remove its configured eligibility criteria, bidder submissions, and compliance analysis records. This operation will be logged in the immutable audit trail.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingTender(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD TENDER SPECIFICATION DOCUMENT MODAL */}
      {uploadSpecTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-mono font-bold text-teal-700 border border-teal-200">
                  {uploadSpecTender.gem_bid_number}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">Upload Specification & ATC Document</h2>
              </div>
              <button
                onClick={() => setUploadSpecTender(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSpec} className="mt-4 space-y-4">
              <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-xs text-teal-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  Automated OCR & Requirement Parser
                </span>
                <p>
                  Uploading this specification PDF will extract Additional Terms & Conditions (ATC) and automatically populate the tender eligibility criteria checklist.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Tender Specification / ATC Document</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  required
                  onChange={(e) => setSpecFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-800"
                />
                {specFile && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Selected: {specFile.name} ({(specFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadSpecTender(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingSpec || !specFile}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  <span>{uploadingSpec ? "Processing OCR..." : "Upload & Parse"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
