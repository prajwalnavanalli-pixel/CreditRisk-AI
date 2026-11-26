import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import shap


# 1. Project paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"


# 2. Load trained Random Forest model and feature schema
model = joblib.load(MODEL_DIR / "random_forest.pkl")

with open(MODEL_DIR / "feature_columns.json", "r", encoding="utf-8") as file:
    feature_columns: list[str] = json.load(file)

_explainer: shap.TreeExplainer | None = None

FEATURE_LABELS: dict[str, str] = {
    "LIMIT_BAL": "Credit Limit",
    "SEX": "Gender",
    "EDUCATION": "Education",
    "MARRIAGE": "Marital Status",
    "AGE": "Age",
    "PAY_0": "Repayment Status (Sep)",
    "PAY_2": "Repayment Status (Aug)",
    "PAY_3": "Repayment Status (Jul)",
    "PAY_4": "Repayment Status (Jun)",
    "PAY_5": "Repayment Status (May)",
    "PAY_6": "Repayment Status (Apr)",
    "BILL_AMT1": "Bill Statement (Sep)",
    "BILL_AMT2": "Bill Statement (Aug)",
    "BILL_AMT3": "Bill Statement (Jul)",
    "BILL_AMT4": "Bill Statement (Jun)",
    "BILL_AMT5": "Bill Statement (May)",
    "BILL_AMT6": "Bill Statement (Apr)",
    "PAY_AMT1": "Payment Amount (Sep)",
    "PAY_AMT2": "Payment Amount (Aug)",
    "PAY_AMT3": "Payment Amount (Jul)",
    "PAY_AMT4": "Payment Amount (Jun)",
    "PAY_AMT5": "Payment Amount (May)",
    "PAY_AMT6": "Payment Amount (Apr)",
}


def _get_explainer() -> shap.TreeExplainer:
    global _explainer
    if _explainer is None:
        _explainer = shap.TreeExplainer(model)
    return _explainer


def _build_feature_frame(applicant_data: dict[str, Any]) -> pd.DataFrame:
    missing = [col for col in feature_columns if col not in applicant_data]
    if missing:
        raise KeyError(f"Missing required model features: {missing}")
    return pd.DataFrame([applicant_data], columns=feature_columns)


def _classify_risk(probability: float) -> str:
    if probability < 0.20:
        return "Low"
    if probability < 0.50:
        return "Medium"
    return "High"


# 3. Prediction function
def predict_credit_risk(applicant_data: dict[str, Any]) -> dict[str, Any]:
    applicant_df = _build_feature_frame(applicant_data)

    probability = float(model.predict_proba(applicant_df)[0][1])
    prediction = int(model.predict(applicant_df)[0])
    risk_category = _classify_risk(probability)

    return {
        "default_prediction": prediction,
        "default_probability": round(probability, 4),
        "risk_percentage": round(probability * 100, 2),
        "risk_category": risk_category,
    }


def explain_credit_risk(
    applicant_data: dict[str, Any], top_k: int = 10
) -> dict[str, Any]:
    """Compute per-applicant SHAP feature contributions for class 1 (default)."""
    applicant_df = _build_feature_frame(applicant_data)
    explainer = _get_explainer()
    shap_values = explainer.shap_values(applicant_df)

    if isinstance(shap_values, list):
        class1_shap = np.asarray(shap_values[1])[0]
    elif getattr(shap_values, "ndim", 0) == 3:
        class1_shap = np.asarray(shap_values)[0, :, 1]
    else:
        class1_shap = np.asarray(shap_values)[0]

    expected_value = explainer.expected_value
    if isinstance(expected_value, (list, np.ndarray)):
        base_value = float(np.asarray(expected_value).ravel()[-1])
    else:
        base_value = float(expected_value)

    contributions = []
    for col, raw_shap in zip(feature_columns, class1_shap):
        shap_num = float(raw_shap)
        contributions.append(
            {
                "feature": col,
                "label": FEATURE_LABELS.get(col, col),
                "value": float(applicant_data[col]),
                "shap_value": round(shap_num, 5),
                "abs_shap": round(abs(shap_num), 5),
                "impact": "increases_risk" if shap_num >= 0 else "decreases_risk",
            }
        )

    contributions.sort(key=lambda item: item["abs_shap"], reverse=True)

    return {
        "base_value": round(base_value, 5),
        "top_drivers": contributions[:top_k],
        "all_contributions": contributions,
    }


def predict_with_explanation(applicant_data: dict[str, Any]) -> dict[str, Any]:
    result = predict_credit_risk(applicant_data)
    result["shap_explanation"] = explain_credit_risk(applicant_data, top_k=10)
    return result


# 4. Test applicant
if __name__ == "__main__":
    sample_applicant = {
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

    result = predict_with_explanation(sample_applicant)

    print("\n========== CREDIT RISK PREDICTION ==========")
    print(json.dumps(result, indent=4))
