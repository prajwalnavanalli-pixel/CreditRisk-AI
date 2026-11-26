import os
from pathlib import Path
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import PyMongoError
from dotenv import load_dotenv

# Load environment variables from project root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

MONGO_URL = os.getenv(
    "MONGO_URL",
    "mongodb://127.0.0.1:27017/",
)
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "creditrisk_ai")

client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000,
)

db = client[MONGO_DB_NAME]

# MongoDB collections
applicants_collection = db["applicants"]
predictions_collection = db["predictions"]
model_logs_collection = db["model_logs"]
users_collection = db["users"]
settings_collection = db["settings"]


def _ensure_index(collection, keys, **kwargs) -> None:
    """Create index idempotently even if an unnamed index with the same key exists."""
    existing = collection.index_information()
    target_key = list(keys)
    for info in existing.values():
        if info.get("key") == target_key:
            return
    collection.create_index(keys, **kwargs)


def ensure_database_indexes() -> dict[str, bool]:
    """Create and verify required MongoDB indexes idempotently."""
    try:
        _ensure_index(applicants_collection, [("applicant_id", ASCENDING)], unique=True)
        _ensure_index(applicants_collection, [("created_at", DESCENDING)])

        _ensure_index(predictions_collection, [("applicant_id", ASCENDING)])
        _ensure_index(predictions_collection, [("created_at", DESCENDING)])
        _ensure_index(predictions_collection, [("risk_category", ASCENDING)])

        _ensure_index(model_logs_collection, [("created_at", DESCENDING)])
        _ensure_index(model_logs_collection, [("applicant_id", ASCENDING)])

        _ensure_index(users_collection, [("email", ASCENDING)], unique=True)
        _ensure_index(users_collection, [("username", ASCENDING)], unique=True)
        return {"indexes_verified": True}
    except PyMongoError as error:
        print("MongoDB index verification error:", error)
        return {"indexes_verified": False}


def check_database_connection() -> bool:
    try:
        client.admin.command("ping")
        return True
    except PyMongoError as error:
        print("MongoDB connection error:", error)
        return False
