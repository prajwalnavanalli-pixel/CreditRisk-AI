# CreditRisk AI — Loan Default Prediction & Explainability Platform

An end-to-end, production-ready Machine Learning and Full-Stack financial risk platform that predicts credit card / loan default probability using **Random Forest** (`0.7755 ROC-AUC`), explains every decision with **SHAP (SHapley Additive exPlanations)**, persists borrower and scoring records in **MongoDB**, and exposes an interactive **Next.js + TypeScript + Recharts** underwriting dashboard backed by a JWT-protected **FastAPI** service.

---

## Key Capabilities

- **Machine Learning & Explainability (`ml/`, `models/`)**:
  - Trained and benchmarked Logistic Regression (`0.7079` ROC-AUC), XGBoost (`0.7752` ROC-AUC), and Random Forest (`0.7755` ROC-AUC, `57.72%` default recall, `0.5329` F1).
  - Real-time per-applicant SHAP waterfall feature attribution (`shap.TreeExplainer`) + global SHAP & ROC curve insights.
- **FastAPI Backend & Security (`api/`)**:
  - JWT HS256 authentication + PBKDF2 password hashing + Role-Based Access Control (`admin` & `analyst`).
  - Strict Pydantic v2 input validation across all 23 model features.
  - Endpoints for Auth, Applicants CRUD, Predictions + SHAP, Portfolio Risk Analytics, Model Insights, and System Settings.
  - Interactive OpenAPI / Swagger UI at `/docs`.
- **MongoDB Persistence (`database/`)**:
  - Indexed collections: `applicants`, `predictions`, `model_logs`, `users`, and `settings`.
- **Next.js Underwriting Dashboard (`dashboard/`)**:
  - **Overview (`/`)**: Live API/DB health, KPI cards, risk distribution donut, probability histogram, recent predictions.
  - **Applicants Management (`/applicants`)**: Search, multi-filter directory, pagination, registration modal, slide-over profile & prediction history drawer.
  - **New Prediction (`/predictions`)**: Structured 23-feature form, presets, validation, live risk gauge, and per-applicant SHAP chart.
  - **Prediction History (`/predictions/history`)**: Searchable, filterable, paginated scoring archive with SHAP modal inspector.
  - **Risk Analytics (`/analytics`)**: Default rates, financial exposure by risk tier, education & age risk breakdowns, high-risk watchlist.
  - **Model Insights (`/models`)**: Multi-model metrics comparison, ROC curves, global SHAP vs. Gini feature importances.
  - **Settings & UX (`/settings`)**: Dark/Light theme switching, profile & alert preferences, password updates, and MongoDB index verification.
  - *(FastAPI Swagger UI remains available on the backend at `http://127.0.0.1:8000/docs`.)*

---

## Local Development Setup

### Prerequisites
- Python 3.12+
- Node.js 20+ (tested on Node 24)
- MongoDB running locally on `mongodb://127.0.0.1:27017/`

### 1. Start the FastAPI Backend
```powershell
cd C:\Users\HP\OneDrive\Desktop\CreditRisk_AI
.\.venv\Scripts\activate
uvicorn api.app.main:app --reload --port 8000
```
- Swagger Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`

### 2. Start the Next.js Dashboard
```powershell
cd C:\Users\HP\OneDrive\Desktop\CreditRisk_AI\dashboard
npm install
npm run dev
```
- Dashboard URL: `http://localhost:3000`


---

## Running Tests & Quality Checks

```powershell
# Backend API & ML integration tests (uses isolated creditrisk_ai_test DB)
.\.venv\Scripts\pytest.exe -v tests/

# Frontend TypeScript, ESLint, unit tests & production build
cd dashboard
npx tsc --noEmit
npm run lint
node --test tests/*.mjs
npm run build
```

---

## Docker Compose Stack

```bash
docker compose up --build
```
Starts `mongodb` (`27017`), `api` (`8000`), and `dashboard` (`3000`).

See `docs/ARCHITECTURE.md`, `docs/API_GUIDE.md`, and `docs/DEPLOYMENT_GUIDE.md` for detailed system architecture and cloud deployment steps.
