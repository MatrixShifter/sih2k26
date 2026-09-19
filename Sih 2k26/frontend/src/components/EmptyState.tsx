import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-navy/20 bg-white px-6 py-14 text-center">
      <Inbox className="mb-3 h-10 w-10 text-navy/40" aria-hidden />
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-600">{detail}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
