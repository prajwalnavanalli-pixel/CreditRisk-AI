
import { useState, type FormEvent, type ReactNode } from "react";
import { Lock, ShieldCheck, Sparkles, UserCheck } from "lucide-react";

import { useApp } from "@/components/providers/app-provider";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, authLoading, login, register, health } = useApp();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState(
    "CreditRisk AI Underwriting"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b12] px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
          <p className="text-xs font-medium tracking-wide text-slate-400">
            Initializing CreditRisk AI Platform...
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(identifier, password);
      } else {
        await register({
          username,
          email,
          full_name: fullName,
          organization,
          password,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Authentication failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const apiUp = health?.api_status === "running";
  const dbUp = health?.database_status === "connected";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b12] px-4 py-10">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/15 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1019]/95 shadow-2xl md:grid-cols-5">

        {/* Left institutional brief */}
        <div className="flex flex-col justify-between border-b border-white/10 bg-gradient-to-br from-indigo-950/60 via-[#0e1526] to-[#0b1019] p-8 md:col-span-2 md:border-b-0 md:border-r">

          <div>
            <div className="flex items-center gap-3">
              <div className="preserve-white flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
                CR
              </div>

              <div>
                <h1 className="text-base font-bold text-white">
                  CreditRisk <span className="text-indigo-400">AI</span>
                </h1>
                <p className="text-[10px] tracking-widest text-slate-400">
                  INTELLIGENCE PLATFORM
                </p>
              </div>
            </div>

            <h2 className="mt-8 text-2xl font-bold leading-tight text-white">
              Loan Default Prediction &amp; SHAP Explainability
            </h2>

            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Institutional underwriting workspace powered by Random Forest
              (0.7755 ROC-AUC), real-time SHAP risk attribution, and MongoDB
              audit persistence.
            </p>
          </div>

          {/* Platform status */}
          <div className="mt-8 space-y-3">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-indigo-400" />
                <p className="text-xs font-semibold text-slate-200">
                  Secure Authentication
                </p>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                Sign in using your authorized CreditRisk AI account to access
                the underwriting platform.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    apiUp ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                FastAPI {apiUp ? "Online" : "Offline"}
              </span>

              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    dbUp ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                MongoDB {dbUp ? "Connected" : "Disconnected"}
              </span>
            </div>

          </div>
        </div>

        {/* Authentication panel */}
        <div className="p-6 sm:p-10 md:col-span-3">

          <div className="mb-7">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <Lock size={19} />
            </div>

            <h2 className="text-xl font-bold text-white">
              {mode === "login" ? "Welcome Back" : "Create Your Account"}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {mode === "login"
                ? "Sign in to access your risk intelligence workspace."
                : "Register to access the CreditRisk AI platform."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === "register" && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Organization name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            {mode === "login" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Email or Username
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or username"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Password
              </label>

              <input
                type="password"
                required
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>

          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
                setPassword("");
              }}
              className="ml-1 font-semibold text-indigo-400 transition hover:text-indigo-300"
            >
              {mode === "login" ? "Register" : "Sign In"}
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-[10px] text-slate-500">
            <ShieldCheck size={13} />
            Secure CreditRisk AI Authentication
          </div>

        </div>
      </div>
    </div>
  );
}
