# CreditRisk AI — REST API Reference

Base URL: `http://127.0.0.1:8000` (local)

## Authentication
All `/api/v1/*` endpoints (except `/api/v1/auth/login` and `/api/v1/auth/register`) require an `Authorization: Bearer <jwt_token>` header (or `X-API-Key`).

- `POST /api/v1/auth/login` — Authenticate with `identifier` + `password` and receive a Bearer JWT.
- `POST /api/v1/auth/register` — Register a new analyst account.
- `GET /api/v1/auth/me` — Fetch signed-in user profile and preferences.
- `PATCH /api/v1/auth/me` — Update profile, theme, and alert threshold.
- `POST /api/v1/auth/change-password` — Update user password.

## Applicants
- `POST /api/v1/applicants/` — Register a new applicant (`applicant_id`, `credit_limit`, `age`, `education`, `marital_status`, optional `full_name`).
- `GET /api/v1/applicants/` — List applicants with optional `search`, `education`, `marital_status`, `risk_category`, `page`, `page_size`.
- `GET /api/v1/applicants/{applicant_id}` — Fetch single applicant with latest risk summary.
- `PUT /api/v1/applicants/{applicant_id}` — Update applicant profile.
- `DELETE /api/v1/applicants/{applicant_id}` — Delete applicant (**Admin role required**).

## Credit Risk Predictions
- `POST /api/v1/predictions/` — Score all 23 UCI credit features, compute top-10 SHAP drivers, store in `predictions` & `model_logs`.
- `GET /api/v1/predictions/history` — Paginated scoring history with `risk_category` & `search` filters.
- `GET /api/v1/predictions/applicant/{applicant_id}` — Prediction history for a specific applicant.
- `GET /api/v1/predictions/{prediction_id}` — Single prediction with full SHAP attribution.

## Analytics, Models & Settings
- `GET /api/v1/analytics/summary` — Live portfolio KPIs, exposure, probability histogram, demographic risk segments, high-risk watchlist.
- `GET /api/v1/models/insights` — Model comparison metrics, ROC curves, feature importances, and global SHAP weights.
- `POST /api/v1/models/explain` — Non-persistent what-if SHAP explainability endpoint.
- `GET /api/v1/settings/system` — Database health, auth status, and verified MongoDB indexes.
- `PUT /api/v1/settings/system` — Update global risk thresholds (**Admin role required**).
