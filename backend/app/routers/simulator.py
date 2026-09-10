import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.simulator.rtis_simulator import RTISSimulator
from backend.streaming.kafka_pipeline import stream_manager

router = APIRouter(prefix="/api/simulator", tags=["RTIS Simulator & Streaming"])

# Global Simulator instance
simulator = RTISSimulator(train_number="12301")
_sim_task: Optional[asyncio.Task] = None

class ControlRequest(BaseModel):
    action: str  # "congestion" | "recovery" | "unscheduled_stop"

async def simulation_loop():
    """Background loop generating simulated RTIS telemetry updates every 3 seconds."""
    print("[RTIS SIMULATOR] Background simulation loop started.")
    try:
        while simulator.running:
            telemetry = simulator.update_step()
            await stream_manager.publish_telemetry(telemetry)
            await asyncio.sleep(3.0)
    except asyncio.CancelledError:
        print("[RTIS SIMULATOR] Background simulation loop stopped.")
    except Exception as e:
        print(f"[RTIS SIMULATOR] Loop error: {e}")

@router.post("/start")
async def start_simulation():
    """Starts the real-time RTIS telemetry simulator streaming loop."""
    global _sim_task
    if simulator.running and _sim_task and not _sim_task.done():
        return {"status": "ALREADY_RUNNING", "message": "Simulator loop is already active."}

    simulator.running = True
    _sim_task = asyncio.create_task(simulation_loop())
    
    # Perform initial step immediately
    first_telemetry = simulator.update_step()
    await stream_manager.publish_telemetry(first_telemetry)

    return {
        "status": "STARTED",
        "data_source": "SIMULATED RTIS DATA",
        "train_number": simulator.train_number,
        "message": "Real-time RTIS telemetry simulator activated."
    }

@router.post("/stop")
async def stop_simulation():
    """Pauses the real-time RTIS telemetry simulator streaming loop."""
    global _sim_task
    simulator.running = False
    if _sim_task and not _sim_task.done():
        _sim_task.cancel()
        _sim_task = None

    return {
        "status": "STOPPED",
        "data_source": "SIMULATED RTIS DATA",
        "message": "Real-time RTIS telemetry simulator paused."
    }

@router.post("/control")
async def control_simulation(req: ControlRequest):
    """
    Triggers live simulation event controls:
    - 'congestion': Reduces speed & increases delay
    - 'recovery': Boosts speed to max limit & recovers delay
    - 'unscheduled_stop': Sets speed to 0.0 km/h
    """
    action = req.action.lower()
    if action == "congestion":
        simulator.trigger_congestion()
    elif action == "recovery":
        simulator.trigger_delay_recovery()
    elif action in ["unscheduled_stop", "stop"]:
        simulator.trigger_unscheduled_stop()
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'congestion', 'recovery', or 'unscheduled_stop'")

    telemetry = simulator.update_step()
    pipeline_result = await stream_manager.publish_telemetry(telemetry)

    return {
        "status": "EVENT_TRIGGERED",
        "event_action": action,
        "data_source": "SIMULATED RTIS DATA",
        "telemetry": telemetry,
        "pipeline_result": pipeline_result
    }

@router.get("/status")
async def get_simulator_status():
    """Returns current status of RTIS simulator and latest streaming pipeline update."""
    global _sim_task
    if _sim_task is None or _sim_task.done():
        simulator.running = True
        try:
            _sim_task = asyncio.create_task(simulation_loop())
        except Exception:
            pass

    lat, lng = simulator.interpolate_gps(simulator.cum_distance_km)
    latest_tel = {
        "train_number": simulator.train_number,
        "cumulative_distance_km": round(simulator.cum_distance_km, 1),
        "speed_kmh": round(simulator.current_speed_kmh, 1),
        "delay_minutes": round(simulator.current_delay_min, 1),
        "latitude": lat,
        "longitude": lng,
        "simulator_status": simulator.status
    }
    return {
        "data_source": "SIMULATED RTIS DATA",
        "is_running": simulator.running,
        "train_number": simulator.train_number,
        "current_distance_km": round(simulator.cum_distance_km, 1),
        "current_speed_kmh": round(simulator.current_speed_kmh, 1),
        "current_delay_min": round(simulator.current_delay_min, 1),
        "simulator_status": simulator.status,
        "latest_telemetry": latest_tel,
        "latest_pipeline_result": stream_manager.latest_pipeline_result
    }
