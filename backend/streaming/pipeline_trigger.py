from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.db.database import SessionLocal
from backend.app.db.models import Train, TrainLocation, ETAPrediction, RouteSection, Station
from backend.eta_engine.mathematical_model import MathematicalETAEngine, RailwayGraph, RailwayNode, RailwayEdge
from backend.eta_engine.scipy_optimizer import SciPyETAOptimizer
from ml.predict import predict_hybrid_section_time

def build_graph(db: Session, route_id: int) -> RailwayGraph:
    """Builds Railway Graph G = (V, E) from DB metadata."""
    graph = RailwayGraph()
    sections = db.query(RouteSection).filter(RouteSection.route_id == route_id).order_by(RouteSection.sequence_order).all()
    
    for sec in sections:
        from_st = db.query(Station).filter(Station.id == sec.from_station_id).first()
        to_st = db.query(Station).filter(Station.id == sec.to_station_id).first()
        
        if from_st and from_st.id not in graph.nodes:
            graph.add_node(RailwayNode(from_st.id, from_st.code, from_st.name, from_st.latitude, from_st.longitude, sec.min_dwell_minutes))
        if to_st and to_st.id not in graph.nodes:
            graph.add_node(RailwayNode(to_st.id, to_st.code, to_st.name, to_st.latitude, to_st.longitude, sec.min_dwell_minutes))
            
        graph.add_edge(RailwayEdge(sec.id, sec.from_station_id, sec.to_station_id, sec.distance_km, sec.max_speed_kmh, sec.sequence_order))
        
    return graph

def process_rtis_telemetry(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes real-time dynamic ETA calculation pipeline on every telemetry message:
    GPS Message -> Section Detection -> Mathematical ETA -> XGBoost Residual Correction -> Delay Propagation -> SciPy Constraints -> Final ETAs -> DB Update
    """
    db: Session = SessionLocal()
    try:
        train_number = telemetry.get("train_number", "12301")
        train = db.query(Train).filter(Train.train_number == train_number).first()
        if not train:
            return {"error": f"Train {train_number} not registered"}

        lat = float(telemetry["latitude"])
        lng = float(telemetry["longitude"])
        speed = float(telemetry["speed_kmh"])
        delay = float(telemetry["delay_minutes"])
        sec_id = int(telemetry.get("current_section_id", 1))

        # 1. Update live train location record in Database
        loc = TrainLocation(
            train_id=train.id,
            latitude=lat,
            longitude=lng,
            speed_kmh=speed,
            delay_minutes=delay,
            current_section_id=sec_id,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(loc)
        db.commit()

        # 2. Build Graph G = (V, E)
        graph = build_graph(db, train.route_id)

        # 3. Determine starting station
        curr_sec = db.query(RouteSection).filter(RouteSection.id == sec_id).first()
        start_station_id = curr_sec.from_station_id if curr_sec else train.origin_station_id

        # 4. Run Mathematical Model Baseline + Graph Delay Propagation
        downstream_etas = MathematicalETAEngine.calculate_route_eta(
            graph=graph,
            current_station_id=start_station_id,
            current_speed_kmh=speed,
            current_delay_min=delay,
            start_time=datetime.now(timezone.utc)
        )

        # 5. Extract section parameters & unconstrained hybrid targets
        sections_param = []
        hybrid_unconstrained_targets = []
        xgb_residuals = []

        from backend.app.services.weather_service import WeatherService
        w_obs = WeatherService.get_station_weather("BWN")
        live_weather_cond = w_obs.get("weather_condition", "Clear")

        for eta in downstream_etas:
            ml_breakdown = predict_hybrid_section_time(
                distance_km=eta["distance_km"],
                speed_kmh=speed,
                max_speed_kmh=eta["max_speed_kmh"],
                dwell_min=2.0,
                features={
                    "current_delay_min": delay,
                    "scheduled_travel_min": (eta["distance_km"] / eta["max_speed_kmh"]) * 60.0,
                    "weather_condition": live_weather_cond
                }
            )

            xgb_residual = ml_breakdown["xgboost_correction_min"]
            xgb_residuals.append(xgb_residual)

            # Unconstrained Target = Math Cumulative + Propagated Delay + XGBoost Residual
            math_cum_min = eta["cumulative_baseline_minutes"] + eta["propagated_delay_minutes"]
            target_min = math_cum_min + xgb_residual
            hybrid_unconstrained_targets.append(target_min)

            sections_param.append({
                "distance_km": eta["distance_km"],
                "max_speed_kmh": eta["max_speed_kmh"],
                "min_dwell_minutes": 2.0
            })

        # 6. Apply SciPy Constraint-Aware Optimization Engine
        optimized_times_min, constraint_adjustments = SciPyETAOptimizer.optimize_section_travel_times(
            sections=sections_param,
            hybrid_targets_min=hybrid_unconstrained_targets
        )

        # 7. Formulate final enhanced ETA results with 6-Step breakdown details
        enhanced_etas = []
        for i, eta in enumerate(downstream_etas):
            final_cum_min = max(0.1, optimized_times_min[i])
            final_arrival_time = datetime.now(timezone.utc) + timedelta(minutes=final_cum_min)

            enhanced_eta = {
                **eta,
                "distance_km": eta["distance_km"],
                "effective_speed_kmh": eta["effective_speed_kmh"],
                "math_baseline_min": eta["section_baseline_minutes"],
                "dwell_time_min": 2.0,
                "xgboost_correction_min": xgb_residuals[i],
                "propagated_delay_min": eta["propagated_delay_minutes"],
                "scipy_constraint_adjustment_min": constraint_adjustments[i],
                "math_eta": eta["predicted_eta"],
                "final_eta": final_arrival_time.isoformat(),
                "final_travel_minutes": round(final_cum_min, 2)
            }
            enhanced_etas.append(enhanced_eta)

            # Save prediction record to DB
            pred_record = ETAPrediction(
                train_id=train.id,
                station_id=eta["to_station_id"],
                math_eta=datetime.fromisoformat(eta["predicted_eta"]),
                xgboost_correction=xgb_residuals[i],
                propagation_delay=eta["propagated_delay_minutes"],
                final_eta=final_arrival_time,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(pred_record)

        db.commit()

        return {
            "status": "SUCCESS",
            "data_source": "SIMULATED RTIS DATA",
            "train_number": train_number,
            "telemetry": telemetry,
            "pipeline_stages": {
                "1_location_update": f"Lat: {lat}, Lng: {lng}, Speed: {speed} km/h",
                "2_section_detected": f"Section #{sec_id}",
                "3_math_engine": f"{len(enhanced_etas)} station baselines calculated",
                "4_xgboost_correction": "Residual ML inference applied",
                "5_delay_propagation": f"Propagated Delay: +{delay} min",
                "6_scipy_optimization": "Speed/dwell physical constraints enforced",
                "7_final_eta": "Persisted to DB"
            },
            "downstream_etas": enhanced_etas
        }

    except Exception as e:
        db.rollback()
        print(f"[PIPELINE TRIGGER ERROR] {e}")
        return {"status": "ERROR", "message": str(e)}
    finally:
        db.close()
