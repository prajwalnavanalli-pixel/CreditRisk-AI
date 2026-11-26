"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  Search,
  X,
} from "lucide-react";

import ShapChart from "@/components/charts/shap-chart";
import { useApp } from "@/components/providers/app-provider";
import RiskBadge from "@/components/ui/risk-badge";
import { api, type Prediction } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/domain";

export default function PredictionHistoryPage() {
  const { notify } = useApp();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  const [riskFilter, setRiskFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspected, setInspected] = useState<Prediction | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchHistory = useCallback(
    () =>
      api.getPredictionHistory(page, pageSize, {
        risk_category: riskFilter !== "All" ? riskFilter : undefined,
        search: search.trim() || undefined,
      }),
    [page, riskFilter, search]
  );

  useEffect(() => {
    let active = true;
    fetchHistory()
      .then((res) => {
        if (!active) return;
        setPredictions(res.predictions);
        setTotalPages(res.total_pages || 1);
        setTotalRecords(res.total_records);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Unable to load prediction history";
        setError(msg);
        notify({ type: "error", title: "History Load Error", message: msg });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchHistory, notify]);

  const openInspector = async (pred: Prediction) => {
    setInspected(pred);
    if (pred.prediction_id && !pred.shap_explanation) {
      setInspectLoading(true);
      try {
        const res = await api.getPredictionDetail(pred.prediction_id);
        setInspected(res.prediction);
      } catch {
        // Keep basic record if detail lookup fails
      } finally {
        setInspectLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <History size={14} />
            Audit Log &amp; Scoring Archive
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Prediction History
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Browse historical loan default evaluations, inspect 23-feature
            inputs, and review SHAP attribution.
          </p>
        </div>

        <Link
          href="/predictions"
          className="preserve-white inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20"
        >
          <BrainCircuit size={14} />
          Run New Prediction
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-panel grid gap-3 rounded-2xl p-4 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by Applicant ID (e.g. CR003)..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter predictions by risk category"
          className="rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="All">All Risk Tiers</option>
          <option value="High">High Risk (&ge; 50%)</option>
          <option value="Medium">Medium Risk (20%–50%)</option>
          <option value="Low">Low Risk (&lt; 20%)</option>
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* History Table */}
      <div className="glass-panel overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4 text-xs text-slate-400">
          <span>
            Total Records: <strong className="text-white">{totalRecords}</strong>
          </span>
          <span>
            Page <strong className="text-white">{page}</strong> of{" "}
            <strong className="text-white">{totalPages}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.015] text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Prediction ID</th>
                <th className="px-4 py-3.5">Applicant ID</th>
                <th className="px-4 py-3.5">Credit Limit</th>
                <th className="px-4 py-3.5">Probability</th>
                <th className="px-4 py-3.5">Risk Tier</th>
                <th className="px-4 py-3.5">Created At</th>
                <th className="px-6 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading prediction records...
                  </td>
                </tr>
              ) : predictions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matching prediction records found.
                  </td>
                </tr>
              ) : (
                predictions.map((pred, index) => (
                  <tr
                    key={pred.prediction_id || index}
                    className="transition hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                      {pred.prediction_id
                        ? `#${pred.prediction_id.slice(-8)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-4 font-semibold text-white">
                      {pred.applicant_id || (
                        <span className="text-slate-500">Ad-hoc</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-300">
                      {formatCurrency(pred.applicant_data?.LIMIT_BAL)}
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-white">
                      {pred.risk_percentage.toFixed(2)}%
                    </td>
                    <td className="px-4 py-4">
                      <RiskBadge category={pred.risk_category} />
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {formatDateTime(pred.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openInspector(pred)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        <Eye size={13} />
                        Explain
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/[0.07] px-6 py-4 text-xs text-slate-400">
          <span>Showing up to {pageSize} records per page</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Prediction Modal */}
      {inspected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                  Prediction Audit &amp; Explainability
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-white">
                  {inspected.applicant_id || "Ad-hoc Scoring"} ·{" "}
                  {inspected.risk_percentage.toFixed(2)}% Default Risk
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <p className="text-[11px] text-slate-500">Risk Category</p>
                <div className="mt-1.5">
                  <RiskBadge category={inspected.risk_category} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <p className="text-[11px] text-slate-500">Credit Limit</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {formatCurrency(inspected.applicant_data?.LIMIT_BAL)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <p className="text-[11px] text-slate-500">Scored Timestamp</p>
                <p className="mt-1 text-xs font-medium text-slate-200">
                  {formatDateTime(inspected.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                SHAP Decision Drivers
              </h3>
              <div className="mt-3">
                {inspectLoading ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    Computing SHAP attributions...
                  </p>
                ) : (
                  <ShapChart
                    drivers={inspected.shap_explanation?.top_drivers || []}
                    baseValue={inspected.shap_explanation?.base_value}
                    height={280}
                  />
                )}
              </div>
            </div>

            {inspected.applicant_data && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  23 Submitted Feature Values
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(inspected.applicant_data).map(
                    ([key, val]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                      >
                        <p className="text-[10px] text-slate-500">{key}</p>
                        <p className="font-mono text-xs font-semibold text-slate-200">
                          {val}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
