
import os
import sys
from pathlib import Path

# Use an isolated test database.
# Production records are never touched.
os.environ["MONGO_DB_NAME"] = "creditrisk_ai_test"
os.environ["AUTH_REQUIRED"] = "true"

# Test-only security credentials. Never use these in production.
os.environ["JWT_SECRET"] = (
    "pytest-creditrisk-test-secret-32-bytes-minimum"
)
os.environ["BOOTSTRAP_ADMIN_PASSWORD"] = (
    "test-only-admin-password-2026"
)
os.environ["BOOTSTRAP_ANALYST_PASSWORD"] = (
    "test-only-analyst-password-2026"
)

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
from fastapi.testclient import TestClient

from api.app.database import client as mongo_client
from api.app.main import app


# Test account credentials
ADMIN_EMAIL = "admin@creditrisk.ai"
ADMIN_PASSWORD = os.environ["BOOTSTRAP_ADMIN_PASSWORD"]

ANALYST_EMAIL = "analyst@creditrisk.ai"
ANALYST_PASSWORD = os.environ["BOOTSTRAP_ANALYST_PASSWORD"]


SAMPLE_23_FEATURES = {
    "LIMIT_BAL": 50000,
    "SEX": 2,
    "EDUCATION": 2,
    "MARRIAGE": 1,
    "AGE": 29,
    "PAY_0": 2,
    "PAY_2": 2,
    "PAY_3": 0,
    "PAY_4": 0,
    "PAY_5": 0,
    "PAY_6": 0,
    "BILL_AMT1": 40000,
    "BILL_AMT2": 35000,
    "BILL_AMT3": 30000,
    "BILL_AMT4": 25000,
    "BILL_AMT5": 20000,
    "BILL_AMT6": 15000,
    "PAY_AMT1": 2000,
    "PAY_AMT2": 2500,
    "PAY_AMT3": 3000,
    "PAY_AMT4": 3500,
    "PAY_AMT5": 4000,
    "PAY_AMT6": 4500,
}


@pytest.fixture(scope="module")
def api_client():
    # Drop only the isolated test database.
    mongo_client.drop_database("creditrisk_ai_test")

    with TestClient(app) as test_client:
        yield test_client

    # Clean up test data after execution.
    mongo_client.drop_database("creditrisk_ai_test")


def _auth_header(
    client: TestClient,
    identifier: str,
    password: str,
) -> dict[str, str]:

    resp = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": identifier,
            "password": password,
        },
    )

    assert resp.status_code == 200

    token = resp.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}"
    }


def test_health_and_root_are_public(api_client: TestClient):

    root = api_client.get("/")

    assert root.status_code == 200
    assert root.json()["success"] is True

    health = api_client.get("/health")

    assert health.status_code == 200
    assert health.json()["api_status"] == "running"
    assert health.json()["database_status"] == "connected"


def test_protected_routes_reject_unauthenticated(
    api_client: TestClient,
):

    protected_paths = [
        "/api/v1/applicants/",
        "/api/v1/predictions/history",
        "/api/v1/analytics/summary",
        "/api/v1/models/insights",
        "/api/v1/settings/system",
    ]

    for path in protected_paths:
        response = api_client.get(path)
        assert response.status_code == 401


def test_login_and_rbac_protection(api_client: TestClient):

    analyst_headers = _auth_header(
        api_client,
        ANALYST_EMAIL,
        ANALYST_PASSWORD,
    )

    admin_headers = _auth_header(
        api_client,
        ADMIN_EMAIL,
        ADMIN_PASSWORD,
    )

    me_res = api_client.get(
        "/api/v1/auth/me",
        headers=analyst_headers,
    )

    assert me_res.status_code == 200
    assert me_res.json()["user"]["role"] == "analyst"

    # Analyst cannot update admin system thresholds.
    forbidden = api_client.put(
        "/api/v1/settings/system",
        headers=analyst_headers,
        json={
            "low_risk_max_threshold": 0.25,
            "medium_risk_max_threshold": 0.55,
            "high_risk_alert_enabled": True,
        },
    )

    assert forbidden.status_code == 403

    # Admin can update system thresholds.
    allowed = api_client.put(
        "/api/v1/settings/system",
        headers=admin_headers,
        json={
            "low_risk_max_threshold": 0.20,
            "medium_risk_max_threshold": 0.50,
            "high_risk_alert_enabled": True,
        },
    )

    assert allowed.status_code == 200
    assert allowed.json()["success"] is True


