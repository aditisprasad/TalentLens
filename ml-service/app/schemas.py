from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, ConfigDict


class AttritionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employee_id: str = Field(..., description="Organization-scoped employee identifier")
    employee_code: str = Field(..., description="Employee code")
    full_name: str = Field(..., description="Employee full name")
    department: str | None = None
    job_title: str | None = None
    location: str | None = None
    employment_type: str | None = None
    tenure_years: float | None = None
    salary: float | None = None
    performance_rating: float | None = None
    satisfaction_score: float | None = None
    workload_score: float | None = None
    overtime_hours: float | None = None
    promotion_count: int | None = None
    manager_changes: int | None = None
    attrition_label: int | None = Field(
        default=None,
        description="Historical attrition label: 1 for exited, 0 for active",
    )


class TrainingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    organization_id: str = Field(..., description="Authenticated organization id")
    records: list[AttritionRecord] = Field(..., min_length=1)


class InsufficientDataResponse(BaseModel):
    status: Literal["insufficient_data"] = "insufficient_data"
    message: str


class FeatureContribution(BaseModel):
    feature: str
    contribution: float
    direction: Literal["higher_risk", "lower_risk"]


class PredictionScore(BaseModel):
    employee_id: str
    employee_code: str
    full_name: str
    probability: float
    risk_category: Literal["LOW", "MEDIUM", "HIGH"]
    primary_factor_summary: str | None = None
    feature_contributions: list[FeatureContribution] = Field(default_factory=list)


class ModelMetadata(BaseModel):
    model_type: str
    training_timestamp: str
    training_samples: int
    positive_examples: int
    negative_examples: int
    feature_count: int
    class_balance: float
    status: Literal["trained", "insufficient_data"]
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1_score: float | None = None
    roc_auc: float | None = None


class PredictionResponse(BaseModel):
    status: Literal["ok", "insufficient_data"]
    message: str
    model: ModelMetadata | None = None
    predictions: list[PredictionScore] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    model: str
