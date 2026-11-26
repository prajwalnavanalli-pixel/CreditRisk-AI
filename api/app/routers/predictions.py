from datetime import datetime, timezone
import re
import time

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.errors import PyMongoError

from api.app.database import (
    applicants_collection,
    model_logs_collection,
    predictions_collection,
)
from api.app.schemas.prediction import CreditRiskInput
from api.app.security import get_current_user
from ml.predict import explain_credit_risk, predict_with_explanation


router = APIRouter(
    prefix="/api/v1/predictions",
    tags=["Credit Risk Predictions"],
    dependencies=[Depends(get_current_user)],
)


def _format_prediction_doc(doc: dict) -> dict:
    if "_id" in doc:
        doc["prediction_id"] = str(doc.pop("_id"))
    created_at = doc.get("created_at")
    if hasattr(created_at, "isoformat"):
        doc["created_at"] = created_at.isoformat()
    return doc


# --------------------------------------------------
# 1. CREATE CREDIT RISK PREDICTION
# --------------------------------------------------


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"description": "Applicant not found"},
        500: {"description": "Prediction processing failed"},
        503: {"description": "Database operation failed"},
    },
)
def predict_risk(
    applicant: CreditRiskInput,
    current_user: dict = Depends(get_current_user),
):
    applicant_data = applicant.model_dump()
    applicant_id = applicant_data.pop("applicant_id")

    # Verify applicant if an ID is provided
    if applicant_id:
        try:
            existing_applicant = applicants_collection.find_one(
                {"applicant_id": applicant_id}
            )
        except PyMongoError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify applicant",
            ) from None

        if not existing_applicant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Applicant not found. Register the applicant first.",
            )

    # Generate prediction + SHAP explanation
    start_time = time.perf_counter()
    try:
        result = predict_with_explanation(applicant_data)
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate credit risk prediction",
        ) from None
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    now = datetime.now(timezone.utc)
    prediction_record = {
        "applicant_id": applicant_id,
        "applicant_data": applicant_data,
        "default_prediction": result["default_prediction"],
        "default_probability": result["default_probability"],
        "risk_percentage": result["risk_percentage"],
        "risk_category": result["risk_category"],
        "shap_explanation": result["shap_explanation"],
        "scored_by": current_user.get("username", "analyst"),
        "model_name": "random_forest",
        "latency_ms": latency_ms,
        "created_at": now,
    }

    # Store prediction and inference audit log in MongoDB
    try:
        insert_result = predictions_collection.insert_one(prediction_record)
        prediction_id = str(insert_result.inserted_id)

        model_logs_collection.insert_one(
            {
                "prediction_id": prediction_id,
                "applicant_id": applicant_id,
                "model_name": "random_forest",
                "default_probability": result["default_probability"],
                "risk_category": result["risk_category"],
                "latency_ms": latency_ms,
                "scored_by": current_user.get("username", "analyst"),
                "created_at": now,
            }
        )
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction generated, but database storage failed",
        ) from None

    return {
        "success": True,
        "message": "Credit risk prediction completed",
        "prediction_id": prediction_id,
        "applicant_id": applicant_id,
        "created_at": now.isoformat(),
        "latency_ms": latency_ms,
        "prediction": result,
    }


# --------------------------------------------------
# 2. GET ALL PREDICTIONS WITH PAGINATION & FILTERS
# --------------------------------------------------


@router.get(
    "/history",
    responses={
        400: {"description": "Invalid pagination parameters"},
        503: {"description": "Unable to retrieve prediction history"},
    },
)
def get_prediction_history(
    page: int = 1,
    page_size: int = 10,
    risk_category: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=60),
):
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page must be greater than or equal to 1",
        )

    if page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page size must be between 1 and 100",
        )

    mongo_filter: dict = {}
    if risk_category and risk_category.lower() != "all":
        normalized = risk_category.strip().capitalize()
        if normalized not in {"Low", "Medium", "High"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Risk category filter must be Low, Medium, High, or All",
            )
        mongo_filter["risk_category"] = normalized

    if search and search.strip():
        escaped = re.escape(search.strip())
        mongo_filter["applicant_id"] = {"$regex": escaped, "$options": "i"}

    try:
        total = predictions_collection.count_documents(mongo_filter)
        skip = (page - 1) * page_size

        predictions = list(
            predictions_collection.find(mongo_filter)
            .sort("created_at", -1)
            .skip(skip)
            .limit(page_size)
        )

        formatted = [_format_prediction_doc(p) for p in predictions]
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "success": True,
            "page": page,
            "page_size": page_size,
            "total_records": total,
            "total_pages": total_pages,
            "predictions": formatted,
        }

    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve prediction history",
        ) from None


# --------------------------------------------------
# 3. GET PREDICTIONS FOR A SPECIFIC APPLICANT
# --------------------------------------------------


@router.get(
    "/applicant/{applicant_id}",
    responses={
        404: {"description": "Applicant or predictions not found"},
        503: {"description": "Unable to retrieve applicant predictions"},
    },
)
def get_applicant_prediction_history(applicant_id: str):
    try:
        predictions = list(
            predictions_collection.find({"applicant_id": applicant_id}).sort(
                "created_at", -1
            )
        )
        applicant_exists = applicants_collection.find_one(
            {"applicant_id": applicant_id}, {"_id": 1}
        )
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve applicant predictions",
        ) from None

    if not predictions and not applicant_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No predictions found for this applicant",
        )

    formatted = [_format_prediction_doc(p) for p in predictions]
    return {
        "success": True,
        "applicant_id": applicant_id,
        "total": len(formatted),
        "predictions": formatted,
    }


# --------------------------------------------------
# 4. GET SINGLE PREDICTION WITH SHAP EXPLANATION
# --------------------------------------------------


@router.get(
    "/{prediction_id}",
    responses={
        400: {"description": "Invalid prediction ID format"},
        404: {"description": "Prediction not found"},
        503: {"description": "Unable to retrieve prediction"},
    },
)
def get_prediction_detail(prediction_id: str):
    try:
        object_id = ObjectId(prediction_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid prediction ID format",
        ) from None

    try:
        doc = predictions_collection.find_one({"_id": object_id})
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve prediction",
        ) from None

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found",
        )

    formatted = _format_prediction_doc(doc)
    if not formatted.get("shap_explanation") and formatted.get("applicant_data"):
        try:
            formatted["shap_explanation"] = explain_credit_risk(
                formatted["applicant_data"], top_k=10
            )
        except Exception:
            formatted["shap_explanation"] = None

    return {"success": True, "prediction": formatted}
