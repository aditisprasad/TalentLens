from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .preprocessing import prepare_attrition_frame


def build_model_pipeline() -> Pipeline:
    numeric_features = [
        "tenure_years",
        "salary",
        "performance_rating",
        "satisfaction_score",
        "workload_score",
        "overtime_hours",
        "promotion_count",
        "manager_changes",
    ]
    categorical_features = [
        "department",
        "job_title",
        "location",
        "employment_type",
    ]

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, numeric_features),
            ("categorical", categorical_transformer, categorical_features),
        ],
        remainder="drop",
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=2000, random_state=42, class_weight="balanced")),
        ]
    )


def _risk_category(probability: float) -> str:
    if probability >= 0.55:
        return "HIGH"
    if probability >= 0.32:
        return "MEDIUM"
    return "LOW"


def train_and_predict(records: list[dict[str, Any]]):
    df = prepare_attrition_frame(records)
    if df.empty:
        return {
            "status": "insufficient_data",
            "message": "Attrition prediction unavailable — insufficient historical exit data.",
        }

    required_columns = [
        "employee_id",
        "employee_code",
        "full_name",
        "department",
        "job_title",
        "location",
        "employment_type",
        "tenure_years",
        "salary",
        "performance_rating",
        "satisfaction_score",
        "workload_score",
        "overtime_hours",
        "promotion_count",
        "manager_changes",
        "attrition_label",
    ]

    missing = [column for column in required_columns if column not in df.columns]
    if missing:
        return {
            "status": "insufficient_data",
            "message": "Attrition prediction unavailable — required employee features are missing.",
        }

    df = df.dropna(subset=["attrition_label"]).copy()
    if df.empty:
        return {
            "status": "insufficient_data",
            "message": "Attrition prediction unavailable — insufficient historical exit data.",
        }

    y = df["attrition_label"].astype(int)
    if y.nunique() < 2:
        return {
            "status": "insufficient_data",
            "message": "Attrition prediction unavailable — both active and exited classes are required to train the model.",
        }

    feature_columns = [
        "tenure_years",
        "salary",
        "performance_rating",
        "satisfaction_score",
        "workload_score",
        "overtime_hours",
        "promotion_count",
        "manager_changes",
        "department",
        "job_title",
        "location",
        "employment_type",
    ]

    X = df[feature_columns]
    if X.isnull().all().all():
        return {
            "status": "insufficient_data",
            "message": "Attrition prediction unavailable — required employee features are missing.",
        }

    if len(df) < 30 or y.value_counts().min() < 8:
        return {
            "status": "insufficient_data",
            "message": "Attrition prediction unavailable — insufficient historical exit data.",
        }

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline = build_model_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_proba)) if len(np.unique(y_test)) > 1 else None,
    }

    predict_df = df[feature_columns].copy()
    model_probs = pipeline.predict_proba(predict_df)[:, 1]
    transformed_names = pipeline.named_steps["preprocessor"].get_feature_names_out().tolist()

    predictions = []
    for _, row in df.iterrows():
        record_idx = row.name
        if isinstance(record_idx, int):
            record = df.loc[record_idx]
        else:
            record = row

        probability = float(model_probs[df.index.get_loc(record_idx)])
        category = _risk_category(probability)
        transformed_row = pipeline.named_steps["preprocessor"].transform(predict_df.loc[[record_idx]])
        feature_contrib = []
        if hasattr(pipeline.named_steps["classifier"], "coef_"):
            coef_vector = np.asarray(pipeline.named_steps["classifier"].coef_).reshape(-1, transformed_row.shape[1])
            score = coef_vector[0] * transformed_row[0]
            top = np.argsort(np.abs(score))[-5:][::-1]
            for idx in top:
                name = transformed_names[idx]
                value = float(score[idx])
                feature_contrib.append(
                    {
                        "feature": name,
                        "contribution": round(value, 6),
                        "direction": "higher_risk" if value > 0 else "lower_risk",
                    }
                )

        predictions.append(
            {
                "employee_id": str(record["employee_id"]),
                "employee_code": str(record["employee_code"]),
                "full_name": str(record["full_name"]),
                "probability": round(float(probability), 6),
                "risk_category": category,
                "primary_factor_summary": feature_contrib[0]["feature"] if feature_contrib else None,
                "feature_contributions": feature_contrib,
            }
        )

    return {
        "status": "ok",
        "message": "Attrition risk model trained successfully.",
        "model": {
            "model_type": "LogisticRegression",
            "training_timestamp": datetime.now(timezone.utc).isoformat(),
            "training_samples": int(len(X_train)),
            "positive_examples": int(y_train.sum()),
            "negative_examples": int((1 - y_train).sum()),
            "feature_count": int(len(transformed_names)),
            "class_balance": float(y_train.mean()),
            "status": "trained",
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1_score": metrics["f1_score"],
            "roc_auc": metrics["roc_auc"],
        },
        "predictions": predictions,
    }
