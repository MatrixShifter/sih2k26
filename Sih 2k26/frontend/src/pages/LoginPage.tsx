import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  Zap,
  FileCheck2,
  AlertOctagon,
  Bot,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  Building,
  UserCheck,
} from "lucide-react";
import { homeForRole, useAuth } from "../context/AuthContext";
import { ApiError } from "../services/api";
import type { UserRole } from "../types";

const DEMOS = [
  {
    role: "officer" as const,
    email: "priya.nair@gem.gov.in",
    label: "Priya Nair",
    sub: "GeM Procurement Officer",
    badge: "Official Reviewer",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  },
  {
    role: "bidder" as const,
    email: "ravi.shinde@bharatprecision.in",
    label: "Ravi Shinde",
    sub: "Bharat Precision Diagnostics",
    badge: "100/100 Validated",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    role: "bidder" as const,
    email: "ananya.rao@kaverimedtech.in",
    label: "Ananya Rao",
    sub: "Kaveri MedTech Solutions",
    badge: "Startup India",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    role: "bidder" as const,
    email: "suresh.gupta@gangamart.in",
    label: "Suresh Gupta",
    sub: "Ganga Hospital Supplies",
    badge: "Missing Docs Demo",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
];

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: "Multi-Portal Verification",
    desc: "Instant format & registry cross-checks against Udyam, GSTN, MCA21, EPFO & ESIC.",
  },
  {
    icon: FileCheck2,
    title: "Explainable 0–100 Scoring",
    desc: "Mathematical breakdown of eligibility criteria with transparent points attribution.",
  },
  {
    icon: AlertOctagon,
    title: "Contradiction & Anomaly Detection",
    desc: "Flags discrepancies across PAN, CIN, GSTIN, and company director names automatically.",
  },
  {
    icon: Bot,
    title: "Grounded Audit AI Assistant",
    desc: "Direct answers citing bid documents with strict anti-hallucination guardrails.",
  },
];

export function LoginPage() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<UserRole>("officer");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "priya.nair@gem.gov.in",
    password: "Gem@2026!",
    full_name: "Priya Nair",
    legal_name: "Apex BioMed Solutions Ltd",
    registered_address: "Plot 42, Electronics City Phase-1",
    state: "Karnataka",
    pincode: "560100",
    contact_phone: "080-28520100",
  });

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  async function quickLogin(email: string, label: string) {
    setBusy(true);
    try {
      const res = await login(email, "Gem@2026!");
      toast.success(`Welcome back, ${res.user.full_name || label}!`);
      navigate(homeForRole(res.role));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await login(form.email, form.password);
        toast.success(`Signed in as ${res.user.full_name}`);
        navigate(homeForRole(res.role));
      } else {
        const payload: Record<string, unknown> = {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role,
        };
        if (role === "bidder") {
          Object.assign(payload, {
            legal_name: form.legal_name,
            registered_address: form.registered_address,
            state: form.state,
            pincode: form.pincode,
            contact_phone: form.contact_phone,
          });
        }
        const res = await register(payload);
        toast.success("Account successfully created!");
        navigate(homeForRole(res.role));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to authenticate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto w-full max-w-6xl grid gap-10 lg:grid-cols-12 lg:items-center relative z-10">
        
        {/* Left Column: Portal Overview & Value Proposition */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-300">
            <ShieldCheck className="h-4 w-4" />
            <span>Government e-Marketplace (GeM) · SIH 2026</span>
          </div>

          <div>
            <h1 className="font-sans text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              ComplyGeM <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">AI</span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
              Automated, tamper-evident bid compliance verification for GeM tenders. Fast, transparent scoring and risk evaluation before contract award.
            </p>
          </div>

          {/* Key Capabilities Grid */}
          <div className="grid sm:grid-cols-2 gap-3.5 pt-2">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 backdrop-blur-sm hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="rounded-lg bg-teal-500/20 p-1.5 text-teal-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-xs font-bold text-white tracking-tight">{title}</h2>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Live System Badge */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Deterministic verification core active · Fully operational without external portal tokens</span>
          </div>
        </div>

        {/* Right Column: Authentication & 1-Click Demo Logins */}
        <div className="lg:col-span-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            
            {/* Quick 1-Click Evaluation Logins */}
            <div className="mb-6 rounded-xl border border-teal-500/30 bg-gradient-to-b from-teal-950/30 to-slate-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-teal-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                    1-Click Demo Logins
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Instant access for evaluators</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {DEMOS.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    disabled={busy}
                    onClick={() => quickLogin(d.email, d.label)}
                    className="flex flex-col text-left rounded-xl border border-slate-700/60 bg-slate-800/80 p-2.5 hover:border-teal-400 hover:bg-slate-800 transition disabled:opacity-50 group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-white group-hover:text-teal-300 transition">
                        {d.label}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${d.badgeColor}`}>
                        {d.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 truncate mt-0.5">
                      {d.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mb-6 flex rounded-xl bg-slate-950 p-1 border border-slate-800" role="tablist">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide capitalize transition-all ${
                    mode === m
                      ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setMode(m)}
                >
                  {m === "login" ? "Sign In to Portal" : "Create New Account"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "register" && (
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-slate-300">Account Type</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["officer", "Procurement Officer"],
                        ["bidder", "Bidder / Supplier"],
                      ] as const
                    ).map(([value, label]) => (
                      <label
                        key={value}
                        className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-medium text-center transition ${
                          role === value
                            ? "border-teal-400 bg-teal-500/10 text-teal-300"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          className="sr-only"
                          checked={role === value}
                          onChange={() => setRole(value)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {mode === "register" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      required
                      placeholder="e.g. Priya Nair"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Official Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@gem.gov.in or name@company.in"
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "register" && role === "bidder" ? (
                <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t border-slate-800">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Company Legal Name</label>
                    <input
                      required
                      placeholder="As per Udyam or MCA certificate"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                      value={form.legal_name}
                      onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Registered Address</label>
                    <input
                      required
                      placeholder="Official postal address"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                      value={form.registered_address}
                      onChange={(e) => setForm({ ...form, registered_address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
                    <input
                      required
                      placeholder="e.g. Maharashtra"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">PIN Code</label>
                    <input
                      required
                      placeholder="6-digit PIN"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                      value={form.pincode}
                      onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contact Mobile</label>
                    <input
                      required
                      placeholder="+91-XXXXX-XXXXX"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                      value={form.contact_phone}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3 text-sm font-bold text-slate-950 hover:from-teal-400 hover:to-emerald-400 shadow-lg shadow-teal-500/20 disabled:opacity-50 transition"
              >
                {busy ? (
                  <span>Authenticating…</span>
                ) : mode === "login" ? (
                  <>
                    <span>Sign In to ComplyGeM</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <span>Create Account & Continue</span>
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-400">
              Demo accounts shared password:{" "}
              <span className="font-mono text-teal-300 font-semibold select-all">Gem@2026!</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

