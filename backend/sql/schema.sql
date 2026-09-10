-- PostgreSQL / Supabase Schema for Train ETA Engine

CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    zone VARCHAR(20) DEFAULT 'ER',
    total_platforms INT DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    origin_station_id INT REFERENCES stations(id) ON DELETE CASCADE,
    destination_station_id INT REFERENCES stations(id) ON DELETE CASCADE,
    total_distance_km DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_sections (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES routes(id) ON DELETE CASCADE,
    from_station_id INT REFERENCES stations(id) ON DELETE CASCADE,
    to_station_id INT REFERENCES stations(id) ON DELETE CASCADE,
    distance_km DOUBLE PRECISION NOT NULL,
    max_speed_kmh DOUBLE PRECISION DEFAULT 110.0,
    min_dwell_minutes INT DEFAULT 2,
    sequence_order INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trains (
    id SERIAL PRIMARY KEY,
    train_number VARCHAR(20) UNIQUE NOT NULL,
    train_name VARCHAR(100) NOT NULL,
    train_type VARCHAR(50) DEFAULT 'Express',
    origin_station_id INT REFERENCES stations(id),
    destination_station_id INT REFERENCES stations(id),
    route_id INT REFERENCES routes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS train_locations (
    id SERIAL PRIMARY KEY,
    train_id INT REFERENCES trains(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh DOUBLE PRECISION NOT NULL,
    delay_minutes DOUBLE PRECISION DEFAULT 0.0,
    current_section_id INT REFERENCES route_sections(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS section_history (
    id SERIAL PRIMARY KEY,
    train_id INT REFERENCES trains(id) ON DELETE CASCADE,
    section_id INT REFERENCES route_sections(id) ON DELETE CASCADE,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE,
    actual_dwell_minutes DOUBLE PRECISION DEFAULT 0.0,
    weather_condition VARCHAR(50) DEFAULT 'Clear',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weather_data (
    id SERIAL PRIMARY KEY,
    station_id INT REFERENCES stations(id) ON DELETE CASCADE,
    temperature_c DOUBLE PRECISION,
    condition VARCHAR(50) DEFAULT 'Clear',
    visibility_km DOUBLE PRECISION DEFAULT 10.0,
    rainfall_mm DOUBLE PRECISION DEFAULT 0.0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eta_predictions (
    id SERIAL PRIMARY KEY,
    train_id INT REFERENCES trains(id) ON DELETE CASCADE,
    station_id INT REFERENCES stations(id) ON DELETE CASCADE,
    math_eta TIMESTAMP WITH TIME ZONE NOT NULL,
    xgboost_correction DOUBLE PRECISION DEFAULT 0.0,
    propagation_delay DOUBLE PRECISION DEFAULT 0.0,
    final_eta TIMESTAMP WITH TIME ZONE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS model_metrics (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    mae DOUBLE PRECISION NOT NULL,
    rmse DOUBLE PRECISION NOT NULL,
    r2_score DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
