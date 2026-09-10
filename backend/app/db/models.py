from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.db.database import Base

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    zone = Column(String(20), default="ER")
    total_platforms = Column(Integer, default=4)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    origin_station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"))
    destination_station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"))
    total_distance_km = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sections = relationship("RouteSection", back_populates="route", cascade="all, delete-orphan")

class RouteSection(Base):
    __tablename__ = "route_sections"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"))
    from_station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"))
    to_station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"))
    distance_km = Column(Float, nullable=False)
    max_speed_kmh = Column(Float, default=110.0)
    min_dwell_minutes = Column(Integer, default=2)
    sequence_order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    route = relationship("Route", back_populates="sections")
    from_station = relationship("Station", foreign_keys=[from_station_id])
    to_station = relationship("Station", foreign_keys=[to_station_id])

class Train(Base):
    __tablename__ = "trains"

    id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(20), unique=True, nullable=False, index=True)
    train_name = Column(String(100), nullable=False)
    train_type = Column(String(50), default="Express")
    origin_station_id = Column(Integer, ForeignKey("stations.id"))
    destination_station_id = Column(Integer, ForeignKey("stations.id"))
    route_id = Column(Integer, ForeignKey("routes.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    locations = relationship("TrainLocation", back_populates="train", cascade="all, delete-orphan")

class TrainLocation(Base):
    __tablename__ = "train_locations"

    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(Integer, ForeignKey("trains.id", ondelete="CASCADE"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, nullable=False)
    delay_minutes = Column(Float, default=0.0)
    current_section_id = Column(Integer, ForeignKey("route_sections.id"))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    train = relationship("Train", back_populates="locations")

class SectionHistory(Base):
    __tablename__ = "section_history"

    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(Integer, ForeignKey("trains.id", ondelete="CASCADE"))
    section_id = Column(Integer, ForeignKey("route_sections.id", ondelete="CASCADE"))
    entry_time = Column(DateTime, nullable=False)
    exit_time = Column(DateTime, nullable=True)
    actual_dwell_minutes = Column(Float, default=0.0)
    weather_condition = Column(String(50), default="Clear")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class WeatherData(Base):
    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"))
    temperature_c = Column(Float, nullable=True)
    condition = Column(String(50), default="Clear")
    visibility_km = Column(Float, default=10.0)
    rainfall_mm = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ETAPrediction(Base):
    __tablename__ = "eta_predictions"

    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(Integer, ForeignKey("trains.id", ondelete="CASCADE"))
    station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"))
    math_eta = Column(DateTime, nullable=False)
    xgboost_correction = Column(Float, default=0.0)
    propagation_delay = Column(Float, default=0.0)
    final_eta = Column(DateTime, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    r2_score = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
