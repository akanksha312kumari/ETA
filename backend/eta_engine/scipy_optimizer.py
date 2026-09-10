import numpy as np
from scipy.optimize import minimize
from typing import List, Dict, Any, Tuple

class SciPyETAOptimizer:
    """
    SciPy Constraint-Aware Optimization Engine for Coaching Train ETA predictions.
    
    Objective:
    Keep final section predictions as close as possible to the ML+Mathematical hybrid target,
    while guaranteeing that physical and operational constraints are strictly satisfied:
    1. Effective Speed <= Section Max Speed Limit
    2. Station Dwell Time >= Minimum Dwell Time
    3. Pure Travel Time > Physical Minimum (No negative or zero travel times)
    """
    @staticmethod
    def optimize_section_travel_times(
        sections: List[Dict[str, Any]],
        hybrid_targets_min: List[float]
    ) -> Tuple[List[float], List[float]]:
        """
        Solves SciPy optimization problem using Sequential Least Squares Programming (SLSQP):
        
        minimize sum( (x_i - hybrid_target_i)^2 )
        subject to:
          x_i >= (distance_i / max_speed_i) * 60 + min_dwell_i  (Speed Limit & Dwell Constraint)
          x_i > 0.1                                             (Physical Minimum Constraint)
        
        Returns (optimized_travel_times_min, constraint_adjustments_min)
        """
        num_sections = len(sections)
        if num_sections == 0 or len(hybrid_targets_min) != num_sections:
            return hybrid_targets_min, [0.0] * num_sections

        x0 = np.array(hybrid_targets_min, dtype=float)

        # 1. Objective function: Minimize sum of squared error from hybrid prediction target
        def objective(x):
            return np.sum((x - x0) ** 2)

        # 2. Define bounds (x_i > 0.1 min)
        bounds = []
        for i, sec in enumerate(sections):
            dist = float(sec.get("distance_km", 50.0))
            max_sp = float(sec.get("max_speed_kmh", 110.0))
            min_dwell = float(sec.get("min_dwell_minutes", 2.0))

            # Physical minimum travel time at max speed + min dwell
            phys_min_time = (dist / max(max_sp, 10.0)) * 60.0 + min_dwell
            bounds.append((max(0.1, phys_min_time), 360.0))

        # Solve optimization
        res = minimize(
            objective,
            x0,
            method='SLSQP',
            bounds=bounds
        )

        if res.success:
            optimized = res.x.tolist()
        else:
            # Fallback to bounded array if optimization fails
            optimized = [
                max(b[0], min(x0[i], b[1])) for i, b in enumerate(bounds)
            ]

        # Calculate constraint adjustment delta = T_optimized - T_hybrid_target
        adjustments = [
            round(float(opt - hybrid_targets_min[i]), 2)
            for i, opt in enumerate(optimized)
        ]
        optimized_rounded = [round(float(opt), 2) for opt in optimized]

        return optimized_rounded, adjustments
