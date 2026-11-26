export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const TOKEN_STORAGE_KEY = "creditrisk_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export interface UserProfile {
  username: string;
  email: string;
  full_name: string;
  role: "admin" | "analyst" | string;
  organization: string;
  theme_preference: "dark" | "light";
  notifications_enabled: boolean;
  high_risk_alert_threshold: number;
  created_at?: string | null;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface Applicant {
  applicant_id: string;
  full_name?: string | null;
  credit_limit: number;
  age: number;
  education: number;
  marital_status: number;
  created_at?: string;
  risk_category?: string;
  latest_probability?: number | null;
  latest_risk_percentage?: number | null;
  latest_prediction_at?: string | null;
  prediction_count?: number;
}

export interface ApplicantCreateInput {
  applicant_id: string;
  full_name?: string;
  credit_limit: number;
  age: number;
  education: number;
  marital_status: number;
}

export interface ApplicantUpdateInput {
  full_name?: string;
  credit_limit?: number;
  age?: number;
  education?: number;
  marital_status?: number;
}

export interface CreditRiskInput {
  applicant_id?: string | null;
  LIMIT_BAL: number;
  SEX: number;
  EDUCATION: number;
  MARRIAGE: number;
  AGE: number;
  PAY_0: number;
  PAY_2: number;
  PAY_3: number;
  PAY_4: number;
  PAY_5: number;
  PAY_6: number;
  BILL_AMT1: number;
  BILL_AMT2: number;
  BILL_AMT3: number;
  BILL_AMT4: number;
  BILL_AMT5: number;
  BILL_AMT6: number;
  PAY_AMT1: number;
  PAY_AMT2: number;
  PAY_AMT3: number;
  PAY_AMT4: number;
  PAY_AMT5: number;
  PAY_AMT6: number;
}

export interface ShapContribution {
  feature: string;
  label: string;
  value: number;
  shap_value: number;
  abs_shap: number;
  impact: "increases_risk" | "decreases_risk";
}

export interface ShapExplanation {
  base_value: number;
  top_drivers: ShapContribution[];
  all_contributions?: ShapContribution[];
}

export interface PredictionResult {
  default_prediction: number;
  default_probability: number;
  risk_percentage: number;
  risk_category: string;
  shap_explanation?: ShapExplanation;
}

export interface Prediction {
  prediction_id?: string;
  applicant_id?: string | null;
  applicant_data?: Omit<CreditRiskInput, "applicant_id">;
  default_prediction: number;
  default_probability: number;
  risk_percentage: number;
  risk_category: string;
  shap_explanation?: ShapExplanation | null;
  scored_by?: string;
  latency_ms?: number;
  created_at?: string;
}

export interface HealthResponse {
  api_status: string;
  database_status: string;
}

export interface ApplicantsResponse {
  success: boolean;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  applicants: Applicant[];
}

export interface ApplicantResponse {
  success: boolean;
  applicant: Applicant;
}

export interface CreateApplicantResponse {
  success: boolean;
  message: string;
  applicant: Applicant;
}

export interface PredictionHistoryResponse {
  success: boolean;
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  predictions: Prediction[];
}

export interface CreatePredictionResponse {
  success: boolean;
  message: string;
  prediction_id: string;
  applicant_id: string | null;
  created_at?: string;
  latency_ms?: number;
  prediction: PredictionResult;
}

export interface AnalyticsSummaryResponse {
  success: boolean;
  kpis: {
    total_applicants: number;
    total_predictions: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
    default_rate_pct: number;
    avg_default_probability_pct: number;
    total_credit_exposure: number;
    avg_credit_limit: number;
    high_risk_exposure: number;
    model_inference_logs: number;
    avg_inference_latency_ms: number;
  };
  risk_distribution: Array<{
    name: string;
    category: string;
    value: number;
    color: string;
  }>;
  exposure_by_risk: Array<{
    category: string;
    exposure: number;
    count: number;
  }>;
  probability_distribution: Array<{
    range: string;
    count: number;
  }>;
  education_breakdown: Array<{
    education: string;
    predictions: number;
    high_risk_count: number;
    avg_risk_pct: number;
  }>;
  age_breakdown: Array<{
    age_group: string;
    predictions: number;
    high_risk_count: number;
    avg_risk_pct: number;
  }>;
  recent_predictions: Array<{
    prediction_id: string;
    applicant_id: string;
    default_probability: number;
    risk_percentage: number;
    risk_category: string;
    default_prediction: number;
    credit_limit: number;
    created_at?: string | null;
  }>;
  high_risk_alerts: Array<{
    prediction_id: string;
    applicant_id: string;
    default_probability: number;
    risk_percentage: number;
    risk_category: string;
    default_prediction: number;
    credit_limit: number;
    created_at?: string | null;
  }>;
}

export interface ModelMetricRow {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
}

export interface ModelInsightsResponse {
  success: boolean;
  selected_model: string;
  selection_rationale: string;
  dataset_summary: {
    total_records: number;
    test_split_size: number;
    default_rate_pct: number;
  };
  model_metrics: Record<string, ModelMetricRow>;
  feature_importances: Array<{
    feature: string;
    label: string;
    group: string;
    description: string;
    importance: number;
  }>;
  global_shap: Array<{
    feature: string;
    label: string;
    group: string;
    mean_abs_shap: number;
    mean_signed_shap: number;
  }>;
  roc_curves: Record<string, Array<{ fpr: number; tpr: number }>>;
  runtime_stats: {
    total_inferences_logged: number;
    avg_latency_ms: number;
    active_model_artifact: string;
    feature_count: number;
  };
}

