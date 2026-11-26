import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import PyMongoError

from api.app.database import model_logs_collection
from api.app.schemas.prediction import CreditRiskInput
from api.app.security import get_current_user
from ml.predict import predict_with_explanation


router = APIRouter(
    prefix="/api/v1/models",
    tags=["Model Insights & Explainability"],
    dependencies=[Depends(get_current_user)],
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODEL_DIR = BASE_DIR / "models"


def _load_json(path: Path) -> dict | list:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


@router.get("/insights")
def get_model_insights():
    insights = _load_json(MODEL_DIR / "model_insights.json")
    metrics = _load_json(MODEL_DIR / "model_metrics.json")

    if not insights and not metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model insights artifacts not found",
        )

    total_inferences = 0
    avg_latency_ms = 0.0
    try:
        total_inferences = model_logs_collection.count_documents({})
        agg = list(
            model_logs_collection.aggregate(
                [{"$group": {"_id": None, "avg_latency": {"$avg": "$latency_ms"}}}]
            )
        )
        if agg and agg[0].get("avg_latency") is not None:
            avg_latency_ms = round(float(agg[0]["avg_latency"]), 2)
    except PyMongoError:
        pass

    if isinstance(insights, dict) and insights:
        return {
            "success": True,
            **insights,
            "runtime_stats": {
                "total_inferences_logged": total_inferences,
                "avg_latency_ms": avg_latency_ms,
                "active_model_artifact": "models/random_forest.pkl",
                "feature_count": 23,
            },
        }

    return {
        "success": True,
        "selected_model": "random_forest",
        "model_metrics": metrics,
        "feature_importances": [],
        "global_shap": [],
        "roc_curves": {},
        "runtime_stats": {
            "total_inferences_logged": total_inferences,
            "avg_latency_ms": avg_latency_ms,
            "active_model_artifact": "models/random_forest.pkl",
            "feature_count": 23,
        },
    }


@router.post("/explain")
def explain_prediction_sandbox(payload: CreditRiskInput):
    """Run live Random Forest + SHAP explainability without persisting a record."""
    data = payload.model_dump()
    data.pop("applicant_id", None)
    try:
        result = predict_with_explanation(data)
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to compute SHAP explanation",
        ) from None

    return {
        "success": True,
        "prediction": result,
    }
