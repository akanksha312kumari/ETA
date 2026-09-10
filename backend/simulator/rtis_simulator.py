import math
import random
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

# Station waypoints on Howrah (HWH) -> Barddhaman (BWN) -> Durgapur (DGR) -> Asansol (ASN) route
STATION_WAYPOINTS = [
    {"station_id": 1, "code": "HWH", "name": "Howrah Junction", "lat": 22.5839, "lng": 88.3426, "cum_km": 0.0},
    {"station_id": 2, "code": "BWN", "name": "Barddhaman Junction", "lat": 23.2494, "lng": 87.8698, "cum_km": 95.0},
    {"station_id": 3, "code": "DGR", "name": "Durgapur", "lat": 23.5477, "lng": 87.2917, "cum_km": 158.0},
    {"station_id": 4, "code": "ASN", "name": "Asansol Junction", "lat": 23.6835, "lng": 86.9825, "cum_km": 200.0},
]

SECTIONS = [
    {"section_id": 1, "from_code": "HWH", "to_code": "BWN", "start_km": 0.0, "end_km": 95.0, "max_speed": 130.0},
    {"section_id": 2, "from_code": "BWN", "to_code": "DGR", "start_km": 95.0, "end_km": 158.0, "max_speed": 110.0},
    {"section_id": 3, "from_code": "DGR", "to_code": "ASN", "start_km": 158.0, "end_km": 200.0, "max_speed": 110.0},
]

class RTISSimulator:
    """
    Simulates real-time RTIS GPS telemetry for coaching train 12301 (Rajdhani Express)
    along the Howrah to Asansol corridor.
    """
    def __init__(self, train_number: str = "12301"):
        self.train_number = train_number
        self.running = True
        self.step_interval_sec = 2.0  # Accelerated update frequency for demo (simulates 30s updates)
        
        # State variables
        self.cum_distance_km = 0.0
        self.current_speed_kmh = 85.0
        self.current_delay_min = 5.0
        self.active_section_id = 1
        self.status = "IN_TRANSIT"  # IN_TRANSIT, CONGESTED, RECOVERING, UNSCHEDULED_STOP, AT_DESTINATION
        self.dwell_timer_sec = 0

    def interpolate_gps(self, cum_km: float) -> tuple[float, float]:
        """Interpolates lat/lng based on cumulative distance travelled."""
        if cum_km <= 0.0:
            return STATION_WAYPOINTS[0]["lat"], STATION_WAYPOINTS[0]["lng"]
        if cum_km >= 200.0:
            return STATION_WAYPOINTS[-1]["lat"], STATION_WAYPOINTS[-1]["lng"]

        # Find segment
        for i in range(len(STATION_WAYPOINTS) - 1):
            w1 = STATION_WAYPOINTS[i]
            w2 = STATION_WAYPOINTS[i + 1]
            if w1["cum_km"] <= cum_km <= w2["cum_km"]:
                seg_length = w2["cum_km"] - w1["cum_km"]
                fraction = (cum_km - w1["cum_km"]) / max(seg_length, 0.1)
                lat = w1["lat"] + fraction * (w2["lat"] - w1["lat"])
                lng = w1["lng"] + fraction * (w2["lng"] - w1["lng"])
                return round(lat, 5), round(lng, 5)

        return STATION_WAYPOINTS[-1]["lat"], STATION_WAYPOINTS[-1]["lng"]

    def get_current_section(self, cum_km: float) -> dict:
        """Determines active section based on cumulative distance."""
        for sec in SECTIONS:
            if sec["start_km"] <= cum_km < sec["end_km"]:
                return sec
        return SECTIONS[-1]

    def trigger_congestion(self):
        """Simulates heavy signal congestion / speed reduction."""
        self.status = "CONGESTED"
        self.current_speed_kmh = random.uniform(20.0, 35.0)
        self.current_delay_min += round(random.uniform(5.0, 10.0), 1)
        print(f"[RTIS SIMULATOR] Event Triggered: CONGESTION! Speed dropped to {self.current_speed_kmh:.1f} km/h, Delay: +{self.current_delay_min:.1f} min")

    def trigger_delay_recovery(self):
        """Simulates clear track priority & speed recovery."""
        self.status = "RECOVERING"
        sec = self.get_current_section(self.cum_distance_km)
        self.current_speed_kmh = min(sec["max_speed"], 115.0)
        self.current_delay_min = max(0.0, self.current_delay_min - round(random.uniform(3.0, 7.0), 1))
        print(f"[RTIS SIMULATOR] Event Triggered: DELAY RECOVERY! Speed boosted to {self.current_speed_kmh:.1f} km/h, Delay: {self.current_delay_min:.1f} min")

    def trigger_unscheduled_stop(self):
        """Simulates emergency unscheduled stop (speed = 0 km/h)."""
        self.status = "UNSCHEDULED_STOP"
        self.current_speed_kmh = 0.0
        self.current_delay_min += round(random.uniform(6.0, 12.0), 1)
        print(f"[RTIS SIMULATOR] Event Triggered: UNSCHEDULED STOP! Speed: 0.0 km/h, Delay: +{self.current_delay_min:.1f} min")

    def update_step(self) -> Dict[str, Any]:
        """Advances simulation by one step and returns simulated telemetry payload."""
        sec = self.get_current_section(self.cum_distance_km)
        self.active_section_id = sec["section_id"]

        # Advance distance if moving
        if self.status != "UNSCHEDULED_STOP":
            # Distance moved in step_interval_sec (simulating 30s distance progress)
            # We scale speed to advance simulation smoothly
            speed_variation = random.uniform(-3.0, 3.0)
            if self.status == "IN_TRANSIT":
                self.current_speed_kmh = max(30.0, min(sec["max_speed"], self.current_speed_kmh + speed_variation))
            
            # Step advances train by 2.5 km per update tick for clean interactive demo
            self.cum_distance_km = min(200.0, self.cum_distance_km + 2.5)

        # Reached destination loop check
        if self.cum_distance_km >= 200.0:
            self.cum_distance_km = 0.0
            self.status = "IN_TRANSIT"
            self.current_speed_kmh = 85.0
            self.current_delay_min = 2.0

        lat, lng = self.interpolate_gps(self.cum_distance_km)

        telemetry = {
            "data_source": "SIMULATED RTIS DATA",
            "train_number": self.train_number,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": lat,
            "longitude": lng,
            "speed_kmh": round(self.current_speed_kmh, 1),
            "delay_minutes": round(self.current_delay_min, 1),
            "current_section_id": self.active_section_id,
            "cumulative_distance_km": round(self.cum_distance_km, 1),
            "simulator_status": self.status
        }

        return telemetry
