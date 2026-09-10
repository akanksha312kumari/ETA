import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
import xgboost as xgb

from ml.preprocess import load_and_preprocess_data
from ml.feature_engineering import extract_x_y, FEATURE_COLUMNS
from backend.eta_engine.scipy_optimizer import SciPyETAOptimizer

MODEL_SAVE_PATH = "models/eta_xgboost.joblib"
METRICS_SAVE_PATH = "data/model_metrics.json"

def train_and_evaluate_models(data_path: str = "data/historical_train_delays.csv"):
    """
    Trains XGBoost Residual Regressor and evaluates 4 model paradigms:
    1. Mathematical Baseline
    2. XGBoost-only Direct Predictor
    3. Hybrid (Mathematical + XGBoost Residual)
    4. Hybrid + Delay Propagation & SciPy Constraint Optimization
    """
    os.makedirs("models", exist_ok=True)
    os.makedirs("data", exist_ok=True)

    df = load_and_preprocess_data(data_path)
    X, y_residual, full_df = extract_x_y(df)

    y_actual = full_df["actual_travel_min"]
    y_math = full_df["math_baseline_min"]

    # Train / Test split (80% train, 20% test)
    X_train, X_test, y_res_train, y_res_test, idx_train, idx_test = train_test_split(
        X, y_residual, full_df.index, test_size=0.2, random_state=42
    )

    y_actual_test = y_actual.iloc[idx_test]
    y_math_test = y_math.iloc[idx_test]
    test_df = full_df.iloc[idx_test]

    # -------------------------------------------------------------
    # 1. Model A: Mathematical Baseline Alone
    # -------------------------------------------------------------
    mae_math = mean_absolute_error(y_actual_test, y_math_test)
    rmse_math = root_mean_squared_error(y_actual_test, y_math_test)
    r2_math = r2_score(y_actual_test, y_math_test)

    # -------------------------------------------------------------
    # 2. Model B: XGBoost Direct Predictor
    # -------------------------------------------------------------
    model_direct = xgb.XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42)
    model_direct.fit(X_train, y_actual.iloc[idx_train])
    y_pred_direct = model_direct.predict(X_test)

    mae_xgb_only = mean_absolute_error(y_actual_test, y_pred_direct)
    rmse_xgb_only = root_mean_squared_error(y_actual_test, y_pred_direct)
    r2_xgb_only = r2_score(y_actual_test, y_pred_direct)

    # -------------------------------------------------------------
    # 3. Model C: Hybrid (Math Baseline + XGBoost Residual)
    # -------------------------------------------------------------
    model_residual = xgb.XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42)
    model_residual.fit(X_train, y_res_train)

    predicted_residual_test = model_residual.predict(X_test)
    y_pred_hybrid = y_math_test + predicted_residual_test

    mae_hybrid = mean_absolute_error(y_actual_test, y_pred_hybrid)
    rmse_hybrid = root_mean_squared_error(y_actual_test, y_pred_hybrid)
    r2_hybrid = r2_score(y_actual_test, y_pred_hybrid)

    # -------------------------------------------------------------
    # 4. Model D: Hybrid + Delay Propagation & SciPy Constraint Optimization
    # -------------------------------------------------------------
    sections_list = [
        {"distance_km": row["distance_km"], "max_speed_kmh": row["max_speed_kmh"], "min_dwell_minutes": row["scheduled_dwell_min"]}
        for _, row in test_df.iterrows()
    ]
    y_pred_opt, _ = SciPyETAOptimizer.optimize_section_travel_times(sections_list, y_pred_hybrid.tolist())

    mae_scipy = mean_absolute_error(y_actual_test, y_pred_opt)
    rmse_scipy = root_mean_squared_error(y_actual_test, y_pred_opt)
    r2_scipy = r2_score(y_actual_test, y_pred_opt)

    # Save trained residual model artifact
    joblib.dump(model_residual, MODEL_SAVE_PATH)
    print(f"Saved trained XGBoost Residual model artifact to {MODEL_SAVE_PATH}")

    # Metrics comparison dictionary for all 4 models
    metrics = {
        "is_synthetic_data": True,
        "evaluation_dataset": "Indian Railways Historical Train Delay (Synthetic Evaluation)",
        "test_samples": len(X_test),
        "models": {
            "mathematical_baseline": {
                "name": "Mathematical Baseline",
                "mae": round(float(mae_math), 3),
                "rmse": round(float(rmse_math), 3),
                "r2_score": round(float(r2_math), 3)
            },
            "xgboost_only": {
                "name": "XGBoost-Only Direct Predictor",
                "mae": round(float(mae_xgb_only), 3),
                "rmse": round(float(rmse_xgb_only), 3),
                "r2_score": round(float(r2_xgb_only), 3)
            },
            "hybrid_math_xgboost": {
                "name": "Hybrid (Mathematical + XGBoost Residual)",
                "mae": round(float(mae_hybrid), 3),
                "rmse": round(float(rmse_hybrid), 3),
                "r2_score": round(float(r2_hybrid), 3)
            },
            "hybrid_delay_scipy": {
                "name": "Hybrid + Delay Propagation & SciPy Constraint Optimization",
                "mae": round(float(mae_scipy), 3),
                "rmse": round(float(rmse_scipy), 3),
                "r2_score": round(float(r2_scipy), 3)
            }
        }
    }

    with open(METRICS_SAVE_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n--- 4-Model Evaluation Results ---")
    print(json.dumps(metrics, indent=2))
    return metrics

if __name__ == "__main__":
    train_and_evaluate_models()
