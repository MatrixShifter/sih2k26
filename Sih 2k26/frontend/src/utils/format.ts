export const DOCUMENT_LABELS: Record<string, string> = {
  udyam: "Udyam / MSME",
  gst: "GST certificate",
  pan: "PAN",
  mca21: "MCA21 / CIN",
  epfo: "EPFO",
  esic: "ESIC",
  digilocker: "DigiLocker",
  nsic: "NSIC / SPRS",
  startup_india: "Startup India (DPIIT)",
  financial: "Financial statements",
  experience: "Experience certificate",
  work_order: "Work order",
  oem: "OEM authorisation",
  technical: "Technical certificate",
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_LABELS);

export function inr(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export const formatCurrency = inr;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function recLabel(value: string | null | undefined) {
  if (!value) return "Not scored";
  return value.replaceAll("_", " ");
}
