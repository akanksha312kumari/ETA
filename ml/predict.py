import os
import joblib
import pandas as pd
import numpy as np
from ml.feature_engineering import FEATURE_COLUMNS, WEATHER_MAPPING

MODEL_PATH = "models/eta_xgboost.joblib"
_cached_model = None

def get_model():
    """Loads and caches the trained XGBoost residual model."""
    global _cached_model
    if _cached_model is not None:
        return _cached_model
    
    if os.path.exists(MODEL_PATH):
        _cached_model = joblib.load(MODEL_PATH)
        return _cached_model
    else:
        # Auto-train if model artifact missing
        from ml.train_model import train_and_evaluate_models
        train_and_evaluate_models()
        _cached_model = joblib.load(MODEL_PATH)
        return _cached_model

def predict_residual(features: dict) -> float:
    """
    Predicts section residual (Actual travel time - Mathematical baseline)
    using trained XGBoost model.
    """
    model = get_model()
    
    # Format input row matching FEATURE_COLUMNS
    weather_str = features.get("weather_condition", "Clear")
    weather_code = WEATHER_MAPPING.get(weather_str, 0)
    
    speed = float(features.get("actual_speed_kmh", 85.0))
    max_sp = float(features.get("max_speed_kmh", 110.0))
    dist = float(features.get("distance_km", 60.0))
    sched_travel = float(features.get("scheduled_travel_min", 45.0))
    curr_delay = float(features.get("current_delay_min", 0.0))
    prev_delay = float(features.get("prev_delay_min", 0.0))
    dwell = float(features.get("actual_dwell_min", 2.0))
    hour = int(features.get("hour_of_day", 14))
    day = int(features.get("day_of_week", 2))
    
    # Derived features
    avg_speed = speed
    congestion = max(0.0, min(1.0, 1.0 - (speed / max(max_sp, 10.0))))

    row_data = {
        "actual_speed_kmh": speed,
        "current_delay_min": curr_delay,
        "distance_km": dist,
        "max_speed_kmh": max_sp,
        "scheduled_travel_min": sched_travel,
        "prev_delay_min": prev_delay,
        "avg_speed_kmh": avg_speed,
        "congestion_score": congestion,
        "actual_dwell_min": dwell,
        "hour_of_day": hour,
        "day_of_week": day,
        "weather_code": weather_code
    }

    df_in = pd.DataFrame([row_data])[FEATURE_COLUMNS]
    predicted_residual = float(model.predict(df_in)[0])
    return round(predicted_residual, 2)

def predict_hybrid_section_time(
    distance_km: float,
    speed_kmh: float,
    max_speed_kmh: float,
    dwell_min: float = 2.0,
    features: dict = None
) -> dict:
    """
    Computes Hybrid Prediction:
    1. Mathematical Baseline T_math
    2. XGBoost Predicted Residual
    3. Final Prediction = T_math + Residual
    """
    if features is None:
        features = {}

    bounded_speed = max(5.0, min(speed_kmh, max_speed_kmh))
    math_baseline = round((distance_km / bounded_speed) * 60.0 + dwell_min, 2)

    features["actual_speed_kmh"] = speed_kmh
    features["max_speed_kmh"] = max_speed_kmh
    features["distance_km"] = distance_km
    features["actual_dwell_min"] = dwell_min

    residual_correction = predict_residual(features)
    final_prediction = round(max(0.1, math_baseline + residual_correction), 2)

    return {
        "mathematical_baseline_min": math_baseline,
        "xgboost_correction_min": residual_correction,
        "final_predicted_min": final_prediction
    }
