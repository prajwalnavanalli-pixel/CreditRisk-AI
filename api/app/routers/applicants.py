from datetime import datetime, timezone
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.errors import DuplicateKeyError, PyMongoError

from api.app.database import applicants_collection, predictions_collection
from api.app.schemas.applicant import ApplicantCreate, ApplicantUpdate
from api.app.security import get_current_user, require_admin


router = APIRouter(
    prefix="/api/v1/applicants",
    tags=["Applicants"],
    dependencies=[Depends(get_current_user)],
)


def _serialize_created_at(record: dict) -> None:
    created_at = record.get("created_at")
    if hasattr(created_at, "isoformat"):
        record["created_at"] = created_at.isoformat()


def _attach_prediction_summaries(applicants: list[dict]) -> None:
    """Enrich applicants with latest prediction risk category & count."""
    applicant_ids = [item.get("applicant_id") for item in applicants if item.get("applicant_id")]
    if not applicant_ids:
        return

    pipeline = [
        {"$match": {"applicant_id": {"$in": applicant_ids}}},
        {"$sort": {"created_at": -1}},
        {
            "$group": {
                "_id": "$applicant_id",
                "latest_risk_category": {"$first": "$risk_category"},
                "latest_probability": {"$first": "$default_probability"},
                "latest_risk_percentage": {"$first": "$risk_percentage"},
                "latest_prediction_at": {"$first": "$created_at"},
                "prediction_count": {"$sum": 1},
            }
        },
    ]

    summary_map: dict[str, dict] = {}
    for row in predictions_collection.aggregate(pipeline):
        summary_map[row["_id"]] = row

    for applicant in applicants:
        aid = applicant.get("applicant_id")
        summary = summary_map.get(aid)
        if summary:
            applicant["risk_category"] = summary.get("latest_risk_category", "Pending")
            applicant["latest_probability"] = summary.get("latest_probability")
            applicant["latest_risk_percentage"] = summary.get("latest_risk_percentage")
            applicant["prediction_count"] = summary.get("prediction_count", 0)
            latest_at = summary.get("latest_prediction_at")
            if hasattr(latest_at, "isoformat"):
                applicant["latest_prediction_at"] = latest_at.isoformat()
        else:
            applicant.setdefault("risk_category", "Pending")
            applicant["latest_probability"] = None
            applicant["latest_risk_percentage"] = None
            applicant["prediction_count"] = 0


# 1. Register a new applicant
@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"description": "Applicant ID already exists"},
        503: {"description": "Database operation failed"},
    },
)
def create_applicant(applicant: ApplicantCreate):
    applicant_data = applicant.model_dump()
    applicant_data["created_at"] = datetime.now(timezone.utc)

    try:
        applicants_collection.insert_one(applicant_data.copy())
        _serialize_created_at(applicant_data)
        applicant_data["risk_category"] = "Pending"
        applicant_data["prediction_count"] = 0

        return {
            "success": True,
            "message": "Applicant registered successfully",
            "applicant": applicant_data,
        }

    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Applicant ID already exists",
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to register applicant",
        ) from None


# 2. Retrieve applicants with search, filters, and pagination
@router.get(
    "/",
    responses={
        400: {"description": "Invalid query parameter"},
        503: {"description": "Unable to retrieve applicants"},
    },
)
def get_all_applicants(
    search: str | None = Query(default=None, max_length=60),
    education: int | None = Query(default=None, ge=0, le=6),
    marital_status: int | None = Query(default=None, ge=0, le=3),
    risk_category: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    mongo_filter: dict = {}
    if search and search.strip():
        escaped = re.escape(search.strip())
        mongo_filter["$or"] = [
            {"applicant_id": {"$regex": escaped, "$options": "i"}},
            {"full_name": {"$regex": escaped, "$options": "i"}},
        ]
    if education is not None:
        mongo_filter["education"] = education
    if marital_status is not None:
        mongo_filter["marital_status"] = marital_status

    try:
        applicants = list(
            applicants_collection.find(mongo_filter, {"_id": 0}).sort("created_at", -1)
        )
        for applicant in applicants:
            _serialize_created_at(applicant)
        _attach_prediction_summaries(applicants)
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve applicants",
        ) from None

    if risk_category and risk_category.lower() != "all":
        target = risk_category.strip().lower()
        applicants = [
            item
            for item in applicants
            if (item.get("risk_category") or "Pending").lower() == target
        ]

    total = len(applicants)
    if page is not None:
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        paginated = applicants[start : start + page_size]
    else:
        total_pages = 1
        paginated = applicants

    return {
        "success": True,
        "total": total,
        "page": page or 1,
        "page_size": page_size if page is not None else max(total, 1),
        "total_pages": total_pages,
        "applicants": paginated,
    }


# 3. Retrieve applicant by ID
@router.get(
    "/{applicant_id}",
    responses={
        404: {"description": "Applicant not found"},
        503: {"description": "Unable to retrieve applicant"},
    },
)
def get_applicant(applicant_id: str):
    try:
        applicant = applicants_collection.find_one(
            {"applicant_id": applicant_id},
            {"_id": 0},
        )
        if not applicant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Applicant not found",
            )
        _serialize_created_at(applicant)
        _attach_prediction_summaries([applicant])
    except HTTPException:
        raise
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve applicant",
        ) from None

    return {
        "success": True,
        "applicant": applicant,
    }


# 4. Update applicant details
@router.put(
    "/{applicant_id}",
    responses={
        400: {"description": "No update fields provided"},
        404: {"description": "Applicant not found"},
        503: {"description": "Unable to update applicant"},
    },
)
def update_applicant(applicant_id: str, payload: ApplicantUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )
    updates["updated_at"] = datetime.now(timezone.utc)

    try:
        updated = applicants_collection.find_one_and_update(
            {"applicant_id": applicant_id},
            {"$set": updates},
            projection={"_id": 0},
            return_document=True,
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Applicant not found",
            )
        _serialize_created_at(updated)
        _attach_prediction_summaries([updated])
    except HTTPException:
        raise
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to update applicant",
        ) from None

    return {
        "success": True,
        "message": "Applicant updated successfully",
        "applicant": updated,
    }


# 5. Delete applicant (admin only)
@router.delete(
    "/{applicant_id}",
    dependencies=[Depends(require_admin)],
    responses={
        403: {"description": "Administrator privileges required"},
        404: {"description": "Applicant not found"},
        503: {"description": "Unable to delete applicant"},
    },
)
def delete_applicant(applicant_id: str):
    try:
        result = applicants_collection.delete_one({"applicant_id": applicant_id})
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to delete applicant",
        ) from None

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found",
        )

    return {
        "success": True,
        "message": f"Applicant {applicant_id} deleted successfully",
    }
