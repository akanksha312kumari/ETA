from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from backend.app.db.database import get_db
from backend.app.db.models import Route
from backend.app.schemas.schemas import RouteResponse

router = APIRouter(prefix="/api/routes", tags=["Routes"])

@router.get("", response_model=List[RouteResponse])
def get_all_routes(db: Session = Depends(get_db)):
    """Fetch all routes with section details."""
    return db.query(Route).options(joinedload(Route.sections)).all()

@router.get("/{route_id}", response_model=RouteResponse)
def get_route_by_id(route_id: int, db: Session = Depends(get_db)):
    """Fetch route details by ID."""
    route = db.query(Route).options(joinedload(Route.sections)).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route
