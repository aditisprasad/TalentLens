from __future__ import annotations

from typing import Any

import pandas as pd


def prepare_attrition_frame(records: list[dict[str, Any]]) -> pd.DataFrame:
    """Normalize the incoming workforce records into a single ML-safe DataFrame."""
    df = pd.DataFrame(records)

    if df.empty:
        return df

    for column in [
        "tenure_years",
        "salary",
        "performance_rating",
        "satisfaction_score",
        "workload_score",
        "overtime_hours",
        "promotion_count",
        "manager_changes",
    ]:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df["department"] = df["department"].fillna("Unassigned").astype(str)
    df["job_title"] = df["job_title"].fillna("Unspecified").astype(str)
    df["location"] = df["location"].fillna("Unspecified").astype(str)
    df["employment_type"] = df["employment_type"].fillna("Unknown").astype(str)

    if "attrition_label" in df.columns:
        df["attrition_label"] = pd.to_numeric(df["attrition_label"], errors="coerce").astype("Int64")
        df["attrition_label"] = df["attrition_label"].fillna(0)

    return df
