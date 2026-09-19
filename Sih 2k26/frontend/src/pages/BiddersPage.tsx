import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Building,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Calendar,
  X,
  Plus,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Edit3,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { formatCurrency, formatDate } from "../lib/format";
import { RiskBadge } from "../components/RiskBadge";

export function BiddersPage() {
  const [bidders, setBidders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  // Selected Bidder Detail Modal
  const [selectedBidder, setSelectedBidder] = useState<any | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Register Bidder Modal
  const getDefaultRegisterForm = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return {
      legal_name: `Hindustan Diagnostic & Scientific Corp ${rand} Pvt Ltd`,
      trade_name: "Hindustan Scientific Solutions",
      registered_address: "Plot 88, Okhla Industrial Area Phase-III",
      state: "Delhi",
      pincode: "110020",
      contact_email: `compliance.${rand}@hindustanscientific.in`,
      contact_phone: "011-49823456",
      director_name: "Vikramaditya Sharma",
      annual_turnover_inr: "42000000",
      years_experience: "7",
      pan: `AABCH${rand}K`,
      gstin: `07AABCH${rand}K1Z4`,
      udyam_number: `UDYAM-DL-08-00${rand}`,
      cin: `U33110DL2018PTC${rand}`,
    };
  };

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState(getDefaultRegisterForm());
  const [registering, setRegistering] = useState(false);

  // Edit Bidder State
  const [editingBidder, setEditingBidder] = useState<any | null>(null);
  const [editBidderForm, setEditBidderForm] = useState({
    legal_name: "",
    trade_name: "",
    registered_address: "",
    state: "Delhi",
    pincode: "",
    contact_email: "",
    contact_phone: "",
    director_name: "",
    annual_turnover_inr: "",
    years_experience: "",
    pan: "",
    gstin: "",
    udyam_number: "",
    cin: "",
  });
  const [savingBidderEdit, setSavingBidderEdit] = useState(false);

  // Delete Bidder State
  const [deletingBidder, setDeletingBidder] = useState<any | null>(null);
  const [deletingBidderLoading, setDeletingBidderLoading] = useState(false);

  useEffect(() => {
    loadBidders();
  }, []);

  async function loadBidders() {
    try {
      setLoading(true);
      const data = await api.listBidders();
      setBidders(data);
    } catch (err) {
      toast.error("Failed to load bidder directory");
    } finally {
      setLoading(false);
    }
  }

  async function openBidderDetail(bidderId: number) {
    try {
      setLoadingDetail(true);
      setSelectedBidder({ id: bidderId });
      const detail = await api.getBidder(bidderId);
      setDetailData(detail);
      setSelectedBidder(detail.bidder);
    } catch (err) {
      toast.error("Failed to load bidder profile");
      setSelectedBidder(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleRegisterBidder(e: React.FormEvent) {
    e.preventDefault();
    if (!registerForm.legal_name || !registerForm.pan || !registerForm.contact_email) {
      toast.error("Please fill in required legal name, PAN, and email");
      return;
    }

    try {
      setRegistering(true);
      const payload = {
        legal_name: registerForm.legal_name.trim(),
        trade_name: registerForm.trade_name.trim() || undefined,
        registered_address: registerForm.registered_address.trim(),
        state: registerForm.state,
        pincode: registerForm.pincode.trim() || "110001",
        contact_email: registerForm.contact_email.trim(),
        contact_phone: registerForm.contact_phone.trim() || "011-23456789",
        director_name: registerForm.director_name.trim() || undefined,
        annual_turnover_inr: registerForm.annual_turnover_inr ? parseFloat(registerForm.annual_turnover_inr) : undefined,
        years_experience: registerForm.years_experience ? parseInt(registerForm.years_experience) : undefined,
        pan: registerForm.pan.trim().toUpperCase(),
        gstin: registerForm.gstin.trim().toUpperCase() || undefined,
        udyam_number: registerForm.udyam_number.trim() || undefined,
        cin: registerForm.cin.trim() || undefined,
      };

      await api.createBidder(payload);
      toast.success("Bidder registered successfully");
      setShowRegisterModal(false);
      setRegisterForm(getDefaultRegisterForm());
      await loadBidders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to register bidder");
    } finally {
      setRegistering(false);
    }
  }

  function handleOpenEditBidder(b: any) {
    setEditingBidder(b);
    setEditBidderForm({
      legal_name: b.legal_name || "",
      trade_name: b.trade_name || "",
      registered_address: b.registered_address || "",
      state: b.state || "Delhi",
      pincode: b.pincode || "",
      contact_email: b.contact_email || "",
      contact_phone: b.contact_phone || "",
      director_name: b.director_name || "",
      annual_turnover_inr: b.annual_turnover_inr ? String(b.annual_turnover_inr) : "",
      years_experience: b.years_experience ? String(b.years_experience) : "",
      pan: b.pan || "",
      gstin: b.gstin || "",
      udyam_number: b.udyam_number || "",
      cin: b.cin || "",
    });
  }

  async function handleSaveBidderEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBidder) return;

    try {
      setSavingBidderEdit(true);
      const payload: Record<string, unknown> = {
        legal_name: editBidderForm.legal_name.trim(),
        trade_name: editBidderForm.trade_name.trim() || undefined,
        registered_address: editBidderForm.registered_address.trim(),
        state: editBidderForm.state,
        pincode: editBidderForm.pincode.trim(),
        contact_email: editBidderForm.contact_email.trim(),
        contact_phone: editBidderForm.contact_phone.trim(),
        director_name: editBidderForm.director_name.trim() || undefined,
        annual_turnover_inr: editBidderForm.annual_turnover_inr ? parseFloat(editBidderForm.annual_turnover_inr) : undefined,
        years_experience: editBidderForm.years_experience ? parseInt(editBidderForm.years_experience) : undefined,
        pan: editBidderForm.pan.trim().toUpperCase(),
        gstin: editBidderForm.gstin.trim().toUpperCase() || undefined,
        udyam_number: editBidderForm.udyam_number.trim() || undefined,
        cin: editBidderForm.cin.trim() || undefined,
      };

      await api.updateBidder(editingBidder.id, payload);
      toast.success("Vendor profile updated successfully");
      setEditingBidder(null);
      await loadBidders();
      if (selectedBidder && selectedBidder.id === editingBidder.id) {
        await openBidderDetail(editingBidder.id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update vendor details");
    } finally {
      setSavingBidderEdit(false);
    }
  }

  async function handleConfirmDeleteBidder() {
    if (!deletingBidder) return;

    try {
      setDeletingBidderLoading(true);
      await api.deleteBidder(deletingBidder.id);
      toast.success(`Bidder ${deletingBidder.legal_name} removed`);
      setDeletingBidder(null);
      if (selectedBidder && selectedBidder.id === deletingBidder.id) {
        setSelectedBidder(null);
      }
      await loadBidders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete bidder");
    } finally {
      setDeletingBidderLoading(false);
    }
  }

  const filteredBidders = bidders.filter((b) => {
    const matchesSearch =
      b.legal_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.pan && b.pan.toLowerCase().includes(search.toLowerCase())) ||
      (b.gstin && b.gstin.toLowerCase().includes(search.toLowerCase())) ||
      (b.udyam_number && b.udyam_number.toLowerCase().includes(search.toLowerCase()));
    const matchesState = stateFilter === "all" || b.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const states = ["all", ...Array.from(new Set(bidders.map((b) => b.state)))];

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bidder & Supplier Registry</h1>
          <p className="text-sm text-slate-500">
            Directory of registered vendors with corporate credentials, portal verification tags, and historical compliance ratings.
          </p>
        </div>
        <button
          onClick={() => {
            setRegisterForm(getDefaultRegisterForm());
            setShowRegisterModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Supplier</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Bidders</p>
              <p className="text-2xl font-bold text-slate-900">{bidders.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Compliant / Low Risk</p>
              <p className="text-2xl font-bold text-emerald-600">
                {bidders.filter((b) => b.latest_risk === "low").length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">High Risk Flags</p>
              <p className="text-2xl font-bold text-rose-600">
                {bidders.filter((b) => b.latest_risk === "high").length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Evaluated Packets</p>
              <p className="text-2xl font-bold text-slate-900">
                {bidders.reduce((acc, b) => acc + (b.total_bids || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by legal company name, PAN, GSTIN, or Udyam number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            {states.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All States / UTs" : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bidders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-3.5 pl-4 pr-3 sm:pl-6">Bidder Enterprise</th>
              <th className="px-3 py-3.5">Tax & Business IDs</th>
              <th className="px-3 py-3.5">Financials & Exp</th>
              <th className="px-3 py-3.5">Bids & Docs</th>
              <th className="px-3 py-3.5">Latest Score</th>
              <th className="px-3 py-3.5 text-right pr-4 sm:pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Loading bidder directory...
                </td>
              </tr>
            ) : filteredBidders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No bidders found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredBidders.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 pl-4 pr-3 sm:pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                        {b.legal_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{b.legal_name}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{b.state} ({b.pincode})</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-4 font-mono text-xs">
                    <div className="space-y-0.5">
                      <div className="text-slate-900">
                        <span className="text-slate-400">PAN:</span> {b.pan || "—"}
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">GST:</span> {b.gstin || "—"}
                      </div>
                      {b.udyam_number && (
                        <div className="text-teal-700 font-medium">
                          <span className="text-slate-400">UDYAM:</span> {b.udyam_number}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-4 text-xs">
                    <p className="font-bold text-slate-900">
                      {b.annual_turnover_inr ? formatCurrency(b.annual_turnover_inr) : "—"}
                    </p>
                    <p className="text-slate-500">{b.years_experience || 0} years in business</p>
                  </td>

                  <td className="px-3 py-4 text-xs">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                      {b.total_bids} Bids
                    </span>
                    <span className="ml-2 text-slate-400 text-[11px]">{b.total_documents} artefacts</span>
                  </td>

                  <td className="px-3 py-4">
                    {b.latest_score !== null && b.latest_score !== undefined ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold font-mono ${
                            b.latest_score >= 80
                              ? "text-emerald-600"
                              : b.latest_score >= 60
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {b.latest_score}%
                        </span>
                        {b.latest_risk && <RiskBadge risk={b.latest_risk} />}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Not Evaluated</span>
                    )}
                  </td>

                  <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openBidderDetail(b.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <span>Profile</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditBidder(b)}
                        title="Edit Supplier Details"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBidder(b)}
                        title="Delete Supplier"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* BIDDER DETAIL MODAL */}
      {selectedBidder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedBidder.legal_name}</h2>
                <p className="text-xs text-slate-500">
                  {selectedBidder.trade_name ? `Trading as: ${selectedBidder.trade_name} | ` : ""}
                  Registered in {selectedBidder.state}
                </p>
              </div>
              <button
                onClick={() => setSelectedBidder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400">Loading comprehensive vendor profile...</div>
              ) : (
                <>
                  {/* Credentials Grid */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block text-[10px]">Income Tax PAN</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{selectedBidder.pan || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block text-[10px]">GSTIN Registration</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{selectedBidder.gstin || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block text-[10px]">Udyam MSME Number</span>
                      <span className="font-mono font-bold text-teal-700 text-sm">{selectedBidder.udyam_number || "Not Registered"}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 uppercase font-semibold block text-[10px]">Corporate CIN</span>
                      <span className="font-mono text-slate-800">{selectedBidder.cin || "Proprietorship / LLP"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block text-[10px]">Annual Turnover</span>
                      <span className="font-bold text-slate-900">
                        {selectedBidder.annual_turnover_inr ? formatCurrency(selectedBidder.annual_turnover_inr) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block text-[10px]">Industry Experience</span>
                      <span className="font-bold text-slate-900">{selectedBidder.years_experience || 0} Years</span>
                    </div>

                    <div className="sm:col-span-3 pt-2 border-t border-slate-200/80">
                      <span className="text-slate-400 uppercase font-semibold block text-[10px]">Registered Office</span>
                      <p className="text-slate-700 mt-0.5">{selectedBidder.registered_address}</p>
                    </div>
                  </div>

                  {/* Historical Bids & Analyses */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                      Submitted Bids & Compliance Outcomes ({detailData?.bids?.length || 0})
                    </h3>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-600">
                          <tr>
                            <th className="py-2 px-3 text-left">Ref Code</th>
                            <th className="py-2 px-3 text-left">Tender</th>
                            <th className="py-2 px-3 text-left">Status</th>
                            <th className="py-2 px-3 text-left">Score</th>
                            <th className="py-2 px-3 text-left">Recommendation</th>
                            <th className="py-2 px-3 text-right">Review</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(detailData?.bids || []).map((bid: any) => (
                            <tr key={bid.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{bid.reference_code}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">{bid.tender_title}</td>
                              <td className="py-2.5 px-3">
                                <span className="rounded bg-slate-100 px-2 py-0.5 font-bold uppercase text-[10px]">
                                  {bid.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-teal-700">{bid.score ?? "—"}%</td>
                              <td className="py-2.5 px-3">
                                {bid.recommendation ? (
                                  <span className="capitalize font-semibold text-slate-800">
                                    {bid.recommendation.replace("_", " ")}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Link
                                  to={`/officer/bid/${bid.id}`}
                                  className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 font-semibold"
                                >
                                  <span>Matrix</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Uploaded Documents */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                      Uploaded Compliance Artefacts ({detailData?.documents?.length || 0})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(detailData?.documents || []).map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800 uppercase text-[11px] block">{doc.document_type}</span>
                            <span className="text-slate-500 truncate block max-w-xs">{doc.original_filename}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              doc.integrity_status === "SUSPICIOUS"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            {doc.integrity_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditBidder(selectedBidder)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingBidder(selectedBidder)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Supplier</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBidder(null)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER BIDDER MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Register New Supplier Entity</h2>
                <p className="text-xs text-slate-500">Onboard vendor into GeM compliance verification directory</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterBidder} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Health Technologies Pvt Ltd"
                    value={registerForm.legal_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, legal_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Name / Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Health"
                    value={registerForm.trade_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, trade_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. AAACA1234B"
                    value={registerForm.pan}
                    onChange={(e) => setRegisterForm({ ...registerForm, pan: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 07AAACA1234B1Z5"
                    value={registerForm.gstin}
                    onChange={(e) => setRegisterForm({ ...registerForm, gstin: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Udyam Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UDYAM-DL-01-0012345"
                    value={registerForm.udyam_number}
                    onChange={(e) => setRegisterForm({ ...registerForm, udyam_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="tenders@vendor.com"
                    value={registerForm.contact_email}
                    onChange={(e) => setRegisterForm({ ...registerForm, contact_email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="011-23456789"
                    value={registerForm.contact_phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, contact_phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot 10, Okhla Industrial Area Phase 3, New Delhi"
                  value={registerForm.registered_address}
                  onChange={(e) => setRegisterForm({ ...registerForm, registered_address: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={registerForm.state}
                    onChange={(e) => setRegisterForm({ ...registerForm, state: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Turnover (INR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15000000"
                    value={registerForm.annual_turnover_inr}
                    onChange={(e) => setRegisterForm({ ...registerForm, annual_turnover_inr: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Years Experience</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={registerForm.years_experience}
                    onChange={(e) => setRegisterForm({ ...registerForm, years_experience: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {registering ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BIDDER MODAL */}
      {editingBidder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Vendor Profile</h2>
                <p className="text-xs text-slate-500">Update compliance credentials and statutory registration identifiers</p>
              </div>
              <button
                onClick={() => setEditingBidder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBidderEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Registered Name *</label>
                  <input
                    type="text"
                    required
                    value={editBidderForm.legal_name}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, legal_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Name / DBA</label>
                  <input
                    type="text"
                    value={editBidderForm.trade_name}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, trade_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Income Tax PAN *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={editBidderForm.pan}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, pan: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editBidderForm.gstin}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Udyam MSME Number</label>
                  <input
                    type="text"
                    value={editBidderForm.udyam_number}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, udyam_number: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate CIN</label>
                  <input
                    type="text"
                    value={editBidderForm.cin}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, cin: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Turnover (INR)</label>
                  <input
                    type="number"
                    value={editBidderForm.annual_turnover_inr}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, annual_turnover_inr: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Years in Operation</label>
                  <input
                    type="number"
                    value={editBidderForm.years_experience}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, years_experience: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={editBidderForm.contact_email}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, contact_email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editBidderForm.contact_phone}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, contact_phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address</label>
                  <input
                    type="text"
                    value={editBidderForm.registered_address}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, registered_address: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <select
                    value={editBidderForm.state}
                    onChange={(e) => setEditBidderForm({ ...editBidderForm, state: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                  >
                    {["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Telangana", "Uttar Pradesh", "West Bengal"].map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBidder(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBidderEdit}
                  className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingBidderEdit ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE BIDDER CONFIRMATION MODAL */}
      {deletingBidder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-full bg-rose-50 p-2 border border-rose-200">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Vendor Entity?</h3>
                <p className="text-xs text-slate-500 font-medium">{deletingBidder.legal_name}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-rose-800 space-y-1.5">
              <p className="font-semibold">Notice: Cascade Purge</p>
              <p>
                Removing this supplier will purge their uploaded documents, bid applications, and evaluation matrix records. All actions are tracked in the security audit trail.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingBidder(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBidder}
                disabled={deletingBidderLoading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingBidderLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
