import { useEffect, useState } from "react";
import {
  PackageCheck,
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSearch,
  Truck,
  Building,
  Laptop,
  Cpu,
  HardDrive,
  Monitor,
  ShieldCheck,
  Send,
  Loader2,
  RefreshCw,
  Eye,
  Camera,
  Layers,
  Wrench,
  AlertOctagon,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { formatDate } from "../lib/format";
import { HumanInspectionModal } from "../components/HumanInspectionModal";

export function DeliveryVerificationPage({
  defaultTab,
}: {
  defaultTab?: "scanner" | "batches" | "assets" | "inspections" | "cases";
} = {}) {
  const [activeTab, setActiveTab] = useState<
    "scanner" | "batches" | "assets" | "inspections" | "cases"
  >(defaultTab || "scanner");
  const [loading, setLoading] = useState(true);

  // Data
  const [batches, setBatches] = useState<any[]>([]);
  const [testDevices, setTestDevices] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [inspectionCases, setInspectionCases] = useState<any[]>([]);
  const [selectedCaseIdForModal, setSelectedCaseIdForModal] = useState<string | null>(null);

  // Scanner state
  const [searchQuery, setSearchQuery] = useState("");
  const [scannedAsset, setScannedAsset] = useState<any | null>(null);
  const [scanMode, setScanMode] = useState<"prototype" | "manual" | "qr">("prototype");
  const [scanning, setScanning] = useState(false);

  // Inspection request modal state
  const [inspectionModalAsset, setInspectionModalAsset] = useState<any | null>(null);
  const [targetComponents, setTargetComponents] = useState<string[]>([]);
  const [inspectionInstructions, setInspectionInstructions] = useState("");
  const [submittingInspection, setSubmittingInspection] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      const [batchesRes, testDevRes, inspRes, casesRes] = await Promise.all([
        api.getDeliveryBatches().catch(() => []),
        api.getPrototypeTestDevices().catch(() => ({ devices: [] })),
        api.getPhysicalInspections().catch(() => []),
        api.getInspectionCases().catch(() => []),
      ]);

      setBatches(batchesRes || []);
      setTestDevices(testDevRes?.devices || []);
      setInspections(inspRes || []);
      setInspectionCases(casesRes || []);

      // If batch exists, load its assets
      if (batchesRes && batchesRes.length > 0) {
        const batchAssets = await api.getBatchAssets(batchesRes[0].id).catch(() => []);
        setAssets(batchAssets || []);
      }

      // Pre-load Unit 2 (SSD Mismatch - user's prompt example) by default for immediate preview
      const initialAsset = await api.lookupDeliveryAsset("SN-DELL-5530-MIS-02").catch(() => null);
      if (initialAsset) {
        setScannedAsset(initialAsset);
      }
    } catch (err) {
      toast.error("Failed to load delivery verification data");
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(query: string) {
    if (!query.trim()) return;
    try {
      setScanning(true);
      const asset = await api.lookupDeliveryAsset(query.trim());
      setScannedAsset(asset);
      toast.success(`Asset '${asset.asset_id}' retrieved`);
    } catch (err: any) {
      toast.error(err?.message || "Asset not found in delivery registry");
    } finally {
      setScanning(false);
    }
  }

  async function handleScanTestDevice(device: any) {
    try {
      setScanning(true);
      // Simulate hardware telemetry readout
      await new Promise((r) => setTimeout(r, 400));
      const res = await api.verifyDeliveryAsset({
        asset_id_or_serial: device.serial_number,
        actual_spec: device.spec,
        inspection_notes: `Hardware telemetry captured via prototype diagnostics adapter (${device.label}).`,
      });

      // Reload full asset details
      const updatedAsset = await api.lookupDeliveryAsset(device.serial_number);
      setScannedAsset(updatedAsset);
      toast.success(`Hardware captured for ${device.serial_number}: ${res.inspection_status}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to scan test device");
    } finally {
      setScanning(false);
    }
  }

  function openInspectionModal(asset: any) {
    setInspectionModalAsset(asset);
    // Pre-populate components based on mismatches
    const comps = (asset.mismatch_details || []).map((m: any) => m.component);
    if (comps.length === 0) {
      comps.push("Physical Chassis & Serial Hologram");
    }
    setTargetComponents(comps);

    // Pre-populate recommendations
    const recs = asset.verification?.inspection_recommendations || [];
    setInspectionInstructions(
      recs.length > 0
        ? recs.join("\n")
        : "Field engineer to open drive bay / inspect internal hardware serials and run OEM offline diagnostics."
    );
  }

  async function handleSubmitPhysicalInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!inspectionModalAsset) return;

    try {
      setSubmittingInspection(true);
      await api.requestPhysicalInspection(inspectionModalAsset.asset_id, {
        target_components: targetComponents,
        instructions: inspectionInstructions,
      });

      toast.success("Physical inspection requested and dispatched to field engineering queue");
      setInspectionModalAsset(null);
      // Refresh current asset and inspections list
      const updated = await api.lookupDeliveryAsset(inspectionModalAsset.asset_id);
      setScannedAsset(updated);
      const inspList = await api.getPhysicalInspections();
      setInspections(inspList);
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch inspection request");
    } finally {
      setSubmittingInspection(false);
    }
  }

  const firstBatch = batches[0];
  const totalAwardedLaptops = 20000;
  const currentBatchTotal = firstBatch?.total_units || 500;
  const verifiedCount = firstBatch?.verified_units || 0;
  const failedCount = firstBatch?.failed_units || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Non-Automatic Rejection Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-teal-50/40 to-white p-4 text-xs text-sky-950 shadow-xs">
        <ShieldCheck className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold uppercase tracking-wider text-teal-950 flex items-center gap-2">
            <span>Post-Award Delivery Inspection Framework (Decision-Support)</span>
            <span className="rounded bg-teal-200/70 px-1.5 py-0.2 text-[10px] font-semibold text-teal-900">
              Contract Assurance
            </span>
          </div>
          <p className="leading-relaxed text-slate-600">
            This module verifies delivered goods against contracted tender specifications.
            <strong> The system does not automatically reject products upon mismatch.</strong> Discrepancies generate a structured
            physical inspection recommendation so officers can investigate, request field verification, or address vendor variances.
          </p>
        </div>
      </div>

      {/* Controlled Prototype Adapter Notice */}
      <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs text-purple-900">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span>
            <strong>Controlled Prototype Hardware Adapter:</strong> Real hardware APIs are not accessible in web browsers. Standardized hardware telemetry profiles are provided below for verification testing.
          </span>
        </div>
        <span className="rounded bg-purple-200/80 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-900">
          PROTOTYPE TESTBED
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-teal-100 px-2.5 py-0.5 text-xs font-bold uppercase text-teal-800 border border-teal-200">
              Phase 7: Delivery Verification
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Tender: 20,000 Commercial Laptops (Lot 1: 500 Units)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Post-Award Delivery &amp; Asset Specification Verification
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl">
            Automated comparison of delivered device specifications (CPU, RAM, SSD, Display, Warranty) against contracted GeM tender ATC requirements.
          </p>
        </div>

        <button
          onClick={loadInitialData}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-600">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contracted Order</p>
              <p className="text-2xl font-bold text-slate-900">{totalAwardedLaptops.toLocaleString()}</p>
              <span className="text-[11px] text-teal-700 font-medium">Batch 1: 500 units received</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Verified &amp; Passed</p>
              <p className="text-2xl font-bold text-emerald-600">{verifiedCount}</p>
              <span className="text-[11px] text-emerald-700 font-medium">100% specification match</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-100 p-2.5 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase tracking-wide">Specification Mismatch</p>
              <p className="text-2xl font-bold text-rose-600">{failedCount}</p>
              <span className="text-[11px] text-rose-700 font-medium">Pending physical inspection</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-600">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Lab Inspections</p>
              <p className="text-2xl font-bold text-amber-600">{inspections.length}</p>
              <span className="text-[11px] text-amber-700 font-medium">Field technician orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("scanner")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeTab === "scanner"
              ? "border-teal-600 text-teal-700 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>QR &amp; Serial Verification Station</span>
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeTab === "batches"
              ? "border-teal-600 text-teal-700 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Delivery Batches ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("assets")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeTab === "assets"
              ? "border-teal-600 text-teal-700 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Asset Inventory ({assets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("inspections")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeTab === "inspections"
              ? "border-teal-600 text-teal-700 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Physical Inspection Orders ({inspections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("cases")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
            activeTab === "cases"
              ? "border-teal-600 text-teal-700 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Human Inspection Cases ({inspectionCases.length})</span>
        </button>
      </div>

      {/* TAB 1: SCANNER & SPECIFICATION VERIFICATION STATION */}
      {activeTab === "scanner" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input Methods (Prototype Devices, Manual Serial, QR) */}
          <div className="space-y-4 lg:col-span-1">
            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setScanMode("prototype")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  scanMode === "prototype" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Controlled Test Devices
              </button>
              <button
                onClick={() => setScanMode("manual")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  scanMode === "manual" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Manual Serial Entry
              </button>
              <button
                onClick={() => setScanMode("qr")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  scanMode === "qr" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                QR Code Scanner
              </button>
            </div>

            {/* Sub-Mode 1: Controlled Prototype Devices */}
            {scanMode === "prototype" && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Standardized Test Telemetry
                  </h3>
                  <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-mono">
                    PROTOTYPE
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Select a test laptop unit to simulate reading actual hardware telemetry:
                </p>

                <div className="space-y-2">
                  {testDevices.map((dev) => {
                    const isSelected = scannedAsset?.serial_number === dev.serial_number;
                    const isMismatch = dev.expected_result === "MISMATCH";
                    const isInspection = dev.expected_result === "NEEDS_PHYSICAL_INSPECTION";

                    return (
                      <button
                        key={dev.id}
                        onClick={() => handleScanTestDevice(dev)}
                        disabled={scanning}
                        className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1 ${
                          isSelected
                            ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{dev.label}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              isMismatch
                                ? "bg-rose-100 text-rose-800"
                                : isInspection
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {dev.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          SN: {dev.serial_number} | {dev.model}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Mode 2: Manual Serial Number Entry */}
            {scanMode === "manual" && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Manual Serial / Asset ID Entry
                </h3>
                <p className="text-xs text-slate-500">
                  Type the laser-etched serial number or GeM asset code from the laptop chassis:
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLookup(searchQuery);
                  }}
                  className="space-y-2.5"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. SN-DELL-5530-MIS-02 or GEM-ASSET-LTP-001"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={scanning || !searchQuery.trim()}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-2 text-xs font-bold text-white hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    <span>Lookup &amp; Retrieve Specs</span>
                  </button>
                </form>

                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Quick Test Serials:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["SN-DELL-5530-PASS-01", "SN-DELL-5530-MIS-02", "SN-HP-840-MIS-03"].map((sn) => (
                      <button
                        key={sn}
                        onClick={() => {
                          setSearchQuery(sn);
                          handleLookup(sn);
                        }}
                        className="rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 px-2 py-1 text-[11px] font-mono text-slate-600 border border-slate-200"
                      >
                        {sn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Mode 3: QR Code Scanner */}
            {scanMode === "qr" && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2D Barcode / QR Scanner
                  </h3>
                  <Camera className="h-4 w-4 text-teal-600" />
                </div>
                <div className="relative aspect-video rounded-xl bg-slate-900 flex flex-col items-center justify-center p-4 text-center overflow-hidden border border-slate-800">
                  {/* Scanner overlay effect */}
                  <div className="absolute inset-x-0 h-0.5 bg-rose-500 animate-pulse top-1/2"></div>
                  <QrCode className="h-10 w-10 text-slate-500 mb-2" />
                  <p className="text-xs text-slate-300 font-semibold">Optical QR Sensor Ready</p>
                  <p className="text-[10px] text-slate-400 mt-1">Point barcode scanner at chassis QR code</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 block">Simulate Optical QR Scan:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleLookup("SN-DELL-5530-PASS-01")}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 text-[11px] font-semibold text-slate-700 text-left"
                    >
                      QR: Dell Pass Unit
                    </button>
                    <button
                      onClick={() => handleLookup("SN-DELL-5530-MIS-02")}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 text-[11px] font-semibold text-slate-700 text-left"
                    >
                      QR: SSD Mismatch Unit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Info Card */}
            {firstBatch && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                  Active Delivery Consignment
                </span>
                <div className="font-bold text-slate-900 text-sm">{firstBatch.batch_number}</div>
                <div className="text-slate-600">PO: <span className="font-mono font-semibold">{firstBatch.po_number}</span></div>
                <div className="text-slate-600">Vendor: <span className="font-semibold">{firstBatch.vendor_name}</span></div>
                <div className="text-slate-500 text-[11px]">{firstBatch.delivery_location}</div>
              </div>
            )}
          </div>

          {/* Right Column: Specification Comparison Matrix & Mismatch Inspector */}
          <div className="lg:col-span-2 space-y-4">
            {!scannedAsset ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                <Laptop className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-700">No Device Scanned</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Select one of the controlled test devices on the left or enter a serial number to initiate hardware specification verification.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Device Header Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700 border border-teal-100">
                        <Laptop className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">{scannedAsset.model_number}</h2>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 font-mono">
                            {scannedAsset.asset_id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          OEM: <strong className="text-slate-700">{scannedAsset.oem}</strong> &bull; Serial:{" "}
                          <span className="font-mono font-semibold text-slate-800">{scannedAsset.serial_number}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          scannedAsset.inspection_status === "PASS"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : scannedAsset.inspection_status === "MISMATCH"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : scannedAsset.inspection_status === "NEEDS_PHYSICAL_INSPECTION"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {scannedAsset.inspection_status === "MISMATCH"
                          ? "SPECIFICATION MISMATCH"
                          : scannedAsset.inspection_status}
                      </span>
                    </div>
                  </div>

                  {/* Result & Guidance Banner */}
                  {scannedAsset.inspection_status === "MISMATCH" ? (
                    <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50/50 p-4 text-xs text-rose-950 space-y-2">
                      <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-rose-900 text-sm">
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                        <span>SPECIFICATION MISMATCH DETECTED</span>
                      </div>
                      <p className="leading-relaxed">
                        Hardware readout deviates from contracted tender ATC requirements.
                        <strong> Do not automatically reject the product.</strong> Initiate a physical lab inspection to verify internal component model numbers and part numbers.
                      </p>
                      {scannedAsset.verification?.inspection_recommendations && (
                        <div className="bg-white/90 p-2.5 rounded-lg border border-rose-200 font-medium text-rose-900 space-y-1">
                          <span className="font-bold uppercase text-[10px] text-rose-600 block">Recommended Action:</span>
                          {scannedAsset.verification.inspection_recommendations.map((rec: string, i: number) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span>&bull;</span>
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : scannedAsset.inspection_status === "PASS" ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold uppercase tracking-wide">Specification Match:</span>{" "}
                        All delivered hardware components (CPU, RAM, SSD, Display, Warranty) satisfy the contracted tender specifications.
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 flex items-center gap-3">
                      <Wrench className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold uppercase tracking-wide">Physical Lab Inspection Dispatched:</span>{" "}
                        {scannedAsset.inspection_notes || "Awaiting field engineer disassembly and hardware audit."}
                      </div>
                    </div>
                  )}

                  {/* Specification Comparison Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Specification Comparison Matrix (Tender ATC vs Actual Device)
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        Batch: {scannedAsset.batch_number}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">Hardware Component</th>
                            <th className="py-2.5 px-3">Contracted ATC Specification (Expected)</th>
                            <th className="py-2.5 px-3">Delivered Device Reading (Actual)</th>
                            <th className="py-2.5 px-3 text-center">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(scannedAsset.verification?.comparisons || []).map((comp: any, idx: number) => {
                            const isPass = comp.status === "PASS";
                            return (
                              <tr key={idx} className={!isPass ? "bg-rose-50/40" : ""}>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {comp.component}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-600">
                                  {comp.expected}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`font-semibold ${!isPass ? "text-rose-700 font-bold" : "text-slate-800"}`}>
                                    {comp.actual}
                                  </span>
                                  {!isPass && (
                                    <span className="block text-[10px] text-rose-600 font-normal">
                                      {comp.detail}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      isPass
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-rose-100 text-rose-800"
                                    }`}
                                  >
                                    {isPass ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>PASS</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-3 w-3" />
                                        <span>MISMATCH</span>
                                      </>
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400">
                      {scannedAsset.verified_at
                        ? `Last verified: ${formatDate(scannedAsset.verified_at)}`
                        : "Awaiting inspection determination"}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const cRes = await api.createCaseFromAsset(scannedAsset.asset_id);
                            setSelectedCaseIdForModal(cRes.case_id);
                          } catch (e: any) {
                            toast.error(e?.message || "Failed to open inspection case");
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 shadow-sm transition"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Open Human Inspection Dossier</span>
                      </button>

                      <button
                        onClick={() => openInspectionModal(scannedAsset)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm transition"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>Dispatch Field Check</span>
                      </button>

                      {scannedAsset.inspection_status === "MISMATCH" && (
                        <button
                          onClick={async () => {
                            try {
                              await api.verifyDeliveryAsset({
                                asset_id_or_serial: scannedAsset.asset_id,
                                actual_spec: scannedAsset.actual_spec,
                                status_override: "PASS",
                                inspection_notes: "Officer granted formal technical variance approval under ATC clause 14.2.",
                              });
                              toast.success("Variance approval recorded");
                              const u = await api.lookupDeliveryAsset(scannedAsset.asset_id);
                              setScannedAsset(u);
                            } catch (e: any) {
                              toast.error(e?.message);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                          <span>Approve with Officer Variance</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DELIVERY BATCHES */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batches.map((batch) => {
              const pctVerified = Math.round((batch.verified_units / batch.total_units) * 100);

              return (
                <div key={batch.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Consignment Batch</span>
                      <h3 className="text-base font-bold text-slate-900">{batch.batch_number}</h3>
                    </div>
                    <span className="rounded bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-bold">
                      {batch.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div>PO Number: <span className="font-mono font-semibold text-slate-800">{batch.po_number}</span></div>
                    <div>Contractor: <span className="font-semibold text-slate-800">{batch.vendor_name}</span></div>
                    <div>Tender: <span className="text-slate-700">{batch.tender_title}</span></div>
                    <div>Warehouse: <span className="text-slate-700">{batch.delivery_location}</span></div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Inspection Progress</span>
                      <span>{batch.verified_units} / {batch.total_units} units ({pctVerified}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(pctVerified, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <span>Passed: <strong className="text-emerald-600">{batch.verified_units}</strong></span>
                    <span>Mismatched: <strong className="text-rose-600">{batch.failed_units}</strong></span>
                    <span>Pending: <strong className="text-slate-700">{batch.pending_units}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ASSET INVENTORY REGISTRY */}
      {activeTab === "assets" && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Delivery Assets</h3>
              <p className="text-xs text-slate-500">Individual laptop units tagged for delivery consignment Batch 1</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Total: {assets.length} items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Asset ID</th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">OEM &amp; Model</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Inspection Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{ast.asset_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{ast.serial_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{ast.oem}</div>
                      <div className="text-[11px] text-slate-400">{ast.model_number}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          ast.inspection_status === "PASS"
                            ? "bg-emerald-100 text-emerald-800"
                            : ast.inspection_status === "MISMATCH"
                            ? "bg-rose-100 text-rose-800"
                            : ast.inspection_status === "NEEDS_PHYSICAL_INSPECTION"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {ast.inspection_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{ast.inspection_notes || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={async () => {
                          const full = await api.lookupDeliveryAsset(ast.asset_id);
                          setScannedAsset(full);
                          setActiveTab("scanner");
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition"
                      >
                        Inspect Specs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PHYSICAL INSPECTION ORDERS */}
      {activeTab === "inspections" && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Physical Inspection Orders Queue</h3>
            <p className="text-xs text-slate-500">
              Field engineering orders issued following automated specification mismatches or chassis tampering signals.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {inspections.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No active physical inspection orders.</div>
            ) : (
              inspections.map((insp) => (
                <div key={insp.id} className="p-4 space-y-2 text-xs hover:bg-slate-50/60 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                        {insp.status}
                      </span>
                      <span className="font-mono font-bold text-slate-900">Asset: {insp.asset_id}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="font-mono text-slate-600">SN: {insp.serial_number}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {insp.created_at ? formatDate(insp.created_at) : "Recent"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                    <div className="font-bold text-[10px] uppercase text-slate-400">Components Flagged for Disassembly:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(insp.target_components || []).map((c: string, idx: number) => (
                        <span key={idx} className="rounded bg-white border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                          {c}
                        </span>
                      ))}
                    </div>
                    <p className="pt-1 text-slate-600 italic leading-relaxed">
                      <strong>Checklist Instructions: </strong>{insp.instructions}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Ordered by: <strong className="text-slate-700">{insp.requested_by}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: HUMAN INSPECTION CASES (PHASE 8) */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Human Inspection Cases &amp; Final Determinations
                  </h3>
                  <span className="rounded bg-teal-100 text-teal-800 font-mono text-xs px-2 py-0.5 font-bold">
                    Phase 8
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Every detected anomaly generates a structured case. Human inspectors evaluate the 13-point checklist and record statutory outcomes.
                </p>
              </div>

              <div className="text-xs text-slate-500">
                Total Cases: <strong className="text-slate-800">{inspectionCases.length}</strong>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {inspectionCases.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No human inspection cases registered yet.
                </div>
              ) : (
                inspectionCases.map((c) => {
                  const isPending = c.final_decision === "PENDING";
                  const isAccept = c.final_decision === "ACCEPT";
                  const isReject = c.final_decision === "REJECT";
                  const isHold = c.final_decision === "HOLD";

                  return (
                    <div
                      key={c.id}
                      className="p-5 hover:bg-slate-50/60 transition space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                              isAccept
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : isReject
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : isHold
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : isPending
                                ? "bg-slate-100 text-slate-700 border border-slate-300"
                                : "bg-purple-100 text-purple-800 border border-purple-200"
                            }`}
                          >
                            Outcome: {c.final_decision}
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {c.case_id}
                          </span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="font-mono text-slate-700 text-xs">
                            Asset: <strong>{c.asset_id}</strong>
                          </span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="font-mono text-slate-600 text-xs">
                            SN: {c.serial_number}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedCaseIdForModal(c.case_id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 shadow-sm transition"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Review 13-Point Checklist &amp; Decide</span>
                        </button>
                      </div>

                      {/* Detected Issue */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                        <div className="font-bold text-[10px] uppercase text-slate-500">
                          Detected Issue &amp; Discrepancy:
                        </div>
                        <p className="text-slate-800 font-medium">{c.detected_issue}</p>
                      </div>

                      {/* Decision Justification if recorded */}
                      {c.decision_justification && (
                        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-xs space-y-1">
                          <div className="font-bold text-[10px] uppercase text-teal-800 flex items-center justify-between">
                            <span>Human Officer Determination Justification</span>
                            {c.decided_by_name && (
                              <span className="text-slate-500 font-normal">
                                Decided by <strong>{c.decided_by_name}</strong> on {formatDate(c.decided_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-teal-950 font-medium italic">
                            "{c.decision_justification}"
                          </p>
                          {c.officer_remarks && (
                            <p className="text-[11px] text-slate-600 pt-1">
                              <strong>Remarks: </strong>{c.officer_remarks}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                        <div>
                          Supplier: <strong className="text-slate-700">{c.supplier_name}</strong> &bull; Batch:{" "}
                          <span className="font-mono font-semibold">{c.batch_number}</span>
                        </div>
                        <div>
                          Inspector: <strong className="text-slate-700">{c.inspector_name}</strong> &bull; Date:{" "}
                          {formatDate(c.inspection_date)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Request Physical Inspection */}
      {inspectionModalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Request Physical Inspection
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Asset: {inspectionModalAsset.asset_id} (SN: {inspectionModalAsset.serial_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectionModalAsset(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPhysicalInspection} className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900">
                <p className="leading-relaxed">
                  <strong>Procedural Safeguard:</strong> This action dispatches a formal inspection order to the warehouse quality control lab rather than automatically rejecting the product.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Target Components to Verify
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Primary Storage (SSD)",
                    "Drive Bay Disassembly",
                    "System Memory (RAM)",
                    "Display Panel / EDID",
                    "Warranty Seal & Hologram",
                    "Motherboard Part Number",
                  ].map((comp) => {
                    const isChecked = targetComponents.includes(comp);
                    return (
                      <label
                        key={comp}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                          isChecked
                            ? "border-teal-500 bg-teal-50/50 text-teal-900 font-semibold"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTargetComponents([...targetComponents, comp]);
                            } else {
                              setTargetComponents(targetComponents.filter((c) => c !== comp));
                            }
                          }}
                          className="rounded text-teal-600"
                        />
                        <span>{comp}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Field Engineer Checklist Instructions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={inspectionInstructions}
                  onChange={(e) => setInspectionInstructions(e.target.value)}
                  placeholder="Specify step-by-step instructions for physical verification..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInspectionModalAsset(null)}
                  disabled={submittingInspection}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInspection || !inspectionInstructions.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 font-bold text-white hover:bg-teal-700 shadow-sm transition disabled:opacity-50"
                >
                  {submittingInspection ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Dispatch Inspection Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Human Inspection Case Dossier (Phase 8) */}
      {selectedCaseIdForModal && (
        <HumanInspectionModal
          caseId={selectedCaseIdForModal}
          onClose={() => setSelectedCaseIdForModal(null)}
          onSuccess={loadInitialData}
        />
      )}
    </div>
  );
}
