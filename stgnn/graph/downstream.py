from __future__ import annotations

import math
from typing import Iterable, Tuple

import numpy as np
import pandas as pd

from stgnn.config import LAT_COL, LON_COL, STATION_ID_COL
from stgnn.graph.river_clusters import RiverCluster


def build_downstream_edges(
    stations: pd.DataFrame,
    clusters: Iterable[RiverCluster],
    k_neighbors: int = 3,
    max_km: float = 150.0,
    distance_scale_km: float = 50.0,
    ensure_chain: bool = True,
) -> pd.DataFrame:
    clusters_by_name = {cluster.name: cluster for cluster in clusters}
    edges: dict[Tuple[int, int], dict] = {}

    for cluster_name, group in stations.groupby("river_cluster"):
        if len(group) < 2:
            continue
        cluster = clusters_by_name.get(
            cluster_name, RiverCluster(name=cluster_name, bbox=(0, 0, 0, 0))
        )
        origin, axis = _flow_axis(cluster, group)
        projections = _project_group(group, origin, axis)

        station_ids = group[STATION_ID_COL].tolist()
        lats = group[LAT_COL].tolist()
        lons = group[LON_COL].tolist()

        for idx, src_id in enumerate(station_ids):
            src_proj = projections[idx]
            candidates = []
            for jdx, dst_id in enumerate(station_ids):
                if src_id == dst_id:
                    continue
                if projections[jdx] <= src_proj:
                    continue
                distance_km = haversine_km(lats[idx], lons[idx], lats[jdx], lons[jdx])
                if distance_km > max_km:
                    continue
                candidates.append((distance_km, dst_id))

            candidates.sort(key=lambda x: x[0])
            for distance_km, dst_id in candidates[:k_neighbors]:
                _add_edge(
                    edges,
                    src_id,
                    dst_id,
                    cluster_name,
                    distance_km,
                    distance_scale_km,
                    "downstream",
                )

        if ensure_chain:
            ordered = sorted(zip(station_ids, projections, lats, lons), key=lambda x: x[1])
            for (src_id, _, src_lat, src_lon), (dst_id, _, dst_lat, dst_lon) in zip(
                ordered[:-1], ordered[1:]
            ):
                distance_km = haversine_km(src_lat, src_lon, dst_lat, dst_lon)
                _add_edge(
                    edges,
                    src_id,
                    dst_id,
                    cluster_name,
                    distance_km,
                    distance_scale_km,
                    "chain",
                )

    return pd.DataFrame(edges.values())


def _flow_axis(cluster: RiverCluster, group: pd.DataFrame) -> Tuple[Tuple[float, float], Tuple[float, float]]:
    if cluster.source and cluster.mouth:
        src_lat, src_lon = cluster.source
        mouth_lat, mouth_lon = cluster.mouth
        origin = (src_lon, src_lat)
        axis = (mouth_lon - src_lon, mouth_lat - src_lat)
    else:
        origin = (group[LON_COL].mean(), group[LAT_COL].mean())
        axis = _pca_axis(group)
        if axis[1] > 0:
            axis = (-axis[0], -axis[1])

    axis = _normalize(axis)
    return origin, axis


def _pca_axis(group: pd.DataFrame) -> Tuple[float, float]:
    coords = group[[LON_COL, LAT_COL]].dropna().values
    if len(coords) < 2:
        return (1.0, 0.0)
    centered = coords - coords.mean(axis=0)
    cov = np.cov(centered.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    axis = eigvecs[:, int(np.argmax(eigvals))]
    return (float(axis[0]), float(axis[1]))


def _project_group(
    group: pd.DataFrame, origin: Tuple[float, float], axis: Tuple[float, float]
) -> np.ndarray:
    lons = group[LON_COL].to_numpy()
    lats = group[LAT_COL].to_numpy()
    dx = lons - origin[0]
    dy = lats - origin[1]
    return dx * axis[0] + dy * axis[1]


def _normalize(vec: Tuple[float, float]) -> Tuple[float, float]:
    norm = math.hypot(vec[0], vec[1])
    if norm == 0:
        return (1.0, 0.0)
    return (vec[0] / norm, vec[1] / norm)


def _add_edge(
    edges: dict,
    src_id: int,
    dst_id: int,
    cluster_name: str,
    distance_km: float,
    distance_scale_km: float,
    edge_type: str,
) -> None:
    key = (src_id, dst_id)
    if key in edges:
        return
    weight = math.exp(-distance_km / max(distance_scale_km, 1e-6))
    edges[key] = {
        "src": src_id,
        "dst": dst_id,
        "cluster": cluster_name,
        "distance_km": distance_km,
        "weight": weight,
        "edge_type": edge_type,
    }


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c
