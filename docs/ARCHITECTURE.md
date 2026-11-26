# CreditRisk AI — System Architecture

## High-Level Architecture

```
Next.js 16 Dashboard (React 19 · TypeScript · Tailwind v4 · Recharts · Swagger UI)
        │  HTTPS / JSON + Bearer JWT
        ▼
FastAPI Backend (Pydantic v2 · PBKDF2 + HS256 JWT · RBAC · OpenAPI)
        ├──► ML Inference Engine (Random Forest · XGBoost · Logistic Regression · SHAP TreeExplainer)
        └──► MongoDB 7 (applicants · predictions · model_logs · users · settings)
```

## Directory Layout

- `api/` — FastAPI application (`main.py`, `database.py`, `security.py`, `routers/`, `schemas/`)
- `ml/` — Model inference and real-time SHAP attribution (`predict.py`)
- `models/` — Serialized `.pkl` artifacts, `feature_columns.json`, `model_metrics.json`, `model_insights.json`
- `database/` — Idempotent index verifier & baseline user/config seeding (`init_db.py`)
- `dashboard/` — Next.js App Router frontend with 7 interactive views
- `scripts/` — Offline model insights & ROC/SHAP precomputation (`generate_model_insights.py`)
- `tests/` — Pytest API/ML/validation test suite
- `deployment/` — Multi-stage Dockerfiles for API and Dashboard
- `.github/workflows/` — Automated CI pipeline (`ci.yml`)
