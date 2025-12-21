from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

import pandas as pd

from stgnn.config import LAT_COL, LON_COL, LOCATION_COL


@dataclass(frozen=True)
class RiverCluster:
    name: str
    bbox: tuple[float, float, float, float]
    source: Optional[tuple[float, float]] = None
    mouth: Optional[tuple[float, float]] = None
    aliases: tuple[str, ...] = ()


DEFAULT_RIVER_CLUSTERS = [
    RiverCluster(
        name="GANGA",
        bbox=(21.0, 31.5, 73.0, 90.5),
        source=(30.99, 78.93),
        mouth=(21.6, 88.1),
        aliases=("GANGA", "GANGES"),
    ),
    RiverCluster(
        name="BRAHMAPUTRA",
        bbox=(24.0, 31.5, 88.0, 97.5),
        source=(31.2, 82.3),
        mouth=(24.3, 90.7),
        aliases=("BRAHMAPUTRA",),
    ),
    RiverCluster(
        name="GODAVARI",
        bbox=(14.5, 22.5, 73.0, 83.5),
        source=(19.93, 73.53),
        mouth=(16.0, 82.3),
        aliases=("GODAVARI",),
    ),
    RiverCluster(
        name="KRISHNA",
        bbox=(13.5, 19.5, 73.0, 81.5),
        source=(17.92, 73.66),
        mouth=(15.9, 80.9),
        aliases=("KRISHNA",),
    ),
    RiverCluster(
        name="NARMADA",
        bbox=(20.5, 24.5, 72.0, 82.0),
        source=(22.7, 81.7),
        mouth=(21.7, 72.6),
        aliases=("NARMADA",),
    ),
    RiverCluster(
        name="MAHANADI",
        bbox=(18.0, 23.5, 81.0, 87.5),
        source=(20.5, 81.9),
        mouth=(20.3, 86.7),
        aliases=("MAHANADI",),
    ),
    RiverCluster(
        name="TAPI",
        bbox=(20.0, 22.5, 72.0, 78.5),
        source=(21.8, 78.3),
        mouth=(21.2, 72.6),
        aliases=("TAPI", "TAPTI"),
    ),
    RiverCluster(
        name="CAUVERY",
        bbox=(10.0, 13.8, 74.0, 80.5),
        source=(12.4, 75.8),
        mouth=(11.1, 79.8),
        aliases=("CAUVERY", "KAVERI"),
    ),
    RiverCluster(
        name="YAMUNA",
        bbox=(23.5, 31.5, 74.0, 82.5),
        source=(31.0, 78.4),
        mouth=(25.4, 81.9),
        aliases=("YAMUNA",),
    ),
]


def assign_clusters(
    stations: pd.DataFrame,
    clusters: Iterable[RiverCluster] = DEFAULT_RIVER_CLUSTERS,
    use_name: bool = True,
    use_bbox: bool = True,
) -> pd.Series:
    clusters = list(clusters)
    name_map = _build_alias_map(clusters)

    assigned = pd.Series([None] * len(stations), index=stations.index, dtype=object)

    if use_name:
        locations = stations[LOCATION_COL].fillna("").astype(str).str.upper()
        for idx, value in locations.items():
            for alias, cluster_name in name_map.items():
                if alias in value:
                    assigned.at[idx] = cluster_name
                    break

    if use_bbox:
        for idx, row in stations[assigned.isna()].iterrows():
            lat = row[LAT_COL]
            lon = row[LON_COL]
            if pd.isna(lat) or pd.isna(lon):
                continue
            candidates = [
                cluster
                for cluster in clusters
                if _point_in_bbox(lat, lon, cluster.bbox)
            ]
            if candidates:
                assigned.at[idx] = _pick_best_cluster(lat, lon, candidates)

    assigned = assigned.fillna("OTHER")
    return assigned


def assign_clusters_from_shapefile(
    stations: pd.DataFrame,
    shapefile_path: str,
    name_field: str,
) -> pd.Series:
    try:
        import geopandas as gpd
    except ImportError as exc:
        raise ImportError("geopandas is required for shapefile clustering") from exc

    gdf = gpd.read_file(shapefile_path)
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    else:
        gdf = gdf.to_crs("EPSG:4326")

    points = gpd.GeoDataFrame(
        stations.copy(),
        geometry=gpd.points_from_xy(stations[LON_COL], stations[LAT_COL]),
        crs="EPSG:4326",
    )

    joined = gpd.sjoin(points, gdf[[name_field, "geometry"]], how="left", predicate="within")
    return joined[name_field].fillna("OTHER")


def _build_alias_map(clusters: Iterable[RiverCluster]) -> dict[str, str]:
    alias_map: dict[str, str] = {}
    for cluster in clusters:
        for alias in cluster.aliases:
            alias_map[alias.upper()] = cluster.name
    return alias_map


def _point_in_bbox(lat: float, lon: float, bbox: tuple[float, float, float, float]) -> bool:
    min_lat, max_lat, min_lon, max_lon = bbox
    return min_lat <= lat <= max_lat and min_lon <= lon <= max_lon


def _pick_best_cluster(lat: float, lon: float, candidates: list[RiverCluster]) -> str:
    best_name = candidates[0].name
    best_score = float("inf")
    for cluster in candidates:
        score = _distance_to_axis(lat, lon, cluster)
        if score < best_score:
            best_score = score
            best_name = cluster.name
    return best_name


def _distance_to_axis(lat: float, lon: float, cluster: RiverCluster) -> float:
    if cluster.source and cluster.mouth:
        src_lat, src_lon = cluster.source
        mouth_lat, mouth_lon = cluster.mouth
        dx = mouth_lon - src_lon
        dy = mouth_lat - src_lat
        if dx == 0 and dy == 0:
            return (lat - src_lat) ** 2 + (lon - src_lon) ** 2
        t = ((lon - src_lon) * dx + (lat - src_lat) * dy) / (dx * dx + dy * dy)
        proj_lon = src_lon + t * dx
        proj_lat = src_lat + t * dy
        return (lat - proj_lat) ** 2 + (lon - proj_lon) ** 2

    min_lat, max_lat, min_lon, max_lon = cluster.bbox
    center_lat = (min_lat + max_lat) / 2
    center_lon = (min_lon + max_lon) / 2
    return (lat - center_lat) ** 2 + (lon - center_lon) ** 2
