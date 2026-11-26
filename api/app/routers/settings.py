from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import PyMongoError

from api.app.database import (
    applicants_collection,
    check_database_connection,
    model_logs_collection,
    predictions_collection,
    settings_collection,
    users_collection,
)
from api.app.schemas.auth import SystemSettingsUpdate
from api.app.security import AUTH_REQUIRED, get_current_user, require_admin


router = APIRouter(
    prefix="/api/v1/settings",
    tags=["Settings & System Status"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/system")
def get_system_settings():
    db_connected = check_database_connection()
    config = None
    indexes_summary: dict[str, list[str]] = {}

    if db_connected:
        try:
            config = settings_collection.find_one(
                {"key": "global_risk_config"}, {"_id": 0}
            )
            indexes_summary = {
                "applicants": list(applicants_collection.index_information().keys()),
                "predictions": list(predictions_collection.index_information().keys()),
                "model_logs": list(model_logs_collection.index_information().keys()),
                "users": list(users_collection.index_information().keys()),
            }
        except PyMongoError:
            config = None

    if config and hasattr(config.get("updated_at"), "isoformat"):
        config["updated_at"] = config["updated_at"].isoformat()

    return {
        "success": True,
        "system": {
            "api_status": "running",
            "database_status": "connected" if db_connected else "disconnected",
            "auth_enabled": AUTH_REQUIRED,
            "active_model": "random_forest",
            "model_roc_auc": 0.7755,
            "indexes": indexes_summary,
        },
        "risk_thresholds": config
        or {
            "key": "global_risk_config",
            "low_risk_max_threshold": 0.20,
            "medium_risk_max_threshold": 0.50,
            "high_risk_alert_enabled": True,
            "active_model": "random_forest",
        },
    }


@router.put("/system", dependencies=[Depends(require_admin)])
def update_system_settings(payload: SystemSettingsUpdate):
    if payload.low_risk_max_threshold >= payload.medium_risk_max_threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Low-risk threshold must be strictly less than medium-risk threshold",
        )

    updates = {
        "low_risk_max_threshold": payload.low_risk_max_threshold,
        "medium_risk_max_threshold": payload.medium_risk_max_threshold,
        "high_risk_alert_enabled": payload.high_risk_alert_enabled,
        "updated_at": datetime.now(timezone.utc),
    }

    try:
        updated = settings_collection.find_one_and_update(
            {"key": "global_risk_config"},
            {"$set": updates},
            upsert=True,
            projection={"_id": 0},
            return_document=True,
        )
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to update system settings",
        ) from None

    if updated and hasattr(updated.get("updated_at"), "isoformat"):
        updated["updated_at"] = updated["updated_at"].isoformat()

    return {
        "success": True,
        "message": "System risk settings updated",
        "risk_thresholds": updated,
    }
