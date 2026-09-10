import os
import pandas as pd
import numpy as np

def load_and_preprocess_data(file_path: str = "data/historical_train_delays.csv"):
    """
    Loads raw historical delay dataset, handles missing values,
    computes section residuals (Actual travel time - Mathematical travel time),
    and prepares clean features.
    """
    if not os.path.exists(file_path):
        from ml.generate_data import generate_historical_dataset
        generate_historical_dataset(output_path=file_path)

    df = pd.read_csv(file_path)
    
    # Fill missing values if any
    df["actual_speed_kmh"] = df["actual_speed_kmh"].fillna(df["max_speed_kmh"] * 0.85)
    df["weather_condition"] = df["weather_condition"].fillna("Clear")
    
    # Ensure physical constraints
    df["actual_speed_kmh"] = np.minimum(df["actual_speed_kmh"], df["max_speed_kmh"])
    df["actual_dwell_min"] = np.maximum(df["actual_dwell_min"], df["scheduled_dwell_min"])
    
    # Calculate Mathematical baseline travel time (distance / effective_speed * 60)
    # Avoid zero division
    effective_speed = np.maximum(df["actual_speed_kmh"], 10.0)
    df["calculated_math_baseline_min"] = (df["distance_km"] / effective_speed) * 60.0 + df["scheduled_dwell_min"]
    
    # Residual = Actual travel time - Mathematical baseline time
    df["section_residual_min"] = df["actual_travel_min"] - df["calculated_math_baseline_min"]
    
    print(f"Preprocessed {len(df)} records. Residual mean: {df['section_residual_min'].mean():.2f} min")
    return df

if __name__ == "__main__":
    df = load_and_preprocess_data()
    print("Preprocessed columns:", df.columns.tolist())
