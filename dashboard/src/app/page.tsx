"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CreditCard,
  Database,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { useApp } from "@/components/providers/app-provider";
import RiskBadge from "@/components/ui/risk-badge";
import { api, type AnalyticsSummaryResponse } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/domain";

export default function OverviewPage() {
  const { health, refreshHealth, notify } = useApp();
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [data] = await Promise.all([
        api.getAnalyticsSummary(),
        refreshHealth(),
      ]);
      setSummary(data);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load dashboard overview";
      setError(msg);
      notify({ type: "error", title: "Dashboard Sync Failed", message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([api.getAnalyticsSummary(), refreshHealth()])
      .then(([data]) => {
        if (active) setSummary(data);
      })
      .catch((err) => {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load dashboard overview";
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshHealth]);

  const kpis = summary?.kpis;
  const apiConnected = health?.api_status === "running";
  const dbConnected = health?.database_status === "connected";

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-400">
                <ShieldCheck size={13} />
                Random Forest Champion · 0.7755 ROC-AUC
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  apiConnected && dbConnected
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
              >
                <Database size={12} />
                {apiConnected ? "FastAPI Online" : "API Offline"} ·{" "}
                {dbConnected ? "MongoDB Connected" : "DB Disconnected"}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Credit Portfolio Risk{" "}
              <span className="gradient-text">Command Center</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Monitor borrower registrations, execute 23-feature loan default
              scoring in real time, and inspect SHAP risk drivers across your
              underwriting portfolio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/applicants?register=true"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-4 py-2.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/25"
            >
              <UserPlus size={14} />
              Register Applicant
            </Link>
            <Link
              href="/predictions"
              className="preserve-white inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95"
            >
              <BrainCircuit size={14} />
              Run New Prediction
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Registered Applicants
            </span>
            <span className="rounded-xl bg-indigo-500/15 p-2 text-indigo-400">
              <Users size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {loading ? "—" : kpis?.total_applicants ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Avg limit: {formatCurrency(kpis?.avg_credit_limit)}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Predictions Scored
            </span>
            <span className="rounded-xl bg-cyan-500/15 p-2 text-cyan-400">
              <Activity size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {loading ? "—" : kpis?.total_predictions ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Avg default prob: {kpis?.avg_default_probability_pct ?? 0}%
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              High-Risk Assessments
            </span>
            <span className="rounded-xl bg-rose-500/15 p-2 text-rose-400">
              <AlertTriangle size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-400">
            {loading ? "—" : kpis?.high_risk_count ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Portfolio default rate: {kpis?.default_rate_pct ?? 0}%
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Total Credit Exposure
            </span>
            <span className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400">
              <CreditCard size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {loading ? "—" : formatCurrency(kpis?.total_credit_exposure)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            High-risk exposure: {formatCurrency(kpis?.high_risk_exposure)}
          </p>
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="glass-panel rounded-3xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Risk Tier Distribution
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Breakdown across scored applications
              </p>
            </div>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline"
            >
              Deep Dive <ArrowRight size={12} />
            </Link>
          </div>

          <div className="mt-4 h-[240px] w-full">
            {summary && summary.kpis.total_predictions > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.risk_distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={4}
                  >
                    {summary.risk_distribution.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f1623",
                      borderColor: "rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Run predictions to populate risk distribution.
              </div>
            )}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {summary?.risk_distribution.map((tier) => (
              <div
                key={tier.category}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
              >
                <p className="text-[11px] text-slate-400">{tier.name}</p>
                <p
                  className="mt-1 text-base font-bold"
                  style={{ color: tier.color }}
                >
                  {tier.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Probability Distribution Histogram
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Volume of scored predictions by default probability band
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">
              <TrendingUp size={12} className="text-indigo-400" />
              Live MongoDB Aggregation
            </span>
          </div>

          <div className="mt-4 h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary?.probability_distribution || []}
                margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f1623",
                    borderColor: "rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Predictions"
                  fill="#7775ff"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent Predictions Table */}
      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Recent Credit Risk Predictions
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Latest evaluations persisted to MongoDB with probability scores
            </p>
          </div>
          <Link
            href="/predictions/history"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Full History <ArrowRight size={13} />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Applicant</th>
                <th className="py-3 pr-4">Credit Limit</th>
                <th className="py-3 pr-4">Default Probability</th>
                <th className="py-3 pr-4">Risk Category</th>
                <th className="py-3 pr-4">Decision</th>
                <th className="py-3">Scored At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading recent predictions...
                  </td>
                </tr>
              ) : !summary?.recent_predictions.length ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No predictions scored yet. Run your first prediction!
                  </td>
                </tr>
              ) : (
                summary.recent_predictions.map((row) => (
                  <tr
                    key={row.prediction_id}
                    className="transition hover:bg-white/[0.02]"
                  >
                    <td className="py-3.5 pr-4 font-semibold text-white">
                      {row.applicant_id}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-300">
                      {formatCurrency(row.credit_limit)}
                    </td>
                    <td className="py-3.5 pr-4 font-mono font-semibold text-slate-200">
                      {row.risk_percentage.toFixed(2)}%
                    </td>
                    <td className="py-3.5 pr-4">
                      <RiskBadge category={row.risk_category} />
                    </td>
                    <td className="py-3.5 pr-4 text-slate-300">
                      {row.default_prediction === 1
                        ? "Flagged Default"
                        : "Low Default Likelihood"}
                    </td>
                    <td className="py-3.5 text-slate-400">
                      {formatDateTime(row.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
