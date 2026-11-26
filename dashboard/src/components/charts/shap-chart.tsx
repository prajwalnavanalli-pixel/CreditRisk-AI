"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ShapContribution } from "@/lib/api";

interface ShapChartProps {
  drivers: ShapContribution[];
  baseValue?: number;
  height?: number;
}

export default function ShapChart({
  drivers,
  baseValue,
  height = 300,
}: ShapChartProps) {
  if (!drivers || drivers.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-xs text-slate-500">
        No SHAP feature attributions available for this record.
      </div>
    );
  }

  const chartData = drivers.slice(0, 10).map((item) => ({
    name: item.label,
    feature: item.feature,
    shap: item.shap_value,
    value: item.value,
    impact: item.impact,
  }));

  return (
    <div className="space-y-3">
      {baseValue !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>
            Baseline default rate:{" "}
            <strong className="text-slate-200">
              {(baseValue * 100).toFixed(2)}%
            </strong>
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
              Increases Risk (+SHAP)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Decreases Risk (-SHAP)
            </span>
          </div>
        </div>
      )}

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.12)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "#8491a5", fontSize: 11 }}
              tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fill: "#cbd5e1", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                backgroundColor: "#0f1623",
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
              formatter={(value, _name, item) => {
                const numeric = Number(value || 0);
                const payload = item?.payload as
                  | { feature?: string; value?: number }
                  | undefined;
                return [
                  `${numeric >= 0 ? "+" : ""}${(numeric * 100).toFixed(2)}% (Input: ${payload?.value ?? "—"})`,
                  payload?.feature || "SHAP",
                ];
              }}
            />
            <ReferenceLine x={0} stroke="rgba(148,163,184,0.35)" />
            <Bar dataKey="shap" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={`${entry.feature}-${idx}`}
                  fill={entry.shap >= 0 ? "#ff647c" : "#20c997"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
