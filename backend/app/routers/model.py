import os
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Dict, Any

from backend.app.db.database import get_db
from backend.app.db.models import Train, RouteSection, TrainLocation
from ml.predict import predict_hybrid_section_time

router = APIRouter(prefix="/api", tags=["Model Evaluation & Breakdown"])

METRICS_PATH = "data/model_metrics.json"

@router.get("/model/metrics")
def get_model_metrics():
    """
    Returns comparative performance evaluation metrics (MAE, RMSE, R²) for:
    1. Mathematical baseline
    2. XGBoost-only direct model
    3. Hybrid Mathematical + XGBoost model
    Clearly labeled with synthetic data tags.
    """
    if not os.path.exists(METRICS_PATH):
        from ml.train_model import train_and_evaluate_models
        train_and_evaluate_models()

    if not os.path.exists(METRICS_PATH):
        raise HTTPException(status_code=500, detail="Model metrics unavailable")

    with open(METRICS_PATH, "r") as f:
        metrics = json.load(f)

    return metrics

@router.get("/trains/{train_number}/model-breakdown")
def get_train_model_breakdown(train_number: str, db: Session = Depends(get_db)):
    """
    Returns granular prediction breakdown for a coaching train across all sections:
    - mathematical baseline
    - XGBoost correction
    - final prediction
    """
    train = db.query(Train).filter(Train.train_number == train_number).first()
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_number} not found")

    loc = db.query(TrainLocation).filter(TrainLocation.train_id == train.id).order_by(TrainLocation.timestamp.desc()).first()
    current_speed = loc.speed_kmh if loc else 85.0
    current_delay = loc.delay_minutes if loc else 0.0

    sections = db.query(RouteSection).options(
        joinedload(RouteSection.from_station),
        joinedload(RouteSection.to_station)
    ).filter(RouteSection.route_id == train.route_id).order_by(RouteSection.sequence_order).all()

    section_breakdowns = []
    total_math_min = 0.0
    total_xgboost_corr_min = 0.0
    total_final_pred_min = 0.0

    for sec in sections:
        breakdown = predict_hybrid_section_time(
            distance_km=sec.distance_km,
            speed_kmh=current_speed,
            max_speed_kmh=sec.max_speed_kmh,
            dwell_min=sec.min_dwell_minutes,
            features={
                "scheduled_travel_min": (sec.distance_km / sec.max_speed_kmh) * 60.0,
                "current_delay_min": current_delay,
                "prev_delay_min": current_delay,
                "weather_condition": "Clear"
            }
        )

        total_math_min += breakdown["mathematical_baseline_min"]
        total_xgboost_corr_min += breakdown["xgboost_correction_min"]
        total_final_pred_min += breakdown["final_predicted_min"]

        section_breakdowns.append({
            "section_id": sec.id,
            "section_name": f"{sec.from_station.code} → {sec.to_station.code}",
            "distance_km": sec.distance_km,
            "mathematical_baseline_min": breakdown["mathematical_baseline_min"],
            "xgboost_correction_min": breakdown["xgboost_correction_min"],
            "final_predicted_min": breakdown["final_predicted_min"]
        })

    return {
        "train_number": train.train_number,
        "train_name": train.train_name,
        "current_speed_kmh": current_speed,
        "current_delay_min": current_delay,
        "overall_breakdown": {
            "mathematical_baseline": round(total_math_min, 2),
            "xgboost_correction": round(total_xgboost_corr_min, 2),
            "final_prediction": round(total_final_pred_min, 2)
        },
        "sections": section_breakdowns
    }
