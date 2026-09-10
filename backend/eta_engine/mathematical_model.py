import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone

class RailwayNode:
    """Represents a station vertex V in graph G = (V, E)"""
    def __init__(self, station_id: int, code: str, name: str, latitude: float, longitude: float, min_dwell_minutes: int = 2):
        self.station_id = station_id
        self.code = code
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.min_dwell_minutes = min_dwell_minutes

class RailwayEdge:
    """Represents a railway section edge E in graph G = (V, E)"""
    def __init__(self, section_id: int, from_station_id: int, to_station_id: int, distance_km: float, max_speed_kmh: float = 110.0, sequence_order: int = 1):
        self.section_id = section_id
        self.from_station_id = from_station_id
        self.to_station_id = to_station_id
        self.distance_km = distance_km
        self.max_speed_kmh = max_speed_kmh
        self.sequence_order = sequence_order

class RailwayGraph:
    """
    Railway Network Graph G = (V, E)
    V = Stations (vertices)
    E = Sections (edges)
    """
    def __init__(self):
        self.nodes: Dict[int, RailwayNode] = {}
        self.edges: List[RailwayEdge] = []
        self.adjacency: Dict[int, List[RailwayEdge]] = {}

    def add_node(self, node: RailwayNode):
        self.nodes[node.station_id] = node
        if node.station_id not in self.adjacency:
            self.adjacency[node.station_id] = []

    def add_edge(self, edge: RailwayEdge):
        self.edges.append(edge)
        if edge.from_station_id in self.adjacency:
            self.adjacency[edge.from_station_id].append(edge)
        else:
            self.adjacency[edge.from_station_id] = [edge]

class MathematicalETAEngine:
    """
    Mathematical Baseline ETA Engine & Graph Delay Propagation Model
    """
    @staticmethod
    def enforce_physical_constraints(
        speed_kmh: float,
        max_speed_kmh: float,
        dwell_minutes: float,
        min_dwell_minutes: float
    ) -> tuple[float, float]:
        """
        Enforces basic physical constraints:
        1. 0 < effective_speed <= max_speed_kmh
        2. dwell_minutes >= min_dwell_minutes
        """
        # Constraint 1: Speed limit & non-zero speed
        bounded_speed = max(5.0, min(speed_kmh, max_speed_kmh))
        
        # Constraint 2: Dwell time minimum constraint
        bounded_dwell = max(dwell_minutes, min_dwell_minutes)
        
        return bounded_speed, bounded_dwell

    @staticmethod
    def calculate_section_travel_time(
        distance_km: float,
        speed_kmh: float,
        max_speed_kmh: float,
        dwell_minutes: float = 2.0,
        min_dwell_minutes: float = 2.0
    ) -> tuple[float, float]:
        """
        Calculates T_math = (distance / effective_speed) * 60 + dwell_time
        Returns (travel_time_minutes, effective_speed)
        """
        bounded_speed, bounded_dwell = MathematicalETAEngine.enforce_physical_constraints(
            speed_kmh=speed_kmh,
            max_speed_kmh=max_speed_kmh,
            dwell_minutes=dwell_minutes,
            min_dwell_minutes=min_dwell_minutes
        )

        # Travel time in minutes (Constraint: Travel time > 0)
        pure_travel_time_min = (distance_km / bounded_speed) * 60.0
        total_section_time_min = pure_travel_time_min + bounded_dwell

        return max(0.1, total_section_time_min), bounded_speed

    @staticmethod
    def propagate_delay(
        current_delay_min: float,
        new_delay_min: float = 0.0,
        recovered_delay_min: float = 0.0
    ) -> float:
        """
        Implements delay propagation formula:
        D_next = D_current + new_delay - recovered_delay
        """
        next_delay = current_delay_min + new_delay_min - recovered_delay_min
        return max(0.0, next_delay)

    @staticmethod
    def calculate_route_eta(
        graph: RailwayGraph,
        current_station_id: int,
        current_speed_kmh: float,
        current_delay_min: float,
        start_time: Optional[datetime] = None,
        new_delay_min: float = 0.0,
        recovered_delay_min: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Traverses the graph G = (V, E) from current_station_id to downstream stations
        and calculates baseline mathematical ETA for EVERY remaining station.
        """
        if start_time is None:
            start_time = datetime.now(timezone.utc)

        # Calculate propagated delay for upcoming corridor
        propagated_delay = MathematicalETAEngine.propagate_delay(
            current_delay_min=current_delay_min,
            new_delay_min=new_delay_min,
            recovered_delay_min=recovered_delay_min
        )

        eta_results = []
        cumulative_minutes = 0.0
        curr_node_id = current_station_id

        # Sort edges by sequence order
        edges_to_traverse = sorted(graph.edges, key=lambda e: e.sequence_order)
        
        # Filter starting from current station
        start_index = 0
        for idx, edge in enumerate(edges_to_traverse):
            if edge.from_station_id == current_station_id:
                start_index = idx
                break

        active_edges = edges_to_traverse[start_index:]

        for edge in active_edges:
            from_node = graph.nodes.get(edge.from_station_id)
            to_node = graph.nodes.get(edge.to_station_id)

            if not to_node:
                continue

            min_dwell = to_node.min_dwell_minutes if to_node else 2.0

            # Calculate baseline section travel time
            section_time_min, eff_speed = MathematicalETAEngine.calculate_section_travel_time(
                distance_km=edge.distance_km,
                speed_kmh=current_speed_kmh,
                max_speed_kmh=edge.max_speed_kmh,
                dwell_minutes=min_dwell,
                min_dwell_minutes=min_dwell
            )

            cumulative_minutes += section_time_min

            # Add propagated delay to overall arrival time
            total_arrival_offset_min = cumulative_minutes + propagated_delay

            estimated_arrival = start_time + timedelta(minutes=total_arrival_offset_min)

            eta_results.append({
                "section_id": edge.section_id,
                "from_station_code": from_node.code if from_node else "UNKNOWN",
                "from_station_name": from_node.name if from_node else "UNKNOWN",
                "to_station_id": to_node.station_id,
                "to_station_code": to_node.code,
                "to_station_name": to_node.name,
                "distance_km": edge.distance_km,
                "max_speed_kmh": edge.max_speed_kmh,
                "effective_speed_kmh": round(eff_speed, 1),
                "section_baseline_minutes": round(section_time_min, 2),
                "cumulative_baseline_minutes": round(cumulative_minutes, 2),
                "propagated_delay_minutes": round(propagated_delay, 1),
                "total_estimated_minutes": round(total_arrival_offset_min, 2),
                "predicted_eta": estimated_arrival.isoformat()
            })

        return eta_results
