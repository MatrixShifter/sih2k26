import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ClipboardList,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  ShieldCheck,
  X,
  Activity,
  User as UserIcon,
  ChevronRight,
  ExternalLink,
  FileText,
  Users,
  Layers,
  ShieldAlert,
  Printer,
  Settings as SettingsIcon,
  PackageCheck,
  CheckCircle2,
  History,
  Building,
  Shield,
  Search,
  CheckCircle,
} from "lucide-react";
import { homeForRole, useAuth } from "../context/AuthContext";
import { NotificationBell } from "../components/NotificationBell";
import { GuidedDemoController } from "../components/GuidedDemoController";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const currentSection = (() => {
    const p = location.pathname;
    if (p.includes("/tenders")) return { title: "Tender Management & ATC Specifications", icon: FileText, category: "Procurement" };
    if (p.includes("/bids") || p.includes("/bid/")) return { title: "Bid Evaluation & Officer Review Queue", icon: ClipboardList, category: "Procurement" };
    if (p.includes("/verification")) return { title: "Government Registry & Document Verification", icon: ShieldCheck, category: "Verification" };
    if (p.includes("/anomalies")) return { title: "Vigilance & Relationship Detection", icon: ShieldAlert, category: "Verification" };
    if (p.includes("/deliveries")) return { title: "Post-Award Delivery & Asset Verification", icon: PackageCheck, category: "Post-Award" };
    if (p.includes("/inspections")) return { title: "Human Inspection Cases & Outcomes", icon: CheckCircle2, category: "Post-Award" };
    if (p.includes("/compare")) return { title: "Multi-Bid Comparison Matrix", icon: GitCompare, category: "Verification" };
    if (p.includes("/audit")) return { title: "Tamper-Evident Audit Ledger", icon: History, category: "Records" };
    if (p.includes("/bidders")) return { title: "Supplier Directory & Profiles", icon: Users, category: "Records" };
    if (p.includes("/documents")) return { title: "Document Repository & OCR", icon: Layers, category: "Records" };
    if (p.includes("/reports")) return { title: "Procurement Reports & Dossiers", icon: Printer, category: "Records" };
    if (p.includes("/settings")) return { title: "System Parameters & Settings", icon: SettingsIcon, category: "System" };
    if (p.includes("/bidder/dashboard")) return { title: "Bidder Portal & Uploads", icon: LayoutDashboard, category: "Bidder" };
    return { title: "Procurement Officer Workbench", icon: LayoutDashboard, category: "Procurement" };
  })();

  // Grouped Navigation Structure as required
  const navigationGroups = [
    {
      title: "WORKSPACE",
      items: [
        { to: "/officer/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/tenders", label: "Tenders", icon: FileText },
        { to: "/bids", label: "Bids", icon: ClipboardList },
      ],
    },
    {
      title: "VERIFICATION",
      items: [
        { to: "/verification", label: "Document Verification", icon: ShieldCheck },
        { to: "/compliance", label: "Compliance", icon: Scale },
        { to: "/anomalies", label: "Vigilance", icon: ShieldAlert },
        { to: "/compare", label: "Comparisons", icon: GitCompare },
      ],
    },
    {
      title: "POST-AWARD",
      items: [
        { to: "/deliveries", label: "Delivery", icon: PackageCheck },
        { to: "/inspections", label: "Inspections", icon: CheckCircle2 },
        { to: "/bidders", label: "Supplier Performance", icon: Users },
      ],
    },
    {
      title: "RECORDS",
      items: [
        { to: "/audit-log", label: "Audit Trail", icon: History },
        { to: "/documents", label: "Document Repository", icon: Layers },
        { to: "/reports", label: "Official Reports", icon: Printer },
      ],
    },
    {
      title: "ADMINISTRATION",
      items: [
        { to: "/settings", label: "System Parameters", icon: SettingsIcon },
      ],
    },
  ];

  const bidderNav = [
    { to: "/bidder/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/tenders", label: "Browse Tenders", icon: FileText },
    { to: "/audit-log", label: "Audit Trail", icon: History },
  ];

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "PO";

  return (
    <div className="min-h-screen bg-slate-50 lg:flex font-sans">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-slate-500"
      >
        Skip to content
      </a>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Enterprise Government Sidebar */}
      <aside
        className={`z-30 bg-[#0b1329] text-slate-200 border-r border-slate-800/80 transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:flex lg:w-[228px] lg:min-w-[228px] lg:flex-col ${
          open
            ? "fixed inset-y-0 left-0 w-[228px] shadow-2xl flex flex-col h-screen"
            : "hidden lg:flex"
        }`}
      >
        {/* Government Portal Header */}
        <div className="border-b border-slate-800/80 px-4 py-3.5 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white font-bold shadow-xs">
                <Scale className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white font-sans">
                    ComplyGeM AI
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-blue-400 border border-slate-700 font-mono">
                    GeM Gov
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                  Procurement Compliance Platform
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Officer / User Authentication Card */}
        <div className="mx-3 my-2.5 rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-100 leading-tight">
                {user?.full_name || "Procurement Officer"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                    user?.role === "officer"
                      ? "bg-blue-950/80 text-blue-300 border border-blue-800/80"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  {user?.role === "officer" ? "Procurement Officer" : "Bidder Representative"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Categorized Navigation Groups */}
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-3 px-3 py-1 overflow-y-auto">
          {user?.role === "officer" ? (
            navigationGroups.map((group) => (
              <div key={group.title} className="space-y-0.5">
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {group.title}
                </p>
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-slate-800 text-white font-semibold border-l-[3px] border-blue-500 shadow-sm"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                            isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            ))
          ) : (
            <div className="space-y-0.5">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                BIDDER WORKSPACE
              </p>
              {bidderNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-slate-800 text-white font-semibold border-l-[3px] border-blue-500"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* Dignified Sidebar Footer */}
        <div className="border-t border-slate-800 px-3.5 py-3 bg-slate-950/80 mt-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-300 tracking-wide">Government of India</p>
            <p className="text-[9px] text-slate-400">Ministry of Commerce & Industry</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60 font-mono">
            <span className="text-slate-400">v2.4.0</span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-sans">
              <a href="#help" className="hover:text-white transition">Help</a>
              <span>·</span>
              <a href="#privacy" className="hover:text-white transition">Privacy</a>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="min-w-0 flex-1 flex flex-col min-h-screen">
        {/* Professional Enterprise Top Navbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-none"
              aria-label="Open navigation drawer"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-semibold border border-slate-200">
                <Scale className="h-3.5 w-3.5 text-slate-700" />
                GeM Portal
              </span>
              <span className="text-slate-300 font-normal">/</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                <currentSection.icon className="h-3.5 w-3.5 text-blue-600" />
                {currentSection.title}
              </span>
            </div>
          </div>

          {/* Center Global Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenders, bidders, documents..."
                className="w-full rounded-md border border-slate-200 bg-slate-50/80 pl-9 pr-12 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 font-mono">Ctrl K</kbd>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Live System Operational Status Badge */}
            <div className="hidden lg:inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Operational</span>
            </div>

            {/* Direct Swagger API Reference */}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="hidden xl:inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
              title="Open Swagger API Specs"
            >
              <Activity className="h-3 w-3 text-slate-500" />
              <span>API Specs</span>
              <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
            </a>

            <NotificationBell />

            <div className="h-4 w-px bg-slate-200" />

            {/* Officer User Pill */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-700 font-medium">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-bold">
                {initials}
              </div>
              <div className="text-left hidden md:block">
                <p className="font-semibold text-slate-900 leading-none text-xs">{user?.full_name || "Priya Nair"}</p>
                <p className="text-[10px] text-slate-500 font-normal leading-none mt-0.5">Procurement Officer</p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>

      {/* SIH 2026 Demonstration Mode Floating Controller */}
      <GuidedDemoController />
    </div>
  );
}

export { AppLayout as AppShell };
