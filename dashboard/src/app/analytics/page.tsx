"use client";

import { useEffect, useState } from "react";
import {
  AlertOctagon,
  BarChart3,
  ChartNoAxesCombined,
  DollarSign,
  Percent,
  RefreshCw,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useApp } from "@/components/providers/app-provider";
import RiskBadge from "@/components/ui/risk-badge";
import { api, type AnalyticsSummaryResponse } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/domain";

export default function RiskAnalyticsPage() {
  const { notify } = useApp();
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalyticsSummary();
      setData(res);
    } catch (err) {
      notify({
        type: "error",
        title: "Analytics Error",
        message:
          err instanceof Error ? err.message : "Unable to load analytics",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api
      .getAnalyticsSummary()
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (!active) return;
        notify({
          type: "error",
          title: "Analytics Error",
          message:
            err instanceof Error ? err.message : "Unable to load analytics",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notify]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <ChartNoAxesCombined size={14} />
            Portfolio Intelligence
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Risk &amp; Financial Analytics
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Live default rates, credit exposure by risk tier, demographic risk
            segments, and high-risk alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Analytics
        </button>
      </div>

      {/* KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Portfolio Default Rate</span>
            <Percent size={16} className="text-rose-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {loading ? "—" : `${kpis?.default_rate_pct ?? 0}%`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Avg default probability: {kpis?.avg_default_probability_pct ?? 0}%
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">High-Risk Accounts</span>
            <AlertOctagon size={16} className="text-amber-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-400">
            {loading ? "—" : kpis?.high_risk_count ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Medium: {kpis?.medium_risk_count ?? 0} · Low:{" "}
            {kpis?.low_risk_count ?? 0}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">High-Risk Exposure</span>
            <DollarSign size={16} className="text-rose-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {loading ? "—" : formatCurrency(kpis?.high_risk_exposure)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Out of {formatCurrency(kpis?.total_credit_exposure)} total limit
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Avg Scoring Latency</span>
            <BarChart3 size={16} className="text-cyan-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {loading ? "—" : `${kpis?.avg_inference_latency_ms ?? 0} ms`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Audit logs recorded: {kpis?.model_inference_logs ?? 0}
          </p>
        </div>
      </section>

      {/* Row 1: Risk Distribution + Exposure by Risk */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-white">
            Credit Exposure by Risk Category
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Total credit limit volume segmented by predicted risk tier
          </p>
          <div className="mt-4 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.exposure_by_risk || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="category"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f1623",
                    borderColor: "rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => formatCurrency(Number(value || 0))}
                />
                <Bar dataKey="exposure" name="Credit Exposure" radius={[8, 8, 0, 0]}>
                  {(data?.exposure_by_risk || []).map((item) => (
                    <Cell
                      key={item.category}
                      fill={
                        item.category === "High"
                          ? "#ff647c"
                          : item.category === "Medium"
                            ? "#f5b942"
                            : "#20c997"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-white">
            Risk Tier Composition
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Proportion of Low, Medium, and High-risk predictions
          </p>
          <div className="mt-4 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.risk_distribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={4}
                >
                  {(data?.risk_distribution || []).map((entry) => (
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
          </div>
        </div>
      </section>

      {/* Row 2: Education & Age Segment Risk Breakdown */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-white">
            Average Risk % by Education Level
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Average predicted default probability across borrower education tiers
          </p>
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.education_breakdown || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="education"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f1623",
                    borderColor: "rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="avg_risk_pct"
                  name="Avg Default Risk %"
                  fill="#66d9ef"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-white">
            Average Risk % by Age Bracket
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Default probability trends segmented by applicant age cohorts
          </p>
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.age_breakdown || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="age_group"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f1623",
                    borderColor: "rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="avg_risk_pct"
                  name="Avg Default Risk %"
                  fill="#7775ff"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* High-Risk Watchlist */}
      <section className="glass-panel rounded-3xl p-6">
        <h2 className="text-sm font-semibold text-white">
          High-Risk Watchlist (&ge; 50% Default Probability)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Applicant ID</th>
                <th className="py-3 pr-4">Credit Exposure</th>
                <th className="py-3 pr-4">Default Probability</th>
                <th className="py-3 pr-4">Risk Tier</th>
                <th className="py-3">Flagged At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {!data?.high_risk_alerts.length ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No high-risk alerts currently flagged.
                  </td>
                </tr>
              ) : (
                data.high_risk_alerts.map((alert) => (
                  <tr key={alert.prediction_id}>
                    <td className="py-3.5 pr-4 font-semibold text-white">
                      {alert.applicant_id}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-slate-300">
                      {formatCurrency(alert.credit_limit)}
                    </td>
                    <td className="py-3.5 pr-4 font-mono font-bold text-rose-400">
                      {alert.risk_percentage.toFixed(2)}%
                    </td>
                    <td className="py-3.5 pr-4">
                      <RiskBadge category={alert.risk_category} />
                    </td>
                    <td className="py-3.5 text-slate-400">
                      {formatDateTime(alert.created_at)}
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
