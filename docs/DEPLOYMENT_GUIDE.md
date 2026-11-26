# CreditRisk AI — GitHub & Cloud Deployment Guide

This guide walks through the final two manual steps: pushing the codebase to GitHub and deploying the containerized application.

---

## Step 1: Push Project to GitHub

1. Create a new empty repository on GitHub (e.g., `creditrisk-ai`) without initializing a README or license.
2. From the project root, initialize Git, verify `.gitignore` excludes `.env`, `.venv/`, and `node_modules/`, and push:

```powershell
cd C:\Users\HP\OneDrive\Desktop\CreditRisk_AI
git init
git branch -M main
git status
git add .
git commit -m "feat: complete CreditRisk AI full-stack ML dashboard, security, Docker, and CI/CD"
git remote add origin https://github.com/<YOUR_USERNAME>/creditrisk-ai.git
git push -u origin main
```

3. Open the **Actions** tab on GitHub to confirm the `.github/workflows/ci.yml` pipeline passes all backend, frontend, and Docker build checks.

---

## Step 2: Deploy to Cloud

### Option A: Single-VM / Docker Compose Deployment (AWS EC2, DigitalOcean, Azure VM, or Render/Railway)
1. Provision MongoDB (e.g., **MongoDB Atlas** free M0 cluster) and copy its connection string (`mongodb+srv://...`).
2. Deploy the **FastAPI Backend** (`deployment/Dockerfile.api`) on **Render**, **Railway**, or **Fly.io** with environment variables:
   - `MONGO_URL=<your-atlas-connection-string>`
   - `MONGO_DB_NAME=creditrisk_ai`
   - `JWT_SECRET=<strong-random-32+-char-secret>`
   - `AUTH_REQUIRED=true`
   - `CORS_ORIGINS=https://<your-frontend-domain>`
3. Deploy the **Next.js Dashboard** (`dashboard/` or `deployment/Dockerfile.dashboard`) on **Vercel** or **Render** with:
   - `NEXT_PUBLIC_API_URL=https://<your-deployed-fastapi-url>`
4. Verify `/health` returns `{"api_status":"running","database_status":"connected"}` and sign in on your live dashboard URL!
