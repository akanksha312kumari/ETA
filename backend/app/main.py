import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.db.database import engine, Base, SessionLocal
from backend.app.db.seed_data import seed_database
from backend.app.routers import stations, routes, trains, eta, model, simulator, websocket, railradar
from backend.app.schemas.schemas import HealthResponse

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Seed initial route and station data
with SessionLocal() as db_session:
    seed_database(db_session)

app = FastAPI(
    title="Train ETA API",
    description="Backend API with WebSockets, RTIS Simulator & Real-time Kafka Streaming Layer for Coaching Trains",
    version="6.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(stations.router)
app.include_router(routes.router)
app.include_router(trains.router)
app.include_router(eta.router)
app.include_router(model.router)
app.include_router(simulator.router)
app.include_router(websocket.router)
app.include_router(railradar.router)

@app.on_event("startup")
async def startup_event():
    """Automatically activate RTIS simulation streaming on startup so train moves dynamically."""
    from backend.app.routers.simulator import start_simulation
    try:
        await start_simulation()
        print("[STARTUP] Real-time RTIS telemetry simulator activated automatically.")
    except Exception as e:
        print(f"[STARTUP] Simulator auto-start warning: {e}")

@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def check_health():
    """System health check endpoint."""
    db_type = "PostgreSQL" if "postgresql" in str(engine.url) else "SQLite"
    return HealthResponse(
        status="ONLINE",
        system="Dynamic Forecast ETA Engine (Part 6 WebSockets Active)",
        version="6.0.0",
        database=f"Connected ({db_type})"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)

