import os
import random
import pandas as pd
from datetime import datetime, timedelta

def generate_historical_dataset(num_records: int = 1000, output_path: str = "data/historical_train_delays.csv"):
    """
    Generates a realistic historical dataset for Indian Railways train delays across sections:
    Section 1: HWH (Howrah) -> BWN (Barddhaman) [95 km]
    Section 2: BWN (Barddhaman) -> DGR (Durgapur) [63 km]
    Section 3: DGR (Durgapur) -> ASN (Asansol) [42 km]
    
    Data fields mimic Kaggle 'Indian Railways: Predict Train Delay' dataset.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    sections = [
        {"id": 1, "from": "HWH", "to": "BWN", "distance_km": 95.0, "max_speed_kmh": 130.0, "scheduled_min": 60.0, "scheduled_dwell": 3},
        {"id": 2, "from": "BWN", "to": "DGR", "distance_km": 63.0, "max_speed_kmh": 110.0, "scheduled_min": 45.0, "scheduled_dwell": 2},
        {"id": 3, "from": "DGR", "to": "ASN", "distance_km": 42.0, "max_speed_kmh": 110.0, "scheduled_min": 30.0, "scheduled_dwell": 3},
    ]

    train_numbers = ["12301", "12339", "12303", "12313", "13009", "12305"]
    weather_types = ["Clear", "Rain", "Fog", "Heavy Rain"]
    weather_weights = [0.70, 0.15, 0.10, 0.05]

    data = []
    base_time = datetime(2026, 1, 1, 6, 0, 0)

    for i in range(num_records):
        train_no = random.choice(train_numbers)
        sec = random.choice(sections)
        weather = random.choices(weather_types, weights=weather_weights)[0]
        
        # Speed impact based on weather and random congestion
        speed_factor = random.uniform(0.75, 1.0)
        if weather == "Fog":
            speed_factor *= 0.70
        elif weather == "Heavy Rain":
            speed_factor *= 0.80
        
        actual_speed = round(sec["max_speed_kmh"] * speed_factor, 1)
        
        # Mathematical section baseline calculation
        baseline_travel_time = round((sec["distance_km"] / max(actual_speed, 20.0)) * 60.0, 2)
        
        # Dwell time variability
        actual_dwell = max(sec["scheduled_dwell"], round(sec["scheduled_dwell"] + random.uniform(0, 5), 1))
        
        # Actual travel time includes section travel + dwell delay
        actual_section_min = round(baseline_travel_time + (actual_dwell - sec["scheduled_dwell"]), 2)
        
        # Delay accumulation / recovery
        scheduled_total = sec["scheduled_min"] + sec["scheduled_dwell"]
        actual_total = actual_section_min + actual_dwell
        section_delay = round(actual_total - scheduled_total, 2)
        
        prev_delay = round(random.uniform(0, 30), 1)
        # Recovery chance if train has previous delay and actual speed is high
        recovered_delay = round(min(prev_delay, random.uniform(0, 5) if actual_speed > 90 else 0.0), 1)
        final_delay = round(max(0.0, prev_delay + section_delay - recovered_delay), 1)
        
        rec_time = base_time + timedelta(minutes=i * 15 + random.randint(0, 10))

        data.append({
            "record_id": i + 1,
            "train_number": train_no,
            "section_id": sec["id"],
            "from_station": sec["from"],
            "to_station": sec["to"],
            "distance_km": sec["distance_km"],
            "max_speed_kmh": sec["max_speed_kmh"],
            "actual_speed_kmh": actual_speed,
            "scheduled_travel_min": sec["scheduled_min"],
            "actual_travel_min": actual_section_min,
            "scheduled_dwell_min": sec["scheduled_dwell"],
            "actual_dwell_min": actual_dwell,
            "weather_condition": weather,
            "prev_delay_min": prev_delay,
            "recovered_delay_min": recovered_delay,
            "current_delay_min": final_delay,
            "math_baseline_min": baseline_travel_time,
            "section_residual_min": round(actual_section_min - baseline_travel_time, 2),
            "timestamp": rec_time.strftime("%Y-%m-%d %H:%M:%S")
        })

    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} synthetic historical delay records in {output_path}")
    return df

if __name__ == "__main__":
    generate_historical_dataset()
