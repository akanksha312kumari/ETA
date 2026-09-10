from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class StationBase(BaseModel):
    code: str
    name: str
    latitude: float
    longitude: float
    zone: str = "ER"
    total_platforms: int = 4

class StationResponse(StationBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RouteSectionResponse(BaseModel):
    id: int
    route_id: int
    from_station: StationResponse
    to_station: StationResponse
    distance_km: float
    max_speed_kmh: float
    min_dwell_minutes: int
    sequence_order: int
    model_config = ConfigDict(from_attributes=True)

class RouteResponse(BaseModel):
    id: int
    name: str
    origin_station_id: int
    destination_station_id: int
    total_distance_km: float
    sections: List[RouteSectionResponse] = []
    model_config = ConfigDict(from_attributes=True)

class TrainResponse(BaseModel):
    id: int
    train_number: str
    train_name: str
    train_type: str
    origin_station_id: int
    destination_station_id: int
    route_id: int
    model_config = ConfigDict(from_attributes=True)

class TrainLocationResponse(BaseModel):
    id: int
    train_id: int
    latitude: float
    longitude: float
    speed_kmh: float
    delay_minutes: float
    current_section_id: Optional[int] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class HealthResponse(BaseModel):
    status: str
    system: str
    version: str
    database: str
