import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { NotificationItem } from "../types";
import { formatDateTime } from "../utils/format";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const navigate = useNavigate();
  const unread = items.filter((n) => !n.is_read).length;

  async function load() {
    try {
      setItems(await api.notifications());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 text-current transition hover:bg-white/10 lg:hover:bg-slate-100"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-teal"
            aria-hidden
          />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white text-navy shadow-card">
          <p className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notifications
          </p>
          <ul className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-slate-500">
                No notifications yet.
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      n.is_read ? "" : "bg-teal-50/40"
                    }`}
                    onClick={async () => {
                      if (!n.is_read) await api.markRead(n.id);
                      setOpen(false);
                      if (n.bid_id) navigate(`/officer/bid/${n.bid_id}`);
                      void load();
                    }}
                  >
                    <span className="font-medium">{n.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {n.body} · {formatDateTime(n.created_at)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
