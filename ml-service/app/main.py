from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .model import train_and_predict
from .schemas import HealthResponse, PredictionResponse, TrainingRequest

app = FastAPI(title="TalentLens ML Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="TalentLens ML Service",
        model="LogisticRegression + sklearn Pipeline",
    )


@app.post("/train-and-predict", response_model=PredictionResponse)
def train_and_predict_endpoint(request: TrainingRequest) -> PredictionResponse:
    if not request.records:
        raise HTTPException(status_code=400, detail="No training records were supplied.")

    result = train_and_predict([record.model_dump() for record in request.records])
    if result["status"] == "insufficient_data":
        return PredictionResponse(
            status="insufficient_data",
            message=result["message"],
        )

    return PredictionResponse(
        status="ok",
        message=result["message"],
        model=result["model"],
        predictions=result["predictions"],
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("ML_SERVICE_PORT", "8000")),
        reload=False,
    )
