import { FormEvent, useState } from "react";

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  extraField,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: (notes: string, override?: string) => Promise<void> | void;
  onClose: () => void;
  extraField?: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [override, setOverride] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onConfirm(notes, override);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-card">
        <h2 id="dlg-title" className="font-serif text-xl font-bold text-navy">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-navy">Decision notes (required)</span>
          <textarea
            required
            minLength={8}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {extraField ? (
          <label className="mt-3 block text-sm">
            <span className="font-medium text-navy">Override reason (required if this differs from the AI recommendation)</span>
            <textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" rows={2} value={override} onChange={(e) => setOverride(e.target.value)} />
          </label>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
