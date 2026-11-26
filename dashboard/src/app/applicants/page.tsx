"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useApp } from "@/components/providers/app-provider";
import RiskBadge from "@/components/ui/risk-badge";
import {
  api,
  type Applicant,
  type ApplicantCreateInput,
  type Prediction,
} from "@/lib/api";
import {
  EDUCATION_OPTIONS,
  MARITAL_OPTIONS,
  formatCurrency,
  formatDateTime,
  getEducationLabel,
  getMaritalLabel,
  validateApplicantInput,
} from "@/lib/domain";

function ApplicantsDirectoryContent() {
  const searchParams = useSearchParams();
  const { user, notify } = useApp();

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 8;

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [educationFilter, setEducationFilter] = useState<string>("all");
  const [maritalFilter, setMaritalFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(
    searchParams.get("register") === "true"
  );
  const [formState, setFormState] = useState<ApplicantCreateInput>({
    applicant_id: "",
    full_name: "",
    credit_limit: 75000,
    age: 30,
    education: 2,
    marital_status: 1,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Applicant details drawer state
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );
  const [applicantPredictions, setApplicantPredictions] = useState<Prediction[]>(
    []
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchApplicants = useCallback(async () => {
    const res = await api.getApplicants({
      search: search.trim() || undefined,
      education:
        educationFilter !== "all" ? Number(educationFilter) : undefined,
      marital_status:
        maritalFilter !== "all" ? Number(maritalFilter) : undefined,
      risk_category: riskFilter !== "All" ? riskFilter : undefined,
      page,
      page_size: pageSize,
    });
    return res;
  }, [educationFilter, maritalFilter, page, riskFilter, search]);

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApplicants();
      setApplicants(res.applicants);
      setTotal(res.total);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to load applicants";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchApplicants]);

  useEffect(() => {
    let active = true;
    fetchApplicants()
      .then((res) => {
        if (!active) return;
        setApplicants(res.applicants);
        setTotal(res.total);
        setTotalPages(res.total_pages || 1);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Unable to load applicants"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchApplicants]);

  const openDetails = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setDetailsLoading(true);
    try {
      const [detailRes, predRes] = await Promise.all([
        api.getApplicant(applicant.applicant_id),
        api.getApplicantPredictions(applicant.applicant_id),
      ]);
      setSelectedApplicant(detailRes.applicant);
      setApplicantPredictions(predRes.predictions);
    } catch {
      setApplicantPredictions([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const payload: ApplicantCreateInput = {
      applicant_id: formState.applicant_id.trim(),
      full_name: formState.full_name?.trim() || undefined,
      credit_limit: Number(formState.credit_limit),
      age: Number(formState.age),
      education: Number(formState.education),
      marital_status: Number(formState.marital_status),
    };
    const errors = validateApplicantInput(payload);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await api.createApplicant(payload);
      notify({
        type: "success",
        title: "Applicant Registered",
        message: `${res.applicant.applicant_id} added to MongoDB.`,
      });
      setShowRegisterModal(false);
      setFormState({
        applicant_id: "",
        full_name: "",
        credit_limit: 75000,
        age: 30,
        education: 2,
        marital_status: 1,
      });
      setPage(1);
      await loadApplicants();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to register applicant";
      setFormErrors({ submit: msg });
      notify({ type: "error", title: "Registration Failed", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (applicantId: string) => {
    if (
      !window.confirm(
        `Delete applicant ${applicantId}? This action requires Administrator privileges.`
      )
    ) {
      return;
    }
    try {
      await api.deleteApplicant(applicantId);
      notify({
        type: "info",
        title: "Applicant Deleted",
        message: `${applicantId} removed from directory.`,
      });
      if (selectedApplicant?.applicant_id === applicantId) {
        setSelectedApplicant(null);
      }
      await loadApplicants();
    } catch (err) {
      notify({
        type: "error",
        title: "Delete Denied",
        message: err instanceof Error ? err.message : "Unable to delete",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Users size={14} />
            Borrower Directory
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Applicants Management
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Search, filter, inspect borrower profiles, and register new credit
            applicants.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormErrors({});
            setShowRegisterModal(true);
          }}
          className="preserve-white inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95"
        >
          <Plus size={15} />
          Register New Applicant
        </button>
      </div>

      {/* Filters & Search */}
      <div className="glass-panel grid gap-3 rounded-2xl p-4 md:grid-cols-5">
        <div className="relative md:col-span-2">
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
            placeholder="Search by Applicant ID or Name (e.g. CR003)..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by risk category"
          className="rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="All">All Risk Tiers</option>
          <option value="High">High Risk</option>
          <option value="Medium">Medium Risk</option>
          <option value="Low">Low Risk</option>
          <option value="Pending">Pending Assessment</option>
        </select>

        <select
          value={educationFilter}
          onChange={(e) => {
            setEducationFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by education"
          className="rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="all">All Education Levels</option>
          {EDUCATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={maritalFilter}
          onChange={(e) => {
            setMaritalFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by marital status"
          className="rounded-xl border border-white/10 bg-[#0f1623] px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="all">All Marital Statuses</option>
          {MARITAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Applicants Table */}
      <div className="glass-panel overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter size={14} className="text-indigo-400" />
            Showing <strong className="text-white">{applicants.length}</strong> of{" "}
            <strong className="text-white">{total}</strong> applicants
          </div>
          {(search ||
            educationFilter !== "all" ||
            maritalFilter !== "all" ||
            riskFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setEducationFilter("all");
                setMaritalFilter("all");
                setRiskFilter("All");
                setPage(1);
              }}
              className="text-xs text-indigo-400 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.015] text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Applicant ID</th>
                <th className="px-4 py-3.5">Credit Limit</th>
                <th className="px-4 py-3.5">Demographics</th>
                <th className="px-4 py-3.5">Latest Risk</th>
                <th className="px-4 py-3.5">Predictions</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading applicant records...
                  </td>
                </tr>
              ) : applicants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No applicants match your current filters.
                  </td>
                </tr>
              ) : (
                applicants.map((item) => (
                  <tr
                    key={item.applicant_id}
                    className="transition hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">
                        {item.applicant_id}
                      </p>
                      {item.full_name && (
                        <p className="text-[11px] text-slate-400">
                          {item.full_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono font-medium text-slate-200">
                      {formatCurrency(item.credit_limit)}
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      <span>Age {item.age}</span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span>{getEducationLabel(item.education)}</span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span>{getMaritalLabel(item.marital_status)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <RiskBadge
                        category={item.risk_category}
                        probability={item.latest_probability}
                      />
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {item.prediction_count ?? 0} runs
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDetails(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-white/10"
                        >
                          <Eye size={13} />
                          Details
                        </button>
                        <Link
                          href={`/predictions?applicant_id=${encodeURIComponent(item.applicant_id)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1.5 text-[11px] font-medium text-indigo-300 transition hover:bg-indigo-500/25"
                        >
                          <BrainCircuit size={13} />
                          Score
                        </Link>
                        {user?.role === "admin" && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.applicant_id)}
                            className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-1.5 text-rose-400 transition hover:bg-rose-500/20"
                            aria-label={`Delete ${item.applicant_id}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/[0.07] px-6 py-4 text-xs text-slate-400">
          <span>
            Page <strong className="text-white">{page}</strong> of{" "}
            <strong className="text-white">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Register Applicant Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Register Credit Applicant
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Create a verified borrower profile in MongoDB.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {formErrors.submit && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleRegister} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Applicant ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.applicant_id}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        applicant_id: e.target.value,
                      }))
                    }
                    placeholder="CR005"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  {formErrors.applicant_id && (
                    <p className="mt-1 text-[11px] text-rose-400">
                      {formErrors.applicant_id}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Applicant Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formState.full_name || ""}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, full_name: e.target.value }))
                    }
                    placeholder="Alex Morgan"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Credit Limit (USD / NT$) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formState.credit_limit}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        credit_limit: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  {formErrors.credit_limit && (
                    <p className="mt-1 text-[11px] text-rose-400">
                      {formErrors.credit_limit}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Age (18–100) *
                  </label>
                  <input
                    type="number"
                    required
                    min={18}
                    max={100}
                    value={formState.age}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        age: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  {formErrors.age && (
                    <p className="mt-1 text-[11px] text-rose-400">
                      {formErrors.age}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Education Level *
                  </label>
                  <select
                    value={formState.education}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        education: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0f1623] px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
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
                    Marital Status *
                  </label>
                  <select
                    value={formState.marital_status}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        marital_status: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0f1623] px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    {MARITAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="preserve-white rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Applicant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applicant Details Slide-over Drawer */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0b1019] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                  Applicant Profile
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-white">
                  {selectedApplicant.applicant_id}
                  {selectedApplicant.full_name
                    ? ` · ${selectedApplicant.full_name}`
                    : ""}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApplicant(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-slate-500">Credit Limit</p>
                  <p className="mt-1 text-base font-bold text-white">
                    {formatCurrency(selectedApplicant.credit_limit)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-slate-500">Current Risk</p>
                  <div className="mt-1.5">
                    <RiskBadge
                      category={selectedApplicant.risk_category}
                      probability={selectedApplicant.latest_probability}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-slate-500">
                    Age &amp; Marital
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-200">
                    {selectedApplicant.age} yrs ·{" "}
                    {getMaritalLabel(selectedApplicant.marital_status)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-slate-500">Education</p>
                  <p className="mt-1 text-xs font-semibold text-slate-200">
                    {getEducationLabel(selectedApplicant.education)}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Prediction History ({applicantPredictions.length})
                  </h3>
                  <Link
                    href={`/predictions?applicant_id=${encodeURIComponent(selectedApplicant.applicant_id)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline"
                  >
                    <BrainCircuit size={13} />
                    Score Now
                  </Link>
                </div>

                {detailsLoading ? (
                  <p className="mt-4 text-xs text-slate-500">
                    Loading history...
                  </p>
                ) : applicantPredictions.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-center text-xs text-slate-500">
                    No credit risk predictions recorded for this applicant yet.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {applicantPredictions.map((pred, idx) => (
                      <div
                        key={pred.prediction_id || idx}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <RiskBadge category={pred.risk_category} />
                          <span className="font-mono text-sm font-bold text-white">
                            {pred.risk_percentage.toFixed(2)}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {pred.default_prediction === 1
                              ? "Default Predicted"
                              : "Non-Default Predicted"}
                          </span>
                          <span>{formatDateTime(pred.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-slate-400">
          Loading Applicants Directory...
        </div>
      }
    >
      <ApplicantsDirectoryContent />
    </Suspense>
  );
}
