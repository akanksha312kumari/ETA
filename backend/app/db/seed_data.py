from sqlalchemy.orm import Session
from backend.app.db.models import Station, Route, RouteSection, Train, TrainLocation

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Station).count() > 0:
        return

    print("Seeding initial station and route data...")

    # 1. Stations
    hwh = Station(code="HWH", name="Howrah Junction", latitude=22.5839, longitude=88.3426, zone="ER", total_platforms=23)
    bwn = Station(code="BWN", name="Barddhaman Junction", latitude=23.2494, longitude=87.8698, zone="ER", total_platforms=8)
    dgr = Station(code="DGR", name="Durgapur", latitude=23.5477, longitude=87.2917, zone="ER", total_platforms=5)
    asn = Station(code="ASN", name="Asansol Junction", latitude=23.6835, longitude=86.9825, zone="ER", total_platforms=7)

    db.add_all([hwh, bwn, dgr, asn])
    db.commit()

    # 2. Route
    route = Route(
        name="Howrah - Asansol Main Line",
        origin_station_id=hwh.id,
        destination_station_id=asn.id,
        total_distance_km=200.0
    )
    db.add(route)
    db.commit()

    # 3. Route Sections
    sec1 = RouteSection(
        route_id=route.id,
        from_station_id=hwh.id,
        to_station_id=bwn.id,
        distance_km=95.0,
        max_speed_kmh=130.0,
        min_dwell_minutes=3,
        sequence_order=1
    )
    sec2 = RouteSection(
        route_id=route.id,
        from_station_id=bwn.id,
        to_station_id=dgr.id,
        distance_km=63.0,
        max_speed_kmh=110.0,
        min_dwell_minutes=2,
        sequence_order=2
    )
    sec3 = RouteSection(
        route_id=route.id,
        from_station_id=dgr.id,
        to_station_id=asn.id,
        distance_km=42.0,
        max_speed_kmh=110.0,
        min_dwell_minutes=3,
        sequence_order=3
    )

    db.add_all([sec1, sec2, sec3])
    db.commit()

    # 4. Trains
    train1 = Train(
        train_number="12301",
        train_name="Howrah - New Delhi Rajdhani Express",
        train_type="Superfast Express",
        origin_station_id=hwh.id,
        destination_station_id=asn.id,
        route_id=route.id
    )
    train2 = Train(
        train_number="12339",
        train_name="Coalfield Express",
        train_type="Express",
        origin_station_id=hwh.id,
        destination_station_id=asn.id,
        route_id=route.id
    )
    db.add_all([train1, train2])
    db.commit()

    # 5. Initial Train Location
    loc1 = TrainLocation(
        train_id=train1.id,
        latitude=22.5839,
        longitude=88.3426,
        speed_kmh=65.0,
        delay_minutes=0.0,
        current_section_id=sec1.id
    )
    db.add(loc1)
    db.commit()

    print("Database seeding completed successfully!")