export interface SystemSettingsResponse {
  success: boolean;
  system: {
    api_status: string;
    database_status: string;
    auth_enabled: boolean;
    active_model: string;
    model_roc_auc: number;
    indexes: Record<string, string[]>;
  };
  risk_thresholds: {
    key: string;
    low_risk_max_threshold: number;
    medium_risk_max_threshold: number;
    high_risk_alert_enabled: boolean;
    active_model: string;
    updated_at?: string;
  };
}

async function request<T>(
  path: string,
  init?: RequestInit & { skipAuthRedirect?: boolean }
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as {
        detail?: string | Array<{ msg?: string; loc?: Array<string | number> }>;
      };
      if (typeof body?.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body?.detail) && body.detail.length > 0) {
        detail = body.detail
          .map((d) => {
            const loc = Array.isArray(d.loc) ? d.loc.slice(1).join(".") : "";
            return loc ? `${loc}: ${d.msg}` : d.msg || "Validation error";
          })
          .join("; ");
      }
    } catch {
      // Ignore JSON parse errors on non-JSON error responses
    }

    if (
      response.status === 401 &&
      !init?.skipAuthRedirect &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent("creditrisk:unauthorized"));
    }

    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export const api = {
  getHealth: () => request<HealthResponse>("/health", { skipAuthRedirect: true }),

  login: (identifier: string, password: string) =>
    request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
      skipAuthRedirect: true,
    }),

  register: (payload: {
    username: string;
    email: string;
    full_name: string;
    organization?: string;
    password: string;
  }) =>
    request<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuthRedirect: true,
    }),

  getMe: () =>
    request<{ success: boolean; user: UserProfile }>("/api/v1/auth/me", {
      skipAuthRedirect: true,
    }),

  updateProfile: (payload: {
    full_name?: string;
    organization?: string;
    theme_preference?: "dark" | "light";
    notifications_enabled?: boolean;
    high_risk_alert_threshold?: number;
  }) =>
    request<{ success: boolean; message: string; user: UserProfile }>(
      "/api/v1/auth/me",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    ),

  changePassword: (current_password: string, new_password: string) =>
    request<{ success: boolean; message: string }>(
      "/api/v1/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify({ current_password, new_password }),
      }
    ),

  getApplicants: (params?: {
    search?: string;
    education?: number;
    marital_status?: number;
    risk_category?: string;
    page?: number;
    page_size?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.education !== undefined)
      query.set("education", String(params.education));
    if (params?.marital_status !== undefined)
      query.set("marital_status", String(params.marital_status));
    if (params?.risk_category && params.risk_category !== "All")
      query.set("risk_category", params.risk_category);
    if (params?.page !== undefined) query.set("page", String(params.page));
    if (params?.page_size !== undefined)
      query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return request<ApplicantsResponse>(
      `/api/v1/applicants/${qs ? `?${qs}` : ""}`
    );
  },

  getApplicant: (applicantId: string) =>
    request<ApplicantResponse>(
      `/api/v1/applicants/${encodeURIComponent(applicantId)}`
    ),

  createApplicant: (payload: ApplicantCreateInput) =>
    request<CreateApplicantResponse>("/api/v1/applicants/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateApplicant: (applicantId: string, payload: ApplicantUpdateInput) =>
    request<CreateApplicantResponse>(
      `/api/v1/applicants/${encodeURIComponent(applicantId)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),

  deleteApplicant: (applicantId: string) =>
    request<{ success: boolean; message: string }>(
      `/api/v1/applicants/${encodeURIComponent(applicantId)}`,
      { method: "DELETE" }
    ),

  getPredictionHistory: (
    page = 1,
    pageSize = 10,
    filters?: { risk_category?: string; search?: string }
  ) => {
    const query = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (filters?.risk_category && filters.risk_category !== "All") {
      query.set("risk_category", filters.risk_category);
    }
    if (filters?.search) {
      query.set("search", filters.search);
    }
    return request<PredictionHistoryResponse>(
      `/api/v1/predictions/history?${query.toString()}`
    );
  },

  getApplicantPredictions: (applicantId: string) =>
    request<{
      success: boolean;
      applicant_id: string;
      total: number;
      predictions: Prediction[];
    }>(`/api/v1/predictions/applicant/${encodeURIComponent(applicantId)}`),

  getPredictionDetail: (predictionId: string) =>
    request<{ success: boolean; prediction: Prediction }>(
      `/api/v1/predictions/${encodeURIComponent(predictionId)}`
    ),

  createPrediction: (payload: CreditRiskInput) =>
    request<CreatePredictionResponse>("/api/v1/predictions/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAnalyticsSummary: () =>
    request<AnalyticsSummaryResponse>("/api/v1/analytics/summary"),

  getModelInsights: () =>
    request<ModelInsightsResponse>("/api/v1/models/insights"),

  explainSandbox: (payload: CreditRiskInput) =>
    request<{ success: boolean; prediction: PredictionResult }>(
      "/api/v1/models/explain",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  getSystemSettings: () =>
    request<SystemSettingsResponse>("/api/v1/settings/system"),

  updateSystemSettings: (payload: {
    low_risk_max_threshold: number;
    medium_risk_max_threshold: number;
    high_risk_alert_enabled: boolean;
  }) =>
    request<{
      success: boolean;
      message: string;
      risk_thresholds: SystemSettingsResponse["risk_thresholds"];
    }>("/api/v1/settings/system", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
