"""Graph service for upstream source tracing using STGNN river network."""

import pandas as pd
from pathlib import Path
from typing import Optional
from collections import defaultdict

from ..config import get_settings
from ..utils.geospatial import haversine_km
from ..models.schemas import TraceNode, PathSegment


class GraphService:
    """Service for river network graph operations and upstream tracing."""

    def __init__(self):
        settings = get_settings()
        self.nodes_path = settings.nodes_path
        self.edges_path = settings.edges_path
        self._nodes_df: Optional[pd.DataFrame] = None
        self._edges_df: Optional[pd.DataFrame] = None
        self._upstream_adj: dict[str, list[dict]] = {}
        self._downstream_adj: dict[str, list[dict]] = {}

    def _load_data(self):
        """Load nodes and edges data from CSV files."""
        if self._nodes_df is None:
            self._nodes_df = pd.read_csv(self.nodes_path)
            # Create station lookup by code
            self._station_lookup = {
                str(row["STN code"]): {
                    "station_code": str(row["STN code"]),
                    "station_name": row["Monitoring Location"],
                    "location": f"{row['Type Water Body']} - {row['State Name']}",
                    "lat": row["latitude"],
                    "lon": row["longitude"],
                    "river_cluster": row["river_cluster"],
                }
                for _, row in self._nodes_df.iterrows()
            }

        if self._edges_df is None:
            self._edges_df = pd.read_csv(self.edges_path)
            # Build adjacency lists (downstream edges go src -> dst)
            # For upstream tracing, we need reverse: dst -> src
            for _, edge in self._edges_df.iterrows():
                src = str(edge["src"])
                dst = str(edge["dst"])
                edge_info = {
                    "station": src,
                    "distance_km": edge["distance_km"],
                    "weight": edge["weight"],
                    "cluster": edge["cluster"],
                }
                # Upstream adjacency: from dst, go back to src
                if dst not in self._upstream_adj:
                    self._upstream_adj[dst] = []
                self._upstream_adj[dst].append(edge_info)

                # Downstream adjacency: from src, go to dst
                edge_info_down = {
                    "station": dst,
                    "distance_km": edge["distance_km"],
                    "weight": edge["weight"],
                    "cluster": edge["cluster"],
                }
                if src not in self._downstream_adj:
                    self._downstream_adj[src] = []
                self._downstream_adj[src].append(edge_info_down)

    def get_station_info(self, station_code: str) -> Optional[dict]:
        """Get station information by code."""
        self._load_data()
        return self._station_lookup.get(str(station_code))

    def get_all_stations(self) -> list[dict]:
        """Get all monitoring stations."""
        self._load_data()
        return list(self._station_lookup.values())

    def get_stations_by_cluster(self, cluster: str) -> list[dict]:
        """Get all stations in a river cluster."""
        self._load_data()
        return [s for s in self._station_lookup.values() if s["river_cluster"] == cluster]

    def trace_upstream(
        self,
        station_code: str,
        max_hops: int = 5,
        river_cluster: Optional[str] = None,
    ) -> list[TraceNode]:
        """
        Trace upstream from a detection station to find potential pollution sources.

        Args:
            station_code: The station code where anomaly was detected
            max_hops: Maximum number of hops upstream to trace
            river_cluster: Optional filter to stay within a river cluster

        Returns:
            List of TraceNode objects representing the upstream path
        """
        self._load_data()

        station_code = str(station_code)
        start_station = self._station_lookup.get(station_code)
        if not start_station:
            return []

        # Use BFS to trace upstream
        path: list[TraceNode] = []
        visited = set()
        queue = [(station_code, 0, 0.0)]  # (station, depth, cumulative_distance)

        while queue and len(path) < max_hops + 1:
            current, depth, cum_distance = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)

            station_info = self._station_lookup.get(current)
            if not station_info:
                continue

            # Filter by river cluster if specified
            if river_cluster and station_info["river_cluster"] != river_cluster:
                continue

            path.append(
                TraceNode(
                    station_code=current,
                    station_name=station_info["station_name"],
                    location=station_info["location"],
                    coordinates=(station_info["lat"], station_info["lon"]),
                    depth=depth,
                    distance_km=round(cum_distance, 2),
                )
            )

            # Add upstream neighbors to queue
            if current in self._upstream_adj:
                for upstream in self._upstream_adj[current]:
                    if upstream["station"] not in visited:
                        new_distance = cum_distance + upstream["distance_km"]
                        queue.append((upstream["station"], depth + 1, new_distance))

        return path

    def get_river_cluster(self, station_code: str) -> Optional[str]:
        """Get the river cluster for a station."""
        station = self.get_station_info(station_code)
        return station["river_cluster"] if station else None

    def find_nearest_station(self, lat: float, lon: float) -> Optional[dict]:
        """Find the nearest monitoring station to given coordinates."""
        self._load_data()

        nearest = None
        min_distance = float("inf")

        for station in self._station_lookup.values():
            distance = haversine_km(lat, lon, station["lat"], station["lon"])
            if distance < min_distance:
                min_distance = distance
                nearest = {**station, "distance_km": round(distance, 2)}

        return nearest

    def get_path_geometry(self, trace_nodes: list[TraceNode]) -> list[tuple[float, float]]:
        """
        Convert trace nodes to a path geometry for map visualization.

        Returns list of [lon, lat] coordinates (GeoJSON format).
        """
        if not trace_nodes:
            return []

        # Extract coordinates from each node
        # Note: GeoJSON uses [lon, lat] order
        path = []
        for node in trace_nodes:
            lat, lon = node.coordinates
            path.append((lon, lat))

        return path

    def get_path_segments(
        self,
        trace_nodes: list[TraceNode],
        animation_duration_ms: int = 5000,
    ) -> list[PathSegment]:
        """
        Create path segments for animated visualization.

        Each segment connects two consecutive stations with timing
        information for the animation.

        Args:
            trace_nodes: List of trace nodes
            animation_duration_ms: Total animation duration in milliseconds

        Returns:
            List of PathSegment objects with coordinates and timing
        """
        if len(trace_nodes) < 2:
            return []

        segments = []
        total_distance = trace_nodes[-1].distance_km if trace_nodes else 0

        for i in range(len(trace_nodes) - 1):
            from_node = trace_nodes[i]
            to_node = trace_nodes[i + 1]

            from_lat, from_lon = from_node.coordinates
            to_lat, to_lon = to_node.coordinates

            # Calculate intermediate points for smoother animation
            # Using simple linear interpolation
            num_points = max(5, int((to_node.distance_km - from_node.distance_km) * 2))
            coordinates = []

            for j in range(num_points + 1):
                t = j / num_points
                interp_lon = from_lon + t * (to_lon - from_lon)
                interp_lat = from_lat + t * (to_lat - from_lat)
                coordinates.append((interp_lon, interp_lat))

            # Calculate timestamp based on distance proportion
            if total_distance > 0:
                start_ratio = from_node.distance_km / total_distance
                timestamp = int(start_ratio * animation_duration_ms)
            else:
                timestamp = 0

            segment_distance = to_node.distance_km - from_node.distance_km

            segments.append(
                PathSegment(
                    from_station=from_node.station_code,
                    to_station=to_node.station_code,
                    coordinates=coordinates,
                    distance_km=round(segment_distance, 2),
                    timestamp=timestamp,
                )
            )

        return segments

    def get_trip_path_for_animation(
        self,
        trace_nodes: list[TraceNode],
        animation_duration_ms: int = 5000,
    ) -> list[dict]:
        """
        Generate trip path data compatible with deck.gl TripsLayer.

        Returns a list of paths where each path has:
        - path: array of [lon, lat, timestamp] coordinates
        - timestamps: array of timestamps for each coordinate

        This format is optimized for the TripsLayer animation.
        """
        if not trace_nodes:
            return []

        total_distance = trace_nodes[-1].distance_km if trace_nodes else 0
        if total_distance == 0:
            total_distance = 1  # Avoid division by zero

        # Build single path with timestamps
        path_coords = []
        timestamps = []

        for node in trace_nodes:
            lat, lon = node.coordinates
            # Calculate timestamp based on distance
            time_ratio = node.distance_km / total_distance
            timestamp = int(time_ratio * animation_duration_ms)

            path_coords.append([lon, lat, timestamp])
            timestamps.append(timestamp)

        # Add intermediate points for smoother animation
        smooth_path = []
        smooth_timestamps = []

        for i in range(len(path_coords) - 1):
            start = path_coords[i]
            end = path_coords[i + 1]

            # Add interpolated points
            num_interp = 10  # Points between stations
            for j in range(num_interp):
                t = j / num_interp
                interp_lon = start[0] + t * (end[0] - start[0])
                interp_lat = start[1] + t * (end[1] - start[1])
                interp_time = start[2] + t * (end[2] - start[2])

                smooth_path.append([interp_lon, interp_lat, int(interp_time)])
                smooth_timestamps.append(int(interp_time))

        # Add final point
        if path_coords:
            smooth_path.append(path_coords[-1])
            smooth_timestamps.append(path_coords[-1][2])

        return [
            {
                "path": smooth_path,
                "timestamps": smooth_timestamps,
                "color": [255, 100, 100],  # Red for pollution trace
            }
        ]


# Singleton instance
_graph_service: Optional[GraphService] = None


def get_graph_service() -> GraphService:
    """Get singleton graph service instance."""
    global _graph_service
    if _graph_service is None:
        _graph_service = GraphService()
    return _graph_service
