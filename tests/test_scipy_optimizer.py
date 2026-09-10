import pytest
from backend.eta_engine.scipy_optimizer import SciPyETAOptimizer

def test_scipy_optimizer_speed_limit_constraint():
    # Distance = 95 km, Max Speed = 130 km/h -> Min Travel Time = (95/130)*60 + 3 = 46.84 min
    # If ML prediction produces an unphysically fast 20 min -> SciPy must adjust it up to >= 46.84 min
    sections = [
        {"distance_km": 95.0, "max_speed_kmh": 130.0, "min_dwell_minutes": 3.0}
    ]
    unconstrained_hybrid_targets = [20.0]

    optimized, adjustments = SciPyETAOptimizer.optimize_section_travel_times(
        sections=sections,
        hybrid_targets_min=unconstrained_hybrid_targets
    )

    assert optimized[0] >= 46.8
    assert adjustments[0] > 0.0  # Positive constraint adjustment added to preserve physical speed limit

def test_scipy_optimizer_normal_target():
    # Target is already physically valid (65.0 min > 46.84 min) -> Constraint adjustment should be ~0.0
    sections = [
        {"distance_km": 95.0, "max_speed_kmh": 130.0, "min_dwell_minutes": 3.0}
    ]
    unconstrained_hybrid_targets = [65.0]

    optimized, adjustments = SciPyETAOptimizer.optimize_section_travel_times(
        sections=sections,
        hybrid_targets_min=unconstrained_hybrid_targets
    )

    assert abs(optimized[0] - 65.0) < 0.1
    assert abs(adjustments[0]) < 0.1
