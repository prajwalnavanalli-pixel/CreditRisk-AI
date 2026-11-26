from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import PyMongoError

from api.app.database import (
    applicants_collection,
    model_logs_collection,
    predictions_collection,
)
from api.app.security import get_current_user


router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Risk Analytics"],
    dependencies=[Depends(get_current_user)],
)

EDUCATION_LABELS = {
    0: "Unknown",
    1: "Graduate School",
    2: "University",
    3: "High School",
    4: "Others",
    5: "Unknown",
    6: "Unknown",
}


def _age_bucket(age: int) -> str:
    if age < 26:
        return "18-25"
    if age < 36:
        return "26-35"
    if age < 46:
        return "36-45"
    if age < 56:
        return "46-55"
    return "56+"


@router.get("/summary")
def get_analytics_summary():
    try:
        applicants = list(applicants_collection.find({}, {"_id": 0}))
        predictions = list(
            predictions_collection.find({}).sort("created_at", -1)
        )
        total_logs = model_logs_collection.count_documents({})
        avg_latency_agg = list(
            model_logs_collection.aggregate(
                [{"$group": {"_id": None, "avg_latency": {"$avg": "$latency_ms"}}}]
            )
        )
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to compute analytics summary",
        ) from None

    total_applicants = len(applicants)
    total_predictions = len(predictions)

    risk_counts = {"Low": 0, "Medium": 0, "High": 0}
    exposure_by_risk = {"Low": 0.0, "Medium": 0.0, "High": 0.0}
    prob_sum = 0.0
    default_flagged = 0

    buckets = [
        {"range": "0-20%", "min": 0.0, "max": 0.2, "count": 0},
        {"range": "20-40%", "min": 0.2, "max": 0.4, "count": 0},
        {"range": "40-60%", "min": 0.4, "max": 0.6, "count": 0},
        {"range": "60-80%", "min": 0.6, "max": 0.8, "count": 0},
        {"range": "80-100%", "min": 0.8, "max": 1.01, "count": 0},
    ]

    education_stats: dict[str, dict[str, float | int]] = {}
    age_stats: dict[str, dict[str, float | int]] = {}
    recent_predictions = []
    high_risk_alerts = []

    for pred in predictions:
        prob = float(pred.get("default_probability", 0.0))
        pct = float(pred.get("risk_percentage", round(prob * 100, 2)))
        category = pred.get("risk_category", "Medium")
        if category not in risk_counts:
            category = "Medium"

        risk_counts[category] += 1
        prob_sum += prob
        if int(pred.get("default_prediction", 0)) == 1:
            default_flagged += 1

        data = pred.get("applicant_data") or {}
        limit_bal = float(data.get("LIMIT_BAL", 0.0))
        exposure_by_risk[category] += limit_bal

        for bucket in buckets:
            if bucket["min"] <= prob < bucket["max"]:
                bucket["count"] += 1
                break

        edu_label = EDUCATION_LABELS.get(int(data.get("EDUCATION", 4)), "Others")
        edu_entry = education_stats.setdefault(
            edu_label, {"label": edu_label, "count": 0, "high_risk": 0, "prob_sum": 0.0}
        )
        edu_entry["count"] += 1
        edu_entry["prob_sum"] += pct
        if category == "High":
            edu_entry["high_risk"] += 1

        age_val = int(data.get("AGE", 30))
        age_group = _age_bucket(age_val)
        age_entry = age_stats.setdefault(
            age_group, {"age_group": age_group, "count": 0, "high_risk": 0, "prob_sum": 0.0}
        )
        age_entry["count"] += 1
        age_entry["prob_sum"] += pct
        if category == "High":
            age_entry["high_risk"] += 1

        created_at = pred.get("created_at")
        created_iso = created_at.isoformat() if hasattr(created_at, "isoformat") else None
        summary_item = {
            "prediction_id": str(pred.get("_id")),
            "applicant_id": pred.get("applicant_id") or "Walk-in / Ad-hoc",
            "default_probability": prob,
            "risk_percentage": pct,
            "risk_category": category,
            "default_prediction": int(pred.get("default_prediction", 0)),
            "credit_limit": limit_bal,
            "created_at": created_iso,
        }
        if len(recent_predictions) < 8:
            recent_predictions.append(summary_item)
        if category == "High" and len(high_risk_alerts) < 6:
            high_risk_alerts.append(summary_item)

    total_credit_exposure = sum(float(a.get("credit_limit", 0.0)) for a in applicants)
    avg_credit_limit = (
        round(total_credit_exposure / total_applicants, 2)
        if total_applicants > 0
        else 0.0
    )
    avg_default_probability = (
        round((prob_sum / total_predictions) * 100, 2)
        if total_predictions > 0
        else 0.0
    )
    default_rate = (
        round((default_flagged / total_predictions) * 100, 2)
        if total_predictions > 0
        else 0.0
    )

    risk_distribution = [
        {"name": "Low Risk", "category": "Low", "value": risk_counts["Low"], "color": "#20c997"},
        {"name": "Medium Risk", "category": "Medium", "value": risk_counts["Medium"], "color": "#f5b942"},
        {"name": "High Risk", "category": "High", "value": risk_counts["High"], "color": "#ff647c"},
    ]

    exposure_chart = [
        {"category": "Low", "exposure": round(exposure_by_risk["Low"], 2), "count": risk_counts["Low"]},
        {"category": "Medium", "exposure": round(exposure_by_risk["Medium"], 2), "count": risk_counts["Medium"]},
        {"category": "High", "exposure": round(exposure_by_risk["High"], 2), "count": risk_counts["High"]},
    ]

    education_breakdown = [
        {
            "education": item["label"],
            "predictions": int(item["count"]),
            "high_risk_count": int(item["high_risk"]),
            "avg_risk_pct": round(float(item["prob_sum"]) / int(item["count"]), 2),
        }
        for item in education_stats.values()
    ]

    age_order = ["18-25", "26-35", "36-45", "46-55", "56+"]
    age_breakdown = [
        {
            "age_group": age_stats[group]["age_group"],
            "predictions": int(age_stats[group]["count"]),
            "high_risk_count": int(age_stats[group]["high_risk"]),
            "avg_risk_pct": round(
                float(age_stats[group]["prob_sum"]) / int(age_stats[group]["count"]), 2
            ),
        }
        for group in age_order
        if group in age_stats
    ]

    avg_latency_ms = (
        round(float(avg_latency_agg[0]["avg_latency"]), 2)
        if avg_latency_agg and avg_latency_agg[0].get("avg_latency") is not None
        else 0.0
    )

    return {
        "success": True,
        "kpis": {
            "total_applicants": total_applicants,
            "total_predictions": total_predictions,
            "high_risk_count": risk_counts["High"],
            "medium_risk_count": risk_counts["Medium"],
            "low_risk_count": risk_counts["Low"],
            "default_rate_pct": default_rate,
            "avg_default_probability_pct": avg_default_probability,
            "total_credit_exposure": round(total_credit_exposure, 2),
            "avg_credit_limit": avg_credit_limit,
            "high_risk_exposure": round(exposure_by_risk["High"], 2),
            "model_inference_logs": total_logs,
            "avg_inference_latency_ms": avg_latency_ms,
        },
        "risk_distribution": risk_distribution,
        "exposure_by_risk": exposure_chart,
        "probability_distribution": [
            {"range": b["range"], "count": b["count"]} for b in buckets
        ],
        "education_breakdown": education_breakdown,
        "age_breakdown": age_breakdown,
        "recent_predictions": recent_predictions,
        "high_risk_alerts": high_risk_alerts,
    }
