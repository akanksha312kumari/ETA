import pytest
import asyncio
from backend.simulator.rtis_simulator import RTISSimulator
from backend.streaming.pipeline_trigger import process_rtis_telemetry
from backend.streaming.kafka_pipeline import stream_manager

def test_rtis_simulator_telemetry_generation():
    sim = RTISSimulator(train_number="12301")
    telemetry = sim.update_step()
    
    assert telemetry["data_source"] == "SIMULATED RTIS DATA"
    assert telemetry["train_number"] == "12301"
    assert "latitude" in telemetry
    assert "longitude" in telemetry
    assert "speed_kmh" in telemetry
    assert "delay_minutes" in telemetry
    assert "current_section_id" in telemetry

def test_simulator_event_triggers():
    sim = RTISSimulator(train_number="12301")
    
    # Test Congestion trigger
    sim.trigger_congestion()
    assert sim.status == "CONGESTED"
    assert sim.current_speed_kmh <= 35.0

    # Test Recovery trigger
    sim.trigger_delay_recovery()
    assert sim.status == "RECOVERING"

    # Test Unscheduled Stop trigger
    sim.trigger_unscheduled_stop()
    assert sim.status == "UNSCHEDULED_STOP"
    assert sim.current_speed_kmh == 0.0

def test_end_to_end_pipeline_trigger():
    telemetry = {
        "data_source": "SIMULATED RTIS DATA",
        "train_number": "12301",
        "latitude": 22.8,
        "longitude": 88.1,
        "speed_kmh": 75.0,
        "delay_minutes": 12.0,
        "current_section_id": 1
    }

    result = process_rtis_telemetry(telemetry)
    assert result["status"] == "SUCCESS"
    assert result["data_source"] == "SIMULATED RTIS DATA"
    assert "downstream_etas" in result
    assert len(result["downstream_etas"]) > 0
    
    first_eta = result["downstream_etas"][0]
    assert "math_eta" in first_eta
    assert "xgboost_correction_min" in first_eta
    assert "final_eta" in first_eta

def test_streaming_manager_publish():
    telemetry = {
        "data_source": "SIMULATED RTIS DATA",
        "train_number": "12301",
        "latitude": 23.0,
        "longitude": 88.0,
        "speed_kmh": 90.0,
        "delay_minutes": 5.0,
        "current_section_id": 1
    }

    res = asyncio.run(stream_manager.publish_telemetry(telemetry))
    assert res["status"] == "SUCCESS"
    assert stream_manager.latest_pipeline_result is not None
