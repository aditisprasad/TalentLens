from __future__ import annotations

from app.model import train_and_predict


def _employee_records(total=40, exits=12):
    records = []
    for idx in range(total):
        is_exited = idx < exits
        records.append(
            {
                "employee_id": f"emp-{idx}",
                "employee_code": f"EMP-{idx:04d}",
                "full_name": f"Person {idx}",
                "department": "Engineering" if idx % 2 == 0 else "Sales",
                "job_title": "Engineer" if idx % 2 == 0 else "Manager",
                "location": "Bengaluru" if idx % 3 == 0 else "London",
                "employment_type": "Full-time",
                "tenure_years": 1.2 + (idx % 5) * 0.8,
                "salary": 80000 + idx * 1500,
                "performance_rating": 2.6 if is_exited else 4.1,
                "satisfaction_score": 2.2 if is_exited else 4.3,
                "workload_score": 7.6 if is_exited else 5.2,
                "overtime_hours": 18 if is_exited else 6,
                "promotion_count": 0 if is_exited else 1,
                "manager_changes": 2 if is_exited else 0,
                "attrition_label": 1 if is_exited else 0,
            }
        )
    return records


def test_insufficient_historical_data_returns_structured_error():
    result = train_and_predict(_employee_records(total=12, exits=2))
    assert result["status"] == "insufficient_data"
    assert "insufficient" in result["message"].lower()


def test_valid_training_dataset_trains_and_returns_predictions():
    result = train_and_predict(_employee_records(total=40, exits=12))
    assert result["status"] == "ok"
    assert result["model"]["status"] == "trained"
    assert result["predictions"]
    assert {item["risk_category"] for item in result["predictions"]}.issubset({"LOW", "MEDIUM", "HIGH"})


def test_explainability_outputs_model_features():
    result = train_and_predict(_employee_records(total=50, exits=16))
    assert result["status"] == "ok"
    first = result["predictions"][0]
    assert first["feature_contributions"]
    assert first["feature_contributions"][0]["feature"]


def test_missing_numeric_values_are_handled():
    records = _employee_records(total=30, exits=9)
    records[0]["satisfaction_score"] = None
    records[0]["salary"] = None
    result = train_and_predict(records)
    assert result["status"] == "ok"
    assert result["predictions"]
