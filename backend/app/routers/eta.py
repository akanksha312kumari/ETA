from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.db.database import get_db
from backend.app.db.models import Train, Route, RouteSection, Station, TrainLocation
from backend.eta_engine.mathematical_model import (
    RailwayNode,
    RailwayEdge,
    RailwayGraph,
    MathematicalETAEngine
)

router = APIRouter(prefix="/api/eta", tags=["Mathematical ETA Engine"])

class ETASimulationRequest(BaseModel):
    train_id: int = 1
    current_station_id: int = 1
    current_speed_kmh: float = Field(default=85.0, ge=5.0, le=160.0)
    current_delay_min: float = Field(default=10.0, ge=0.0)
    new_delay_min: float = Field(default=0.0, ge=0.0)
    recovered_delay_min: float = Field(default=0.0, ge=0.0)

def build_graph_from_db(db: Session, route_id: int) -> RailwayGraph:
    """Builds graph G = (V, E) from DB entities for a given route."""
    graph = RailwayGraph()

    sections = db.query(RouteSection).options(
        joinedload(RouteSection.from_station),
        joinedload(RouteSection.to_station)
    ).filter(RouteSection.route_id == route_id).order_by(RouteSection.sequence_order).all()

    if not sections:
        raise HTTPException(status_code=404, detail="No route sections found for route")

    for sec in sections:
        # Add from_station node
        if sec.from_station.id not in graph.nodes:
            graph.add_node(RailwayNode(
                station_id=sec.from_station.id,
                code=sec.from_station.code,
                name=sec.from_station.name,
                latitude=sec.from_station.latitude,
                longitude=sec.from_station.longitude,
                min_dwell_minutes=sec.min_dwell_minutes
            ))
        # Add to_station node
        if sec.to_station.id not in graph.nodes:
            graph.add_node(RailwayNode(
                station_id=sec.to_station.id,
                code=sec.to_station.code,
                name=sec.to_station.name,
                latitude=sec.to_station.latitude,
                longitude=sec.to_station.longitude,
                min_dwell_minutes=sec.min_dwell_minutes
            ))
        # Add section edge
        graph.add_edge(RailwayEdge(
            section_id=sec.id,
            from_station_id=sec.from_station_id,
            to_station_id=sec.to_station_id,
            distance_km=sec.distance_km,
            max_speed_kmh=sec.max_speed_kmh,
            sequence_order=sec.sequence_order
        ))

    return graph

@router.get("/calculate/{train_id}")
def calculate_train_eta(train_id: int, db: Session = Depends(get_db)):
    """
    Calculates dynamic Mathematical ETA for ALL remaining stations
    based on live database location and section metadata.
    """
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")

    # Fetch latest train location update
    loc = db.query(TrainLocation).filter(TrainLocation.train_id == train_id).order_by(TrainLocation.timestamp.desc()).first()
    
    speed_kmh = loc.speed_kmh if loc else 85.0
    current_delay = loc.delay_minutes if loc else 0.0

    # Build Graph G = (V, E)
    graph = build_graph_from_db(db, train.route_id)

    # Determine starting station ID
    start_station_id = train.origin_station_id
    if loc and loc.current_section_id:
        current_sec = db.query(RouteSection).filter(RouteSection.id == loc.current_section_id).first()
        if current_sec:
            start_station_id = current_sec.from_station_id

    # Compute graph-propagated mathematical ETAs for all remaining downstream stations
    downstream_etas = MathematicalETAEngine.calculate_route_eta(
        graph=graph,
        current_station_id=start_station_id,
        current_speed_kmh=speed_kmh,
        current_delay_min=current_delay,
        start_time=datetime.now(timezone.utc)
    )

    return {
        "train_id": train.id,
        "train_number": train.train_number,
        "train_name": train.train_name,
        "current_speed_kmh": speed_kmh,
        "current_delay_minutes": current_delay,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "downstream_etas": downstream_etas
    }

@router.post("/simulate")
def simulate_eta(req: ETASimulationRequest, db: Session = Depends(get_db)):
    """
    Simulates dynamic mathematical ETA recalculation for all downstream stations
    with real-time speed, delay, and recovery parameter adjustments.
    """
    train = db.query(Train).filter(Train.id == req.train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")

    graph = build_graph_from_db(db, train.route_id)

    downstream_etas = MathematicalETAEngine.calculate_route_eta(
        graph=graph,
        current_station_id=req.current_station_id,
        current_speed_kmh=req.current_speed_kmh,
        current_delay_min=req.current_delay_min,
        start_time=datetime.now(timezone.utc),
        new_delay_min=req.new_delay_min,
        recovered_delay_min=req.recovered_delay_min
    )

    return {
        "simulation_mode": "Mathematical Baseline + Graph Delay Propagation",
        "train_id": req.train_id,
        "train_number": train.train_number,
        "input_speed_kmh": req.current_speed_kmh,
        "input_delay_min": req.current_delay_min,
        "new_delay_min": req.new_delay_min,
        "recovered_delay_min": req.recovered_delay_min,
        "downstream_etas": downstream_etas
    }
