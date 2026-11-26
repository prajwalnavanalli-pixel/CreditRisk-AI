import type { ApplicantCreateInput, CreditRiskInput } from "./api";

export const EDUCATION_OPTIONS = [
  { value: 1, label: "Graduate School" },
  { value: 2, label: "University" },
  { value: 3, label: "High School" },
  { value: 4, label: "Others" },
] as const;

export const ALL_EDUCATION_LABELS: Record<number, string> = {
  0: "Unknown",
  1: "Graduate School",
  2: "University",
  3: "High School",
  4: "Others",
  5: "Unknown",
  6: "Unknown",
};

export const MARITAL_OPTIONS = [
  { value: 1, label: "Married" },
  { value: 2, label: "Single" },
  { value: 3, label: "Others" },
] as const;

export const ALL_MARITAL_LABELS: Record<number, string> = {
  0: "Unknown",
  1: "Married",
  2: "Single",
  3: "Others",
};

export const SEX_OPTIONS = [
  { value: 1, label: "Male" },
  { value: 2, label: "Female" },
] as const;

export const REPAYMENT_STATUS_OPTIONS = [
  { value: -2, label: "-2 · No Consumption" },
  { value: -1, label: "-1 · Paid Duly" },
  { value: 0, label: "0 · Revolving Credit" },
  { value: 1, label: "1 · Payment Delay (1 mo)" },
  { value: 2, label: "2 · Payment Delay (2 mos)" },
  { value: 3, label: "3 · Payment Delay (3 mos)" },
  { value: 4, label: "4 · Payment Delay (4 mos)" },
  { value: 5, label: "5 · Payment Delay (5 mos)" },
  { value: 6, label: "6 · Payment Delay (6 mos)" },
  { value: 7, label: "7 · Payment Delay (7 mos)" },
  { value: 8, label: "8 · Payment Delay (8+ mos)" },
] as const;

export const HIGH_RISK_PRESET: CreditRiskInput = {
  applicant_id: "",
  LIMIT_BAL: 50000,
  SEX: 2,
  EDUCATION: 2,
  MARRIAGE: 1,
  AGE: 29,
  PAY_0: 2,
  PAY_2: 2,
  PAY_3: 0,
  PAY_4: 0,
  PAY_5: 0,
  PAY_6: 0,
  BILL_AMT1: 40000,
  BILL_AMT2: 35000,
  BILL_AMT3: 30000,
  BILL_AMT4: 25000,
  BILL_AMT5: 20000,
  BILL_AMT6: 15000,
  PAY_AMT1: 2000,
  PAY_AMT2: 2500,
  PAY_AMT3: 3000,
  PAY_AMT4: 3500,
  PAY_AMT5: 4000,
  PAY_AMT6: 4500,
};

export const LOW_RISK_PRESET: CreditRiskInput = {
  applicant_id: "",
  LIMIT_BAL: 240000,
  SEX: 2,
  EDUCATION: 1,
  MARRIAGE: 1,
  AGE: 36,
  PAY_0: -1,
  PAY_2: -1,
  PAY_3: -1,
  PAY_4: -1,
  PAY_5: -1,
  PAY_6: -1,
  BILL_AMT1: 12000,
  BILL_AMT2: 11500,
  BILL_AMT3: 10800,
  BILL_AMT4: 9500,
  BILL_AMT5: 8900,
  BILL_AMT6: 7400,
  PAY_AMT1: 12000,
  PAY_AMT2: 11500,
  PAY_AMT3: 10800,
  PAY_AMT4: 9500,
  PAY_AMT5: 8900,
  PAY_AMT6: 7400,
};

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getEducationLabel(code?: number): string {
  if (code === undefined || code === null) return "Unknown";
  return ALL_EDUCATION_LABELS[code] || "Others";
}

export function getMaritalLabel(code?: number): string {
  if (code === undefined || code === null) return "Unknown";
  return ALL_MARITAL_LABELS[code] || "Others";
}

export function getRiskBadgeClasses(category?: string): string {
  switch ((category || "Pending").toLowerCase()) {
    case "low":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-400";
    case "medium":
      return "border-amber-500/30 bg-amber-500/15 text-amber-400";
    case "high":
      return "border-rose-500/30 bg-rose-500/15 text-rose-400";
    default:
      return "border-slate-500/30 bg-slate-500/15 text-slate-400";
  }
}

export function validateApplicantInput(
  input: ApplicantCreateInput
): Record<string, string> {
  const errors: Record<string, string> = {};
  const id = input.applicant_id.trim();
  if (id.length < 3 || id.length > 30) {
    errors.applicant_id = "Applicant ID must be between 3 and 30 characters.";
  }
  if (!Number.isFinite(input.credit_limit) || input.credit_limit <= 0) {
    errors.credit_limit = "Credit limit must be greater than 0.";
  }
  if (!Number.isInteger(input.age) || input.age < 18 || input.age > 100) {
    errors.age = "Age must be an integer between 18 and 100.";
  }
  if (input.education < 0 || input.education > 6) {
    errors.education = "Education code must be between 0 and 6.";
  }
  if (input.marital_status < 0 || input.marital_status > 3) {
    errors.marital_status = "Marital status code must be between 0 and 3.";
  }
  return errors;
}

export function validatePredictionInput(
  input: CreditRiskInput
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.applicant_id && input.applicant_id.trim().length > 0) {
    const trimmed = input.applicant_id.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      errors.applicant_id = "Applicant ID must be 3–30 characters when provided.";
    }
  }
  if (!Number.isFinite(input.LIMIT_BAL) || input.LIMIT_BAL <= 0) {
    errors.LIMIT_BAL = "Credit limit (LIMIT_BAL) must be greater than 0.";
  }
  if (!Number.isInteger(input.AGE) || input.AGE < 18 || input.AGE > 100) {
    errors.AGE = "Age must be between 18 and 100.";
  }
  if (![1, 2].includes(input.SEX)) {
    errors.SEX = "Select 1 (Male) or 2 (Female).";
  }
  if (input.EDUCATION < 1 || input.EDUCATION > 4) {
    errors.EDUCATION = "Education must be between 1 and 4.";
  }
  if (input.MARRIAGE < 1 || input.MARRIAGE > 3) {
    errors.MARRIAGE = "Marital status must be between 1 and 3.";
  }

  const payFields = ["PAY_0", "PAY_2", "PAY_3", "PAY_4", "PAY_5", "PAY_6"] as const;
  for (const field of payFields) {
    const val = input[field];
    if (!Number.isInteger(val) || val < -2 || val > 8) {
      errors[field] = `${field} must be an integer from -2 to 8.`;
    }
  }

  const payAmtFields = [
    "PAY_AMT1",
    "PAY_AMT2",
    "PAY_AMT3",
    "PAY_AMT4",
    "PAY_AMT5",
    "PAY_AMT6",
  ] as const;
  for (const field of payAmtFields) {
    const val = input[field];
    if (!Number.isFinite(val) || val < 0) {
      errors[field] = `${field} cannot be negative.`;
    }
  }

  return errors;
}
