import pandas as pd
import numpy as np

WEATHER_MAPPING = {
    "Clear": 0,
    "Rain": 1,
    "Fog": 2,
    "Heavy Rain": 3
}

FEATURE_COLUMNS = [
    "actual_speed_kmh",
    "current_delay_min",
    "distance_km",
    "max_speed_kmh",
    "scheduled_travel_min",
    "prev_delay_min",
    "avg_speed_kmh",
    "congestion_score",
    "actual_dwell_min",
    "hour_of_day",
    "day_of_week",
    "weather_code"
]

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw section records into full ML feature matrix.
    Computes congestion score, average section speed, temporal features,
    and target residual: actual_travel_min - math_baseline_min
    """
    data = df.copy()

    # Weather encoding
    data["weather_code"] = data["weather_condition"].map(lambda w: WEATHER_MAPPING.get(w, 0))

    # Average speed
    eff_travel_min = np.maximum(data["actual_travel_min"], 1.0)
    data["avg_speed_kmh"] = (data["distance_km"] / eff_travel_min) * 60.0

    # Congestion score: 1.0 = heavy congestion (0 speed), 0.0 = free flow (max speed)
    max_sp = np.maximum(data["max_speed_kmh"], 10.0)
    data["congestion_score"] = np.clip(1.0 - (data["actual_speed_kmh"] / max_sp), 0.0, 1.0)

    # Temporal features
    if "timestamp" in data.columns and not pd.api.types.is_datetime64_any_dtype(data["timestamp"]):
        data["timestamp_dt"] = pd.to_datetime(data["timestamp"])
        data["hour_of_day"] = data["timestamp_dt"].dt.hour
        data["day_of_week"] = data["timestamp_dt"].dt.dayofweek
    else:
        if "hour_of_day" not in data.columns:
            data["hour_of_day"] = 12
        if "day_of_week" not in data.columns:
            data["day_of_week"] = 2

    # Math baseline calculation if missing
    if "math_baseline_min" not in data.columns:
        eff_speed = np.maximum(data["actual_speed_kmh"], 10.0)
        data["math_baseline_min"] = (data["distance_km"] / eff_speed) * 60.0 + data["scheduled_dwell_min"]

    # Target residual: Actual travel time - Mathematical baseline
    data["section_residual_min"] = data["actual_travel_min"] - data["math_baseline_min"]

    return data

def extract_x_y(df: pd.DataFrame):
    """Extracts feature matrix X and target residual y."""
    engineered = engineer_features(df)
    X = engineered[FEATURE_COLUMNS]
    y = engineered["section_residual_min"]
    return X, y, engineered
