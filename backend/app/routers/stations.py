from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.db.database import get_db
from backend.app.db.models import Station
from backend.app.schemas.schemas import StationResponse

router = APIRouter(prefix="/api/stations", tags=["Stations"])

@router.get("", response_model=List[StationResponse])
def get_all_stations(db: Session = Depends(get_db)):
    """Fetch all stations registered in the network."""
    return db.query(Station).order_by(Station.id).all()

@router.get("/{station_id}", response_model=StationResponse)
def get_station_by_id(station_id: int, db: Session = Depends(get_db)):
    """Fetch specific station details by ID."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return station
