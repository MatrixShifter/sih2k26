interface Props {
  level?: "low" | "medium" | "high" | string | null | undefined;
  risk?: "low" | "medium" | "high" | string | null | undefined;
  compact?: boolean;
}

const styles: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-900 border-amber-200",
  high: "bg-rose-50 text-rose-800 border-rose-200",
  critical: "bg-red-100 text-red-900 border-red-300",
};

export function RiskBadge({ level, risk, compact = false }: Props) {
  const raw = (level || risk || "")?.toString().toLowerCase();
  if (!raw || !styles[raw]) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 font-mono">
        {raw ? raw.toUpperCase() : "NOT SCORED"}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider font-mono ${styles[raw]}`}
    >
      {compact ? raw : `${raw} risk`}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  let cls = "bg-slate-50 text-slate-700 border-slate-200";
  if (["pass", "approved", "verified", "valid", "clean", "compliant"].includes(v))
    cls = "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (["partial", "medium", "clarification", "expiring_soon", "needs_review", "needs review", "mismatch", "hold"].includes(v))
    cls = "bg-amber-50 text-amber-900 border-amber-200";
  if (
    [
      "fail",
      "rejected",
      "high",
      "expired",
      "suspicious",
      "failed",
      "missing",
      "non-compliant",
    ].includes(v)
  )
    cls = "bg-rose-50 text-rose-800 border-rose-200";
  if (["pending", "submitted", "under_review", "draft"].includes(v))
    cls = "bg-sky-50 text-sky-800 border-sky-200";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider font-mono ${cls}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