def test_applicant_crud_and_validation(api_client: TestClient):

    headers = _auth_header(
        api_client,
        ANALYST_EMAIL,
        ANALYST_PASSWORD,
    )

    # Invalid inputs.
    invalid_res = api_client.post(
        "/api/v1/applicants/",
        headers=headers,
        json={
            "applicant_id": "CR900",
            "credit_limit": -500,
            "age": 15,
            "education": 2,
            "marital_status": 1,
        },
    )

    assert invalid_res.status_code == 422

    # Valid registration.
    create_res = api_client.post(
        "/api/v1/applicants/",
        headers=headers,
        json={
            "applicant_id": "CR003",
            "full_name": "Test Applicant CR003",
            "credit_limit": 85000,
            "age": 29,
            "education": 2,
            "marital_status": 1,
        },
    )

    assert create_res.status_code == 201
    assert create_res.json()["applicant"]["applicant_id"] == "CR003"

    # Duplicate ID rejected with 409.
    dup_res = api_client.post(
        "/api/v1/applicants/",
        headers=headers,
        json={
            "applicant_id": "CR003",
            "credit_limit": 85000,
            "age": 29,
            "education": 2,
            "marital_status": 1,
        },
    )

    assert dup_res.status_code == 409

    # Search and list.
    list_res = api_client.get(
        "/api/v1/applicants/?search=CR003",
        headers=headers,
    )

    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1

    # Not found returns 404.
    missing_res = api_client.get(
        "/api/v1/applicants/DOES_NOT_EXIST",
        headers=headers,
    )

    assert missing_res.status_code == 404


def test_prediction_scoring_shap_and_validation(
    api_client: TestClient,
):

    headers = _auth_header(
        api_client,
        ANALYST_EMAIL,
        ANALYST_PASSWORD,
    )

    # Missing required fields -> 422.
    missing_res = api_client.post(
        "/api/v1/predictions/",
        headers=headers,
        json={"LIMIT_BAL": 50000},
    )

    assert missing_res.status_code == 422

    # Unknown applicant ID -> 404.
    unknown_app = api_client.post(
        "/api/v1/predictions/",
        headers=headers,
        json={
            **SAMPLE_23_FEATURES,
            "applicant_id": "UNKNOWN_999",
        },
    )

    assert unknown_app.status_code == 404

    # Valid prediction for registered CR003.
    pred_res = api_client.post(
        "/api/v1/predictions/",
        headers=headers,
        json={
            **SAMPLE_23_FEATURES,
            "applicant_id": "CR003",
        },
    )

    assert pred_res.status_code == 201

    body = pred_res.json()

    assert body["success"] is True
    assert body["applicant_id"] == "CR003"
    assert body["prediction"]["risk_category"] == "High"

    assert body["prediction"]["risk_percentage"] == pytest.approx(
        79.18,
        abs=0.5,
    )

    assert len(
        body["prediction"]["shap_explanation"]["top_drivers"]
    ) == 10

    # History pagination and filter.
    hist_res = api_client.get(
        "/api/v1/predictions/history?page=1&page_size=5&risk_category=High",
        headers=headers,
    )

    assert hist_res.status_code == 200
    assert hist_res.json()["total_records"] >= 1


def test_analytics_model_insights_and_indexes(
    api_client: TestClient,
):

    headers = _auth_header(
        api_client,
        ANALYST_EMAIL,
        ANALYST_PASSWORD,
    )

    analytics = api_client.get(
        "/api/v1/analytics/summary",
        headers=headers,
    )

    assert analytics.status_code == 200
    assert analytics.json()["kpis"]["total_applicants"] >= 1
    assert analytics.json()["kpis"]["total_predictions"] >= 1

    insights = api_client.get(
        "/api/v1/models/insights",
        headers=headers,
    )

    assert insights.status_code == 200

    data = insights.json()

    assert data["selected_model"] == "random_forest"

    assert data["model_metrics"]["random_forest"]["roc_auc"] == pytest.approx(
        0.7755,
        abs=0.001,
    )

    assert len(data["feature_importances"]) == 23

    settings_res = api_client.get(
        "/api/v1/settings/system",
        headers=headers,
    )

    assert settings_res.status_code == 200

    indexes = settings_res.json()["system"]["indexes"]

    assert len(indexes["applicants"]) >= 2
    assert len(indexes["predictions"]) >= 3
