"""
Route-matching algorithm for RideSync.

Matches rides based on:
1. Haversine distance between origins (pickup proximity)
2. Haversine distance between destinations
3. Departure time overlap within a configurable window
"""

import math
from datetime import datetime, timedelta
from typing import List

from sqlalchemy.orm import Session

from models import Ride, User


# Configuration constants
ORIGIN_RADIUS_KM = 3.0       # max km between rider and driver pickup points
DESTINATION_RADIUS_KM = 2.0  # max km between destinations
TIME_WINDOW_MINUTES = 30     # departure time must be within ±N minutes


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Return the great-circle distance in kilometres between two points
    specified by (lat, lng) in decimal degrees.
    """
    R = 6371.0  # Earth radius in km

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def rides_are_compatible(ride: Ride, other: Ride) -> bool:
    """
    Return True if two rides are compatible for carpooling.
    Checks origin proximity, destination proximity, and time window.
    """
    origin_dist = haversine(
        ride.origin_lat, ride.origin_lng,
        other.origin_lat, other.origin_lng,
    )
    if origin_dist > ORIGIN_RADIUS_KM:
        return False

    dest_dist = haversine(
        ride.destination_lat, ride.destination_lng,
        other.destination_lat, other.destination_lng,
    )
    if dest_dist > DESTINATION_RADIUS_KM:
        return False

    time_diff = abs(
        (ride.departure_time - other.departure_time).total_seconds() / 60
    )
    return time_diff <= TIME_WINDOW_MINUTES


def find_matching_rides(
    db: Session,
    origin_lat: float,
    origin_lng: float,
    destination_lat: float,
    destination_lng: float,
    departure_time: datetime,
    exclude_user_id: int,
) -> List[Ride]:
    """
    Find all active rides that match the given search criteria.

    Args:
        db: DB session
        origin_lat/lng: passenger's pickup coordinates
        destination_lat/lng: passenger's drop-off coordinates
        departure_time: passenger's preferred departure time
        exclude_user_id: the passenger's own user ID (exclude their own rides)

    Returns:
        List of matching Ride objects, ordered by proximity of origins.
    """
    window_start = departure_time - timedelta(minutes=TIME_WINDOW_MINUTES)
    window_end = departure_time + timedelta(minutes=TIME_WINDOW_MINUTES)

    # Pre-filter in DB on time window and availability
    candidates = (
        db.query(Ride)
        .filter(
            Ride.is_active == True,
            Ride.driver_id != exclude_user_id,
            Ride.departure_time >= window_start,
            Ride.departure_time <= window_end,
            Ride.available_seats > 0,
        )
        .all()
    )

    # Fine-filter in Python on geographic proximity
    matches = []
    for ride in candidates:
        origin_dist = haversine(origin_lat, origin_lng, ride.origin_lat, ride.origin_lng)
        dest_dist = haversine(destination_lat, destination_lng, ride.destination_lat, ride.destination_lng)
        if origin_dist <= ORIGIN_RADIUS_KM and dest_dist <= DESTINATION_RADIUS_KM:
            matches.append((origin_dist, ride))

    # Sort by origin proximity (closest pickup first)
    matches.sort(key=lambda x: x[0])
    return [ride for _, ride in matches]


def estimate_cost_share(distance_km: float, passengers: int = 2) -> float:
    """
    Estimate cost per passenger for a given route distance.
    Uses a simple per-km rate (₹8/km covers fuel + mild wear).
    """
    RATE_PER_KM = 8.0  # INR
    total_cost = distance_km * RATE_PER_KM
    return round(total_cost / passengers, 2)


def estimate_co2_saved_kg(distance_km: float, passengers: int = 2) -> float:
    """
    Estimate CO₂ saved (kg) by sharing a ride vs. travelling solo.
    Assumes 0.21 kg CO₂/km per car removed from the road.
    """
    EMISSIONS_PER_CAR_KM = 0.21  # kg CO₂
    cars_removed = passengers - 1
    return round(distance_km * EMISSIONS_PER_CAR_KM * cars_removed, 3)