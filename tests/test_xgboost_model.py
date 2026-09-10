import os
import pytest
import pandas as pd
from ml.generate_data import generate_historical_dataset
from ml.feature_engineering import engineer_features, extract_x_y
from ml.train_model import train_and_evaluate_models
from ml.predict import predict_residual, predict_hybrid_section_time

def test_feature_engineering():
    raw_df = generate_historical_dataset(num_records=50)
    X, y, eng_df = extract_x_y(raw_df)
    assert len(X) == 50
    assert "congestion_score" in eng_df.columns
    assert "weather_code" in eng_df.columns
    assert "section_residual_min" in eng_df.columns

def test_model_training_and_metrics():
    metrics = train_and_evaluate_models()
    assert metrics["is_synthetic_data"] is True
    assert "models" in metrics
    assert "hybrid_math_xgboost" in metrics["models"]
    assert "mae" in metrics["models"]["hybrid_math_xgboost"]
    assert os.path.exists("models/eta_xgboost.joblib")

def test_residual_prediction():
    features = {
        "actual_speed_kmh": 80.0,
        "max_speed_kmh": 110.0,
        "distance_km": 60.0,
        "scheduled_travel_min": 45.0,
        "current_delay_min": 10.0,
        "weather_condition": "Clear"
    }
    residual = predict_residual(features)
    assert isinstance(residual, float)

def test_hybrid_prediction_breakdown():
    res = predict_hybrid_section_time(
        distance_km=95.0,
        speed_kmh=95.0,
        max_speed_kmh=130.0,
        dwell_min=3.0,
        features={"current_delay_min": 5.0}
    )
    assert "mathematical_baseline_min" in res
    assert "xgboost_correction_min" in res
    assert "final_predicted_min" in res
    assert res["mathematical_baseline_min"] == 63.0
    # Final = Baseline + Correction
    assert round(res["mathematical_baseline_min"] + res["xgboost_correction_min"], 2) == res["final_predicted_min"]
