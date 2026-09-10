# Dynamic Forecast of Expected Time of Arrival (ETA) for Coaching Trains
**SIH 2026 Problem Statement SIH26028** | **Team BongoCoders**

---

## 📌 Project Overview
This repository contains Part 1 (Project Foundation) of the **Hybrid ETA Engine** for Coaching Trains in Indian Railways. The solution combines mathematical section modeling, XGBoost residual ML correction, graph-based delay propagation, and constraint optimization to deliver dynamic, high-accuracy ETA predictions.

---

## 📁 Repository Structure
```
/SIH
├── /backend
│   ├── /app
│   │   ├── /db          # SQLAlchemy database engine, ORM models, and seed script
│   │   ├── /routers     # FastAPI endpoints (stations, routes, trains)
│   │   ├── /schemas     # Pydantic validation schemas
│   │   └── main.py      # FastAPI entry point & CORS configuration
│   ├── /sql             # PostgreSQL / Supabase schema SQL definition
│   └── requirements.txt # Python dependencies
├── /frontend            # React + Vite + Tailwind CSS dashboard shell
├── /ml                  # ML models & XGBoost residual predictors (Future Parts)
├── /data                # Historical delay datasets & section metadata
├── /models              # Saved model weights & artifacts
├── /tests               # Backend & model test suite
├── .env.example         # Environment variable configuration template
└── README.md            # Setup and deployment instructions
```

---

## 🗄️ Database Schema (PostgreSQL / Supabase)
The database structure consists of **9 normalized tables**:
1. `stations`: Railway station metadata & GPS coordinates.
2. `routes`: Route metadata (e.g., Howrah - Asansol Main Line).
3. `route_sections`: Railway sections connecting stations (distance, max speed limit, dwell times).
4. `trains`: Coaching train details (e.g., 12301 Rajdhani Express).
5. `train_locations`: Real-time GPS location updates, speed, & current delay.
6. `section_history`: Entry/exit timestamps and actual dwell times for historical training.
7. `weather_data`: Station weather conditions (temperature, rainfall, visibility).
8. `eta_predictions`: ETA breakdown (Math model + XGBoost residual + Delay propagation).
9. `model_metrics`: Evaluation metrics (MAE, RMSE, R²).

---

## 🚀 Quickstart & Setup Instructions

### 1. Backend Setup (FastAPI & Python)
Navigate to the root directory and install Python dependencies:
```bash
pip install -r backend/requirements.txt
```

Run the backend server:
```bash
python -m backend.app.main
```
Or with Uvicorn directly:
```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive OpenAPI Documentation will be accessible at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup (React + Vite + Tailwind)
In a separate terminal, navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Testing
Run the backend automated test suite:
```bash
pytest tests/test_backend.py
```

---

## 🗺️ Seed Demo Route
The system comes pre-seeded with the demo railway corridor:
- **Howrah Junction (HWH)** → **Barddhaman Junction (BWN)** → **Durgapur (DGR)** → **Asansol Junction (ASN)**
- Total Corridor Distance: **200.0 km**
