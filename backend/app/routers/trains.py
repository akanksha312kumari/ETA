from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.db.database import get_db
from backend.app.db.models import Train, TrainLocation
from backend.app.schemas.schemas import TrainResponse, TrainLocationResponse

router = APIRouter(prefix="/api/trains", tags=["Trains"])

@router.get("", response_model=List[TrainResponse])
def get_all_trains(db: Session = Depends(get_db)):
    """Fetch all active trains."""
    return db.query(Train).all()

@router.get("/{train_id}", response_model=TrainResponse)
def get_train_by_id(train_id: int, db: Session = Depends(get_db)):
    """Fetch train details by ID."""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    return train

@router.get("/{train_id}/location", response_model=TrainLocationResponse)
def get_latest_train_location(train_id: int, db: Session = Depends(get_db)):
    """Fetch latest location update for a given train."""
    loc = db.query(TrainLocation).filter(TrainLocation.train_id == train_id).order_by(TrainLocation.timestamp.desc()).first()
    if not loc:
        raise HTTPException(status_code=404, detail="No location data found for train")
    return loc
