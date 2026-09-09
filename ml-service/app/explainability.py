from __future__ import annotations

import numpy as np


def summarize_features(model: Any, transformed_features: list[str], row: np.ndarray) -> list[dict[str, object]]:
    """Return the strongest model-driven feature contributions for a single prediction."""
    if model is None:
        return []

    coef = getattr(model, "coef_", None)
    if coef is None or len(coef) == 0:
        return []

    coefficients = np.asarray(coef).reshape(-1, len(transformed_features))
    feature_scores = coefficients[0] * row
    top = np.argsort(np.abs(feature_scores))[-5:][::-1]

    contributions: list[dict[str, object]] = []
    for idx in top:
        feature_name = transformed_features[idx]
        weight = float(feature_scores[idx])
        contributions.append(
            {
                "feature": feature_name,
                "contribution": round(weight, 6),
                "direction": "higher_risk" if weight > 0 else "lower_risk",
            }
        )

    return contributions
