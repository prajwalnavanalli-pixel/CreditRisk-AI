
"""Database initialization for CreditRisk AI."""

import os
from datetime import datetime, timezone

from pymongo.errors import PyMongoError

from api.app.database import (
    ensure_database_indexes,
    settings_collection,
    users_collection,
)
from api.app.security import hash_password


DEFAULT_USERS = [
    {
        "username": "admin",
        "email": "admin@creditrisk.ai",
        "full_name": "Risk Administrator",
        "role": "admin",
        "organization": "CreditRisk AI Institutional",
        "password_env": "BOOTSTRAP_ADMIN_PASSWORD",
    },
    {
        "username": "analyst",
        "email": "analyst@creditrisk.ai",
        "full_name": "Senior Risk Analyst",
        "role": "analyst",
        "organization": "CreditRisk AI Underwriting",
        "password_env": "BOOTSTRAP_ANALYST_PASSWORD",
    },
]

DEFAULT_SYSTEM_SETTINGS = {
    "key": "global_risk_config",
    "low_risk_max_threshold": 0.20,
    "medium_risk_max_threshold": 0.50,
    "high_risk_alert_enabled": True,
    "active_model": "random_forest",
    "updated_at": datetime.now(timezone.utc),
}


def seed_defaults() -> None:
    """Seed initial users and system settings if missing."""
    try:
        for user in DEFAULT_USERS:
            password = os.getenv(user["password_env"], "").strip()

            if not password:
                print(
                    f"Skipping bootstrap user {user['username']}: "
                    f"{user['password_env']} is not configured."
                )
                continue

            existing = users_collection.find_one(
                {"email": user["email"]}
            )

            if not existing:
                users_collection.insert_one(
                    {
                        "username": user["username"],
                        "email": user["email"],
                        "full_name": user["full_name"],
                        "role": user["role"],
                        "organization": user["organization"],
                        "password_hash": hash_password(password),
                        "theme_preference": "dark",
                        "notifications_enabled": True,
                        "high_risk_alert_threshold": 50,
                        "created_at": datetime.now(timezone.utc),
                    }
                )

        if not settings_collection.find_one(
            {"key": "global_risk_config"}
        ):
            settings_collection.insert_one(
                DEFAULT_SYSTEM_SETTINGS.copy()
            )

    except PyMongoError as error:
        print("Database seed warning:", error)


def init_database() -> dict[str, bool]:
    """Verify indexes and initialize baseline records."""
    result = ensure_database_indexes()
    seed_defaults()
    return result


if __name__ == "__main__":
    status = init_database()
    print("Database initialization result:", status)
