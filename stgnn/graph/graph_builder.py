from __future__ import annotations

from pathlib import Path
from typing import Iterable, Optional, Tuple

import pandas as pd

from stgnn.config import DEFAULT_GRAPH_CONFIG
from stgnn.data.io import get_station_metadata
from stgnn.graph.downstream import build_downstream_edges
from stgnn.graph.river_clusters import (
    DEFAULT_RIVER_CLUSTERS,
    RiverCluster,
    assign_clusters,
    assign_clusters_from_shapefile,
)


def build_graph(
    df: pd.DataFrame,
    clusters: Iterable[RiverCluster] = DEFAULT_RIVER_CLUSTERS,
    shapefile_path: Optional[str] = None,
    shapefile_name_field: Optional[str] = None,
    use_name: bool = True,
    use_bbox: bool = True,
    graph_config: Optional[dict] = None,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    stations = get_station_metadata(df)

    if shapefile_path:
        if not shapefile_name_field:
            raise ValueError("shapefile_name_field is required when using shapefile_path")
        stations["river_cluster"] = assign_clusters_from_shapefile(
            stations, shapefile_path, shapefile_name_field
        )
    else:
        stations["river_cluster"] = assign_clusters(
            stations, clusters=clusters, use_name=use_name, use_bbox=use_bbox
        )

    config = DEFAULT_GRAPH_CONFIG.copy()
    if graph_config:
        config.update(graph_config)

    edges = build_downstream_edges(
        stations,
        clusters=clusters,
        k_neighbors=config["k_neighbors"],
        max_km=config["max_km"],
        distance_scale_km=config["distance_scale_km"],
        ensure_chain=config["ensure_chain"],
    )

    return stations, edges


def save_graph(nodes: pd.DataFrame, edges: pd.DataFrame, output_dir: str | Path) -> None:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    nodes.to_csv(output_path / "nodes.csv", index=False)
    edges.to_csv(output_path / "edges.csv", index=False)
