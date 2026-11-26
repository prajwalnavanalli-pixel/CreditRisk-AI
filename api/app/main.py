from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.app.database import check_database_connection
from api.app.routers.analytics import router as analytics_router
from api.app.routers.applicants import router as applicants_router
from api.app.routers.auth import router as auth_router
from api.app.routers.models import router as models_router
from api.app.routers.predictions import router as predictions_router
from api.app.routers.settings import router as settings_router
from database.init_db import init_database


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if check_database_connection():
        init_database()
    yield


app = FastAPI(
    title="CreditRisk AI API",
    description=(
        "Production-grade Credit Default Risk Prediction System powered by "
        "Random Forest (0.7755 ROC-AUC), SHAP Explainability, FastAPI, and MongoDB."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router)
app.include_router(applicants_router)
app.include_router(predictions_router)
app.include_router(analytics_router)
app.include_router(models_router)
app.include_router(settings_router)


# Root endpoint
@app.get("/", tags=["System"])
def home():
    return {
        "success": True,
        "message": "Welcome to CreditRisk AI API",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


# Health check endpoint
@app.get("/health", tags=["System"])
def health_check():
    connected = check_database_connection()

    return {
        "api_status": "running",
        "database_status": "connected" if connected else "disconnected",
    }
