import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "Connected" in data["database"]

def test_get_stations():
    response = client.get("/api/stations")
    assert response.status_code == 200
    stations = response.json()
    assert len(stations) >= 4

def test_get_routes():
    response = client.get("/api/routes")
    assert response.status_code == 200

def test_get_trains():
    response = client.get("/api/trains")
    assert response.status_code == 200

def test_calculate_train_eta_api():
    response = client.get("/api/eta/calculate/1")
    assert response.status_code == 200

def test_simulate_eta_api():
    payload = {
        "train_id": 1,
        "current_station_id": 1,
        "current_speed_kmh": 90.0,
        "current_delay_min": 15.0,
        "new_delay_min": 5.0,
        "recovered_delay_min": 2.0
    }
    response = client.post("/api/eta/simulate", json=payload)
    assert response.status_code == 200

def test_get_model_metrics_api():
    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["is_synthetic_data"] is True

def test_get_train_model_breakdown_api():
    response = client.get("/api/trains/12301/model-breakdown")
    assert response.status_code == 200

def test_simulator_status_api():
    response = client.get("/api/simulator/status")
    assert response.status_code == 200
    data = response.json()
    assert data["data_source"] == "SIMULATED RTIS DATA"

def test_simulator_control_triggers_api():
    # Test Congestion Event
    response = client.post("/api/simulator/control", json={"action": "congestion"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "EVENT_TRIGGERED"
    assert data["event_action"] == "congestion"

    # Test Recovery Event
    response = client.post("/api/simulator/control", json={"action": "recovery"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "EVENT_TRIGGERED"

    # Test Unscheduled Stop Event
    response = client.post("/api/simulator/control", json={"action": "unscheduled_stop"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "EVENT_TRIGGERED"
