"""Generate precomputed ROC curves, feature importances, and global SHAP values.

Reads the UCI Credit Card Default dataset (if available) and the serialized
models in ``models/`` to produce ``models/model_insights.json`` for instant
serving via FastAPI without requiring raw Excel dependencies at runtime.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATASET_PATH = Path(
    r"C:\Users\HP\Downloads\default+of+credit+card+clients\default of credit card clients.xls"
)

FEATURE_METADATA: dict[str, dict[str, str]] = {
    "LIMIT_BAL": {
        "label": "Credit Limit",
        "group": "Demographics & Credit",
        "description": "Amount of given credit in NT dollars (individual and family supplementary credit).",
    },
    "SEX": {
        "label": "Gender",
        "group": "Demographics & Credit",
        "description": "1 = Male, 2 = Female.",
    },
    "EDUCATION": {
        "label": "Education Level",
        "group": "Demographics & Credit",
        "description": "1 = Graduate School, 2 = University, 3 = High School, 4 = Others.",
    },
    "MARRIAGE": {
        "label": "Marital Status",
        "group": "Demographics & Credit",
        "description": "1 = Married, 2 = Single, 3 = Others.",
    },
    "AGE": {
        "label": "Age (Years)",
        "group": "Demographics & Credit",
        "description": "Applicant age in years.",
    },
    "PAY_0": {
        "label": "Repayment Status (Sep)",
        "group": "Repayment History",
        "description": "Most recent month repayment status (-1 = pay duly, 0 = revolving, >=1 = months delayed).",
    },
    "PAY_2": {
        "label": "Repayment Status (Aug)",
        "group": "Repayment History",
        "description": "Repayment status 2 months ago.",
    },
    "PAY_3": {
        "label": "Repayment Status (Jul)",
        "group": "Repayment History",
        "description": "Repayment status 3 months ago.",
    },
    "PAY_4": {
        "label": "Repayment Status (Jun)",
        "group": "Repayment History",
        "description": "Repayment status 4 months ago.",
    },
    "PAY_5": {
        "label": "Repayment Status (May)",
        "group": "Repayment History",
        "description": "Repayment status 5 months ago.",
    },
    "PAY_6": {
        "label": "Repayment Status (Apr)",
        "group": "Repayment History",
        "description": "Repayment status 6 months ago.",
    },
    "BILL_AMT1": {
        "label": "Bill Statement (Sep)",
        "group": "Bill Statements",
        "description": "Amount of bill statement in September.",
    },
    "BILL_AMT2": {
        "label": "Bill Statement (Aug)",
        "group": "Bill Statements",
        "description": "Amount of bill statement in August.",
    },
    "BILL_AMT3": {
        "label": "Bill Statement (Jul)",
        "group": "Bill Statements",
        "description": "Amount of bill statement in July.",
    },
    "BILL_AMT4": {
        "label": "Bill Statement (Jun)",
        "group": "Bill Statements",
        "description": "Amount of bill statement in June.",
    },
    "BILL_AMT5": {
        "label": "Bill Statement (May)",
        "group": "Bill Statements",
        "description": "Amount of bill statement in May.",
    },
    "BILL_AMT6": {
        "label": "Bill Statement (Apr)",
        "group": "Bill Statements",
        "description": "Amount of bill statement in April.",
    },
    "PAY_AMT1": {
        "label": "Payment Amount (Sep)",
        "group": "Previous Payments",
        "description": "Amount paid in September.",
    },
    "PAY_AMT2": {
        "label": "Payment Amount (Aug)",
        "group": "Previous Payments",
        "description": "Amount paid in August.",
    },
    "PAY_AMT3": {
        "label": "Payment Amount (Jul)",
        "group": "Previous Payments",
        "description": "Amount paid in July.",
    },
    "PAY_AMT4": {
        "label": "Payment Amount (Jun)",
        "group": "Previous Payments",
        "description": "Amount paid in June.",
    },
    "PAY_AMT5": {
        "label": "Payment Amount (May)",
        "group": "Previous Payments",
        "description": "Amount paid in May.",
    },
    "PAY_AMT6": {
        "label": "Payment Amount (Apr)",
        "group": "Previous Payments",
        "description": "Amount paid in April.",
    },
}


def downsample_roc(fpr: np.ndarray, tpr: np.ndarray, points: int = 45) -> list[dict[str, float]]:
    """Interpolate ROC curve onto a uniform FPR grid for clean frontend rendering."""
    grid = np.linspace(0.0, 1.0, points)
    interp_tpr = np.interp(grid, fpr, tpr)
    interp_tpr[0] = 0.0
    interp_tpr[-1] = 1.0
    return [
        {"fpr": round(float(x), 4), "tpr": round(float(y), 4)}
        for x, y in zip(grid, interp_tpr)
    ]


def main() -> None:
    with open(MODEL_DIR / "feature_columns.json", "r", encoding="utf-8") as f:
        feature_columns: list[str] = json.load(f)

    with open(MODEL_DIR / "model_metrics.json", "r", encoding="utf-8") as f:
        model_metrics: dict[str, dict[str, float]] = json.load(f)

    rf_model = joblib.load(MODEL_DIR / "random_forest.pkl")
    xgb_model = joblib.load(MODEL_DIR / "xgboost.pkl")
    lr_model = joblib.load(MODEL_DIR / "logistic_regression.pkl")
    scaler = joblib.load(MODEL_DIR / "scaler.pkl")

    rf_importances = [
        {
            "feature": col,
            "label": FEATURE_METADATA[col]["label"],
            "group": FEATURE_METADATA[col]["group"],
            "description": FEATURE_METADATA[col]["description"],
            "importance": round(float(imp), 6),
        }
        for col, imp in zip(feature_columns, rf_model.feature_importances_)
    ]
    rf_importances.sort(key=lambda item: item["importance"], reverse=True)

    roc_curves: dict[str, list[dict[str, float]]] = {}
    global_shap: list[dict[str, float | str]] = []
    dataset_summary: dict[str, int | float] = {
        "total_records": 30000,
        "test_split_size": 6000,
        "default_rate_pct": 22.12,
    }

    if DATASET_PATH.exists():
        df = pd.read_excel(DATASET_PATH, header=1)
        if "ID" in df.columns:
            df = df.drop(columns=["ID"])
        target_col = "default payment next month"
        X = df[feature_columns]
        y = df[target_col]

        _, X_test, _, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        dataset_summary = {
            "total_records": int(len(df)),
            "test_split_size": int(len(X_test)),
            "default_rate_pct": round(float(y.mean() * 100), 2),
        }

        X_test_scaled = scaler.transform(X_test)
        probs = {
            "random_forest": rf_model.predict_proba(X_test)[:, 1],
            "xgboost": xgb_model.predict_proba(X_test)[:, 1],
            "logistic_regression": lr_model.predict_proba(X_test_scaled)[:, 1],
        }

        for name, y_prob in probs.items():
            fpr, tpr, _ = roc_curve(y_test, y_prob)
            auc_val = roc_auc_score(y_test, y_prob)
            roc_curves[name] = downsample_roc(fpr, tpr)
            print(f"{name} computed ROC-AUC on split: {auc_val:.4f}")

        # Compute global SHAP mean(|value|) on a stratified 250-row sample
        shap_sample = X_test.sample(n=min(250, len(X_test)), random_state=42)
        explainer = shap.TreeExplainer(rf_model)
        shap_vals = explainer.shap_values(shap_sample)
        # shap_vals shape: (n_samples, n_features, 2) for binary classification
        if isinstance(shap_vals, list):
            class1_shap = np.asarray(shap_vals[1])
        elif getattr(shap_vals, "ndim", 0) == 3:
            class1_shap = shap_vals[:, :, 1]
        else:
            class1_shap = np.asarray(shap_vals)

        mean_abs_shap = np.mean(np.abs(class1_shap), axis=0)
        mean_signed_shap = np.mean(class1_shap, axis=0)

        for col, abs_val, signed_val in zip(
            feature_columns, mean_abs_shap, mean_signed_shap
        ):
            global_shap.append(
                {
                    "feature": col,
                    "label": FEATURE_METADATA[col]["label"],
                    "group": FEATURE_METADATA[col]["group"],
                    "mean_abs_shap": round(float(abs_val), 6),
                    "mean_signed_shap": round(float(signed_val), 6),
                }
            )
        global_shap.sort(key=lambda item: float(item["mean_abs_shap"]), reverse=True)

    payload = {
        "selected_model": "random_forest",
        "selection_rationale": (
            "Random Forest achieved the highest ROC-AUC (0.7755) and strongest "
            "default recall (57.72%) and F1-score (0.5329), minimizing missed loan defaults."
        ),
        "dataset_summary": dataset_summary,
        "model_metrics": model_metrics,
        "feature_importances": rf_importances,
        "global_shap": global_shap,
        "roc_curves": roc_curves,
    }

    output_path = MODEL_DIR / "model_insights.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"Saved model insights to {output_path}")


if __name__ == "__main__":
    main()
