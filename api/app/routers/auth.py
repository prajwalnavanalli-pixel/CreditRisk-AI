from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError, PyMongoError

from api.app.database import users_collection
from api.app.schemas.auth import (
    LoginRequest,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    RegisterRequest,
)
from api.app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication & Profile"],
)


def _public_user(user_doc: dict) -> dict:
    created_at = user_doc.get("created_at")
    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()
    return {
        "username": user_doc["username"],
        "email": user_doc["email"],
        "full_name": user_doc.get("full_name", user_doc["username"]),
        "role": user_doc.get("role", "analyst"),
        "organization": user_doc.get("organization", "CreditRisk AI"),
        "theme_preference": user_doc.get("theme_preference", "dark"),
        "notifications_enabled": user_doc.get("notifications_enabled", True),
        "high_risk_alert_threshold": user_doc.get("high_risk_alert_threshold", 50),
        "created_at": created_at,
    }


@router.post("/login")
def login(payload: LoginRequest):
    identifier = payload.identifier.lower()
    try:
        user = users_collection.find_one(
            {"$or": [{"email": identifier}, {"username": payload.identifier}]}
        )
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        ) from None

    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    token_claims = {
        "sub": user["username"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user.get("full_name", user["username"]),
        "role": user.get("role", "analyst"),
    }
    access_token = create_access_token(token_claims)

    return {
        "success": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": _public_user(user),
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    user_doc = {
        "username": payload.username,
        "email": payload.email.lower(),
        "full_name": payload.full_name,
        "role": "analyst",
        "organization": payload.organization,
        "password_hash": hash_password(payload.password),
        "theme_preference": "dark",
        "notifications_enabled": True,
        "high_risk_alert_threshold": 50,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        users_collection.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already registered",
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to register user",
        ) from None

    access_token = create_access_token(
        {
            "sub": user_doc["username"],
            "username": user_doc["username"],
            "email": user_doc["email"],
            "full_name": user_doc["full_name"],
            "role": user_doc["role"],
        }
    )

    return {
        "success": True,
        "message": "Account registered successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": _public_user(user_doc),
    }


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    try:
        user = users_collection.find_one({"username": current_user["username"]})
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load user profile",
        ) from None

    if not user:
        return {
            "success": True,
            "user": {
                "username": current_user["username"],
                "email": current_user.get("email", "analyst@creditrisk.ai"),
                "full_name": current_user.get("full_name", "Risk Analyst"),
                "role": current_user.get("role", "analyst"),
                "organization": "CreditRisk AI",
                "theme_preference": "dark",
                "notifications_enabled": True,
                "high_risk_alert_threshold": 50,
            },
        }

    return {"success": True, "user": _public_user(user)}


@router.patch("/me")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No profile fields provided to update",
        )

    updates["updated_at"] = datetime.now(timezone.utc)
    try:
        updated = users_collection.find_one_and_update(
            {"username": current_user["username"]},
            {"$set": updates},
            return_document=True,
        )
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to update user profile",
        ) from None

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": _public_user(updated),
    }


@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        user = users_collection.find_one({"username": current_user["username"]})
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify user credentials",
        ) from None

    if not user or not verify_password(
        payload.current_password, user.get("password_hash", "")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    try:
        users_collection.update_one(
            {"username": current_user["username"]},
            {
                "$set": {
                    "password_hash": hash_password(payload.new_password),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to update password",
        ) from None

    return {"success": True, "message": "Password updated successfully"}
