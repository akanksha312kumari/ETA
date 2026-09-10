import pytest
from datetime import datetime, timezone
from backend.eta_engine.mathematical_model import (
    RailwayNode,
    RailwayEdge,
    RailwayGraph,
    MathematicalETAEngine
)

def test_section_travel_time_calculation():
    # Distance = 95 km, Speed = 95 km/h -> Pure travel time = 60 mins. Dwell = 3 mins. Total = 63 mins.
    total_min, eff_speed = MathematicalETAEngine.calculate_section_travel_time(
        distance_km=95.0,
        speed_kmh=95.0,
        max_speed_kmh=130.0,
        dwell_minutes=3.0,
        min_dwell_minutes=3.0
    )
    assert round(total_min, 1) == 63.0
    assert eff_speed == 95.0

def test_physical_constraints_speed_limit():
    # Speed exceeds max speed limit (150 km/h > 110 km/h) -> Bounded to 110 km/h
    bounded_speed, bounded_dwell = MathematicalETAEngine.enforce_physical_constraints(
        speed_kmh=150.0,
        max_speed_kmh=110.0,
        dwell_minutes=1.0,
        min_dwell_minutes=2.0
    )
    assert bounded_speed == 110.0
    assert bounded_dwell == 2.0  # Dwell bounded to min dwell of 2 min

def test_delay_propagation():
    # Current delay = 10 min, New delay = 5 min, Recovered = 2 min -> Next delay = 13 min
    next_delay = MathematicalETAEngine.propagate_delay(
        current_delay_min=10.0,
        new_delay_min=5.0,
        recovered_delay_min=2.0
    )
    assert next_delay == 13.0

def test_delay_propagation_no_negative_delay():
    # Delay recovery exceeds current delay -> Clamped to 0.0
    next_delay = MathematicalETAEngine.propagate_delay(
        current_delay_min=5.0,
        new_delay_min=0.0,
        recovered_delay_min=10.0
    )
    assert next_delay == 0.0

def test_graph_downstream_eta_calculation():
    # Construct Graph G = (V, E)
    graph = RailwayGraph()
    hwh = RailwayNode(1, "HWH", "Howrah Junction", 22.5839, 88.3426, min_dwell_minutes=3)
    bwn = RailwayNode(2, "BWN", "Barddhaman Junction", 23.2494, 87.8698, min_dwell_minutes=2)
    dgr = RailwayNode(3, "DGR", "Durgapur", 23.5477, 87.2917, min_dwell_minutes=2)
    asn = RailwayNode(4, "ASN", "Asansol Junction", 23.6835, 86.9825, min_dwell_minutes=3)

    for node in [hwh, bwn, dgr, asn]:
        graph.add_node(node)

    e1 = RailwayEdge(1, 1, 2, distance_km=95.0, max_speed_kmh=130.0, sequence_order=1)
    e2 = RailwayEdge(2, 2, 3, distance_km=63.0, max_speed_kmh=110.0, sequence_order=2)
    e3 = RailwayEdge(3, 3, 4, distance_km=42.0, max_speed_kmh=110.0, sequence_order=3)

    for edge in [e1, e2, e3]:
        graph.add_edge(edge)

    # Calculate ETA starting from HWH (station_id 1)
    start_time = datetime(2026, 9, 10, 10, 0, 0, tzinfo=timezone.utc)
    results = MathematicalETAEngine.calculate_route_eta(
        graph=graph,
        current_station_id=1,
        current_speed_kmh=95.0,
        current_delay_min=5.0,
        start_time=start_time,
        new_delay_min=2.0,
        recovered_delay_min=0.0
    )

    # Must calculate ETAs for ALL 3 downstream stations (BWN, DGR, ASN)
    assert len(results) == 3
    assert results[0]["to_station_code"] == "BWN"
    assert results[1]["to_station_code"] == "DGR"
    assert results[2]["to_station_code"] == "ASN"

    # Propagated delay should be 5 + 2 = 7.0 minutes
    assert results[0]["propagated_delay_minutes"] == 7.0
    assert results[1]["propagated_delay_minutes"] == 7.0
    assert results[2]["propagated_delay_minutes"] == 7.0
