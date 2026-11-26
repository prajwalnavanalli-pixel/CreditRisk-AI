"use client";

import {
  Suspense,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import ShapChart from "@/components/charts/shap-chart";
import { useApp } from "@/components/providers/app-provider";
import RiskBadge from "@/components/ui/risk-badge";
import {
  api,
  type Applicant,
  type CreatePredictionResponse,
  type CreditRiskInput,
} from "@/lib/api";
import {
  EDUCATION_OPTIONS,
  HIGH_RISK_PRESET,
  LOW_RISK_PRESET,
  MARITAL_OPTIONS,
  REPAYMENT_STATUS_OPTIONS,
  SEX_OPTIONS,
  formatCurrency,
  validatePredictionInput,
} from "@/lib/domain";

const PAY_FIELDS = [
  { key: "PAY_0", label: "September (PAY_0)" },
  { key: "PAY_2", label: "August (PAY_2)" },
  { key: "PAY_3", label: "July (PAY_3)" },
  { key: "PAY_4", label: "June (PAY_4)" },
  { key: "PAY_5", label: "May (PAY_5)" },
  { key: "PAY_6", label: "April (PAY_6)" },
] as const;

const BILL_FIELDS = [
  { key: "BILL_AMT1", label: "September Bill (BILL_AMT1)" },
  { key: "BILL_AMT2", label: "August Bill (BILL_AMT2)" },
  { key: "BILL_AMT3", label: "July Bill (BILL_AMT3)" },
  { key: "BILL_AMT4", label: "June Bill (BILL_AMT4)" },
  { key: "BILL_AMT5", label: "May Bill (BILL_AMT5)" },
  { key: "BILL_AMT6", label: "April Bill (BILL_AMT6)" },
] as const;

const PAY_AMT_FIELDS = [
  { key: "PAY_AMT1", label: "September Payment (PAY_AMT1)" },
  { key: "PAY_AMT2", label: "August Payment (PAY_AMT2)" },
  { key: "PAY_AMT3", label: "July Payment (PAY_AMT3)" },
  { key: "PAY_AMT4", label: "June Payment (PAY_AMT4)" },
  { key: "PAY_AMT5", label: "May Payment (PAY_AMT5)" },
  { key: "PAY_AMT6", label: "April Payment (PAY_AMT6)" },
] as const;

function NewPredictionContent() {
  const searchParams = useSearchParams();
  const initialApplicantId = searchParams.get("applicant_id") || "";
  const { notify } = useApp();

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [form, setForm] = useState<CreditRiskInput>({
    ...HIGH_RISK_PRESET,
    applicant_id: initialApplicantId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreatePredictionResponse | null>(null);

  useEffect(() => {
    api
      .getApplicants()
      .then((res) => {
        setApplicants(res.applicants);
        if (initialApplicantId) {
          const match = res.applicants.find(
            (a) => a.applicant_id === initialApplicantId
          );
          if (match) {
            setForm((prev) => ({
              ...prev,
              applicant_id: match.applicant_id,
              LIMIT_BAL: match.credit_limit,
              AGE: match.age,
              EDUCATION:
                match.education >= 1 && match.education <= 4
                  ? match.education
                  : 2,
              MARRIAGE:
                match.marital_status >= 1 && match.marital_status <= 3
                  ? match.marital_status
                  : 1,
            }));
          }
        }
      })
      .catch(() => {
        // Silent fallback if applicants list fails
      });
  }, [initialApplicantId]);

  const handleSelectApplicant = (applicantId: string) => {
    const match = applicants.find((a) => a.applicant_id === applicantId);
    if (!match) {
      setForm((prev) => ({ ...prev, applicant_id: applicantId }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      applicant_id: match.applicant_id,
      LIMIT_BAL: match.credit_limit,
      AGE: match.age,
      EDUCATION:
        match.education >= 1 && match.education <= 4 ? match.education : 2,
      MARRIAGE:
        match.marital_status >= 1 && match.marital_status <= 3
          ? match.marital_status
          : 1,
    }));
  };

  const applyPreset = (preset: CreditRiskInput, label: string) => {
    setForm((prev) => ({
      ...preset,
      applicant_id: prev.applicant_id || "",
    }));
    setErrors({});
    notify({
      type: "info",
      title: `Loaded ${label}`,
      message: "All 23 model features updated.",
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanedPayload: CreditRiskInput = {
      ...form,
      applicant_id: form.applicant_id?.trim() ? form.applicant_id.trim() : null,
    };

    const validationErrors = validatePredictionInput(cleanedPayload);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      notify({
        type: "warning",
        title: "Validation Error",
        message: "Please fix highlighted input fields before scoring.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.createPrediction(cleanedPayload);
      setResult(response);
      notify({
        type:
          response.prediction.risk_category === "High" ? "warning" : "success",
        title: `Prediction Complete · ${response.prediction.risk_category} Risk`,
        message: `Default Probability: ${response.prediction.risk_percentage.toFixed(2)}%`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Prediction failed";
      setErrors({ submit: msg });
      notify({ type: "error", title: "Prediction Error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const riskPct = result?.prediction.risk_percentage ?? 0;
  const riskCategory = result?.prediction.risk_category ?? "Pending";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <BrainCircuit size={14} />
            Real-Time Scoring Engine
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">
            New Credit Risk Prediction
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Evaluate all 23 UCI credit features with the Random Forest model and
            inspect live SHAP risk attribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => applyPreset(HIGH_RISK_PRESET, "High-Risk Profile")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
          >
            <Sparkles size={13} />
            Load High-Risk Preset
          </button>
          <button
            type="button"
            onClick={() => applyPreset(LOW_RISK_PRESET, "Low-Risk Profile")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <CheckCircle2 size={13} />
            Load Low-Risk Preset
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({ ...HIGH_RISK_PRESET, applicant_id: "" });
              setResult(null);
              setErrors({});
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      {errors.submit && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {errors.submit}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Left: 23-Feature Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 xl:col-span-7"
        >
          {/* Section 1: Applicant & Demographics (5 features + applicant_id) */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-sm font-semibold text-white">
              1. Applicant Link &amp; Demographics (5 Model Features)
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Optionally attach a registered Applicant ID to link this score to
              their borrower record.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Registered Applicant (Optional)
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={
                      applicants.some(
                        (a) => a.applicant_id === form.applicant_id
                      )
                        ? form.applicant_id || ""
                        : ""
                    }
                    onChange={(e) => handleSelectApplicant(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">
                      — Ad-hoc / Unregistered Scoring —
                    </option>
                    {applicants.map((a) => (
                      <option key={a.applicant_id} value={a.applicant_id}>
                        {a.applicant_id} ({formatCurrency(a.credit_limit)}, Age{" "}
                        {a.age})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.applicant_id || ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, applicant_id: e.target.value }))
                    }
                    placeholder="Or type Applicant ID (e.g. CR003)"
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.applicant_id && (
                  <p className="mt-1 text-[11px] text-rose-400">
                    {errors.applicant_id}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Credit Limit (LIMIT_BAL)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.LIMIT_BAL}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      LIMIT_BAL: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
                {errors.LIMIT_BAL && (
                  <p className="mt-1 text-[11px] text-rose-400">
                    {errors.LIMIT_BAL}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Age (AGE)
                </label>
                <input
                  type="number"
                  required
                  min={18}
                  max={100}
                  value={form.AGE}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, AGE: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
                {errors.AGE && (
                  <p className="mt-1 text-[11px] text-rose-400">{errors.AGE}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Gender (SEX)
                </label>
                <select
                  value={form.SEX}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, SEX: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  {SEX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Education (EDUCATION)
                </label>
                <select
                  value={form.EDUCATION}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      EDUCATION: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  {EDUCATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Marital Status (MARRIAGE)
                </label>
                <select
                  value={form.MARRIAGE}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      MARRIAGE: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  {MARITAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Repayment Status (6 features) */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-sm font-semibold text-white">
              2. 6-Month Repayment Status (PAY_0 to PAY_6)
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Historical monthly payment behavior (strongest default predictors).
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PAY_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    {label}
                  </label>
                  <select
                    value={form[key]}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [key]: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    {REPAYMENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Bill Statements (6 features) */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-sm font-semibold text-white">
              3. 6-Month Bill Statement Amounts (BILL_AMT1 to BILL_AMT6)
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BILL_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    {label}
                  </label>
                  <input
                    type="number"
                    required
                    value={form[key]}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [key]: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Payment Amounts (6 features) */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-sm font-semibold text-white">
              4. 6-Month Previous Payment Amounts (PAY_AMT1 to PAY_AMT6)
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PAY_AMT_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    {label}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [key]: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  {errors[key] && (
                    <p className="mt-1 text-[11px] text-rose-400">
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="preserve-white flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:opacity-95 disabled:opacity-60"
          >
            <BrainCircuit size={17} />
            {submitting
              ? "Scoring & Computing SHAP Attribution..."
              : "Predict Credit Default Risk"}
          </button>
        </form>

        {/* Right: Live Result & SHAP Explainability Panel */}
        <div className="space-y-6 xl:col-span-5">
          <div className="glass-panel sticky top-[96px] rounded-3xl p-6">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Live Prediction &amp; SHAP Output
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Instant Random Forest probability &amp; decision drivers
                </p>
              </div>
              {result && <RiskBadge category={riskCategory} />}
            </div>

            {!result ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-indigo-400">
                  <ShieldAlert size={28} />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">
                  Ready to Score Application
                </p>
                <p className="mt-1 max-w-xs text-xs text-slate-400">
                  Complete the 23 input features or select a preset and click{" "}
                  <strong className="text-slate-200">
                    Predict Credit Default Risk
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                {/* Probability Meter */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-400">
                        Default Probability
                      </p>
                      <p className="mt-1 font-mono text-4xl font-bold text-white">
                        {riskPct.toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">
                        Model Classification
                      </p>
                      <p
                        className={`mt-1 text-xs font-bold ${
                          result.prediction.default_prediction === 1
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {result.prediction.default_prediction === 1
                          ? "HIGH DEFAULT LIKELIHOOD (1)"
                          : "NON-DEFAULT LIKELY (0)"}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        riskCategory === "High"
                          ? "bg-gradient-to-r from-amber-400 to-rose-500"
                          : riskCategory === "Medium"
                            ? "bg-gradient-to-r from-emerald-400 to-amber-400"
                            : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, riskPct))}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      Prediction ID:{" "}
                      <code className="text-slate-200">
                        {result.prediction_id.slice(-10)}
                      </code>
                    </span>
                    {result.applicant_id && (
                      <span>
                        Applicant:{" "}
                        <strong className="text-indigo-400">
                          {result.applicant_id}
                        </strong>
                      </span>
                    )}
                    {result.latency_ms !== undefined && (
                      <span>Latency: {result.latency_ms} ms</span>
                    )}
                  </div>
                </div>

                {riskCategory === "High" && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        Underwriting Escalation Recommended
                      </p>
                      <p className="mt-0.5 text-[11px] text-rose-200/80">
                        Probability exceeds the 50% High-Risk threshold. Review
                        top positive SHAP drivers below before credit approval.
                      </p>
                    </div>
                  </div>
                )}

                {/* Per-applicant SHAP Explanation */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    SHAP Feature Attribution (Top 10 Drivers)
                  </h3>
                  <div className="mt-3">
                    <ShapChart
                      drivers={
                        result.prediction.shap_explanation?.top_drivers || []
                      }
                      baseValue={result.prediction.shap_explanation?.base_value}
                      height={290}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewPredictionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-slate-400">
          Loading Prediction Form...
        </div>
      }
    >
      <NewPredictionContent />
    </Suspense>
  );
}
