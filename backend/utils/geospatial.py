"""Geospatial utility functions."""

import math
from typing import TypeVar, Callable

T = TypeVar("T")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth.

    Args:
        lat1, lon1: Latitude and longitude of point 1 (in degrees)
        lat2, lon2: Latitude and longitude of point 2 (in degrees)

    Returns:
        Distance in kilometers
    """
    R = 6371.0  # Earth's radius in km

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def find_nearby_points(
    target_lat: float,
    target_lon: float,
    points: list[T],
    get_coords: Callable[[T], tuple[float, float]],
    radius_km: float,
) -> list[tuple[T, float]]:
    """
    Find points within a given radius of a target location.

    Args:
        target_lat, target_lon: Target coordinates
        points: List of points to search
        get_coords: Function to extract (lat, lon) from a point
        radius_km: Search radius in kilometers

    Returns:
        List of (point, distance_km) tuples sorted by distance
    """
    results = []

    for point in points:
        lat, lon = get_coords(point)
        distance = haversine_km(target_lat, target_lon, lat, lon)
        if distance <= radius_km:
            results.append((point, distance))

    return sorted(results, key=lambda x: x[1])
