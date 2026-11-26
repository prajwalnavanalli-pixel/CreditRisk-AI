"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useApp } from "@/components/providers/app-provider";
import { api, type ModelInsightsResponse } from "@/lib/api";

const MODEL_NAMES: Record<string, string> = {
  random_forest: "Random Forest",
  xgboost: "XGBoost",
  logistic_regression: "Logistic Regression",
};

export default function ModelInsightsPage() {
  const { notify } = useApp();
  const [insights, setInsights] = useState<ModelInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [importanceView, setImportanceView] = useState<"shap" | "gini">("shap");

  useEffect(() => {
    api
      .getModelInsights()
      .then((res) => setInsights(res))
      .catch((err) => {
        notify({
          type: "error",
          title: "Model Insights Error",
          message:
            err instanceof Error ? err.message : "Failed to load insights",
        });
      })
      .finally(() => setLoading(false));
  }, [notify]);

  const comparisonData = useMemo(() => {
    if (!insights?.model_metrics) return [];
    const metrics = insights.model_metrics;
    const keys = [
      { key: "roc_auc", label: "ROC-AUC" },
      { key: "accuracy", label: "Accuracy" },
      { key: "precision", label: "Precision" },
      { key: "recall", label: "Recall" },
      { key: "f1_score", label: "F1-Score" },
    ] as const;

    return keys.map(({ key, label }) => ({
      metric: label,
      random_forest: Number(((metrics.random_forest?.[key] || 0) * 100).toFixed(2)),
      xgboost: Number(((metrics.xgboost?.[key] || 0) * 100).toFixed(2)),
      logistic_regression: Number(
        ((metrics.logistic_regression?.[key] || 0) * 100).toFixed(2)
      ),
    }));
  }, [insights]);

  const rocChartData = useMemo(() => {
    const curves = insights?.roc_curves;
    if (!curves || !curves.random_forest?.length) return [];
    return curves.random_forest.map((pt, idx) => ({
      fpr: pt.fpr,
      baseline: pt.fpr,
      random_forest: pt.tpr,
      xgboost: curves.xgboost?.[idx]?.tpr ?? pt.tpr,
      logistic_regression: curves.logistic_regression?.[idx]?.tpr ?? pt.tpr,
    }));
  }, [insights]);

  const featureChartData = useMemo(() => {
    if (!insights) return [];
    if (importanceView === "shap" && insights.global_shap.length > 0) {
      return insights.global_shap.slice(0, 14).map((item) => ({
        name: item.label,
        feature: item.feature,
        value: Number((item.mean_abs_shap * 100).toFixed(3)),
        group: item.group,
      }));
    }
    return insights.feature_importances.slice(0, 14).map((item) => ({
      name: item.label,
      feature: item.feature,
      value: Number((item.importance * 100).toFixed(3)),
      group: item.group,
    }));
  }, [importanceView, insights]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <ShieldCheck size={14} />
            Explainable AI &amp; Benchmarking
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Model Insights &amp; SHAP Explainability
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Compare Logistic Regression, Random Forest, and XGBoost across ROC
            curves, classification metrics, and global SHAP impact.
          </p>
        </div>

        <Link
          href="/predictions"
          className="preserve-white inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20"
        >
          <BrainCircuit size={14} />
          Test Live SHAP Scoring
        </Link>
      </div>

      {/* Champion Model Banner */}
      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/15 p-3.5 text-indigo-400">
              <Award size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  Production Champion
                </span>
                <span className="text-xs text-slate-400">
                  {insights?.runtime_stats.active_model_artifact ||
                    "models/random_forest.pkl"}
                </span>
              </div>
              <h2 className="mt-1.5 text-lg font-bold text-white">
                Random Forest Classifier (200 Trees, Max Depth 12)
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-slate-400">
                {insights?.selection_rationale ||
                  "Selected for highest ROC-AUC (0.7755) and superior default recall (57.72%)."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase text-slate-500">ROC-AUC</p>
              <p className="mt-1 font-mono text-lg font-bold text-indigo-400">
                {insights?.model_metrics?.random_forest?.roc_auc?.toFixed(4) ||
                  "0.7755"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase text-slate-500">Features</p>
              <p className="mt-1 font-mono text-lg font-bold text-white">
                {insights?.runtime_stats.feature_count ?? 23}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase text-slate-500">Avg Latency</p>
              <p className="mt-1 font-mono text-lg font-bold text-cyan-400">
                {insights?.runtime_stats.avg_latency_ms ?? 0} ms
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Model Comparison Table */}
      <section className="glass-panel overflow-hidden rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Benchmark Evaluation Matrix (UCI 30,000 Credit Dataset)
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Evaluated on stratified 20% holdout split (
              {insights?.dataset_summary.test_split_size ?? 6000} test records,{" "}
              {insights?.dataset_summary.default_rate_pct ?? 22.12}% default
              rate)
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Model</th>
                <th className="py-3 pr-4">ROC-AUC</th>
                <th className="py-3 pr-4">Accuracy</th>
                <th className="py-3 pr-4">Precision</th>
                <th className="py-3 pr-4">Recall (Default)</th>
                <th className="py-3 pr-4">F1-Score</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading evaluation metrics...
                  </td>
                </tr>
              ) : (
                Object.entries(insights?.model_metrics || {}).map(
                  ([key, m]) => {
                    const isChampion = key === insights?.selected_model;
                    return (
                      <tr
                        key={key}
                        className={isChampion ? "bg-indigo-500/[0.06]" : ""}
                      >
                        <td className="py-3.5 pr-4 font-semibold text-white">
                          {MODEL_NAMES[key] || key}
                        </td>
                        <td className="py-3.5 pr-4 font-mono font-bold text-indigo-400">
                          {m.roc_auc.toFixed(4)}
                        </td>
                        <td className="py-3.5 pr-4 font-mono text-slate-200">
                          {(m.accuracy * 100).toFixed(2)}%
                        </td>
                        <td className="py-3.5 pr-4 font-mono text-slate-200">
                          {(m.precision * 100).toFixed(2)}%
                        </td>
                        <td className="py-3.5 pr-4 font-mono text-slate-200">
                          {(m.recall * 100).toFixed(2)}%
                        </td>
                        <td className="py-3.5 pr-4 font-mono text-slate-200">
                          {m.f1_score.toFixed(4)}
                        </td>
                        <td className="py-3.5">
                          {isChampion ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                              <CheckCircle2 size={11} /> Selected
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Candidate
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Charts: ROC Curve & Model Metric Comparison */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">
              ROC Curves (True Positive Rate vs False Positive Rate)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Higher area under curve indicates stronger separation of defaulters
          </p>

          <div className="mt-4 h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rocChartData}
                margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.12)"
                />
                <XAxis
                  dataKey="fpr"
                  type="number"
                  domain={[0, 1]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  label={{
                    value: "False Positive Rate",
                    position: "insideBottom",
                    offset: -2,
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  domain={[0, 1]}
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
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  type="monotone"
                  dataKey="random_forest"
                  name="Random Forest (0.7755)"
                  stroke="#7775ff"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="xgboost"
                  name="XGBoost (0.7752)"
                  stroke="#20c997"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="logistic_regression"
                  name="Logistic Regression (0.7079)"
                  stroke="#f5b942"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="linear"
                  dataKey="baseline"
                  name="Random Baseline (0.50)"
                  stroke="#475569"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">
              Multi-Metric Model Comparison (%)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Trade-off between overall accuracy and default-class recall
          </p>

          <div className="mt-4 h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="metric"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
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
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar
                  dataKey="random_forest"
                  name="Random Forest"
                  fill="#7775ff"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="xgboost"
                  name="XGBoost"
                  fill="#20c997"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="logistic_regression"
                  name="Logistic Regression"
                  fill="#f5b942"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Global SHAP & Gini Feature Importances */}
      <section className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Global Feature Importance (Top 14 Features)
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {importanceView === "shap"
                ? "Mean absolute SHAP impact on default probability across test portfolio (% points)"
                : "Random Forest Gini impurity reduction importance (%)"}
            </p>
          </div>

          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs">
            <button
              type="button"
              onClick={() => setImportanceView("shap")}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                importanceView === "shap"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Global SHAP
            </button>
            <button
              type="button"
              onClick={() => setImportanceView("gini")}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                importanceView === "gini"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              RF Gini Importance
            </button>
          </div>
        </div>

        <div className="mt-5 h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={featureChartData}
              layout="vertical"
              margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.12)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={175}
                tick={{ fill: "#cbd5e1", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1623",
                  borderColor: "rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(val) => [`${val}%`, "Impact Weight"]}
              />
              <Bar
                dataKey="value"
                name="Importance"
                fill={importanceView === "shap" ? "#66d9ef" : "#7775ff"}
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
