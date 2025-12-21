from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from stgnn.config import LAT_COL, LON_COL, LOCATION_COL, STATION_ID_COL

COLORS = [
    "#1b9e77",
    "#d95f02",
    "#7570b3",
    "#e7298a",
    "#66a61e",
    "#e6ab02",
    "#a6761d",
    "#666666",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Visualize downstream graph")
    parser.add_argument(
        "--nodes",
        type=str,
        default="artifacts/graph/nodes.csv",
        help="Path to nodes CSV",
    )
    parser.add_argument(
        "--edges",
        type=str,
        default="artifacts/graph/edges.csv",
        help="Path to edges CSV",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="artifacts/graph/graph_map.html",
        help="Output file (html or png)",
    )
    parser.add_argument(
        "--backend",
        choices=("auto", "folium", "matplotlib"),
        default="auto",
        help="Rendering backend",
    )
    parser.add_argument(
        "--max-edges",
        type=int,
        default=None,
        help="Optional cap on edges (largest weights first)",
    )
    args = parser.parse_args()

    nodes = pd.read_csv(args.nodes)
    edges = pd.read_csv(args.edges)

    _ensure_columns(nodes, [STATION_ID_COL, LAT_COL, LON_COL])
    _ensure_columns(edges, ["src", "dst"])

    nodes = nodes.dropna(subset=[LAT_COL, LON_COL])
    if args.max_edges:
        if "weight" in edges.columns:
            edges = edges.sort_values("weight", ascending=False).head(args.max_edges)
        else:
            edges = edges.head(args.max_edges)

    if args.backend == "auto":
        try:
            import folium  # noqa: F401

            args.backend = "folium"
        except ImportError:
            args.backend = "matplotlib"

    if args.backend == "folium":
        render_folium(nodes, edges, args.output)
    else:
        render_matplotlib(nodes, edges, args.output)


def render_folium(nodes: pd.DataFrame, edges: pd.DataFrame, output: str) -> None:
    try:
        import folium
    except ImportError as exc:
        raise ImportError("folium is required for html rendering") from exc

    center_lat = nodes[LAT_COL].mean()
    center_lon = nodes[LON_COL].mean()
    m = folium.Map(location=[center_lat, center_lon], zoom_start=5, tiles="CartoDB positron")

    cluster_colors = _build_color_map(nodes.get("river_cluster", pd.Series(dtype=str)))
    node_lookup = {
        int(row[STATION_ID_COL]): (row[LAT_COL], row[LON_COL], row.get("river_cluster"))
        for _, row in nodes.iterrows()
    }

    for _, row in edges.iterrows():
        src = int(row["src"])
        dst = int(row["dst"])
        if src not in node_lookup or dst not in node_lookup:
            continue
        src_lat, src_lon, cluster = node_lookup[src]
        dst_lat, dst_lon, _ = node_lookup[dst]
        color = cluster_colors.get(cluster, "#666666")
        weight = 1 + float(row.get("weight", 0.0)) * 3
        folium.PolyLine(
            locations=[(src_lat, src_lon), (dst_lat, dst_lon)],
            color=color,
            weight=weight,
            opacity=0.6,
        ).add_to(m)

    for _, row in nodes.iterrows():
        lat = row[LAT_COL]
        lon = row[LON_COL]
        cluster = row.get("river_cluster")
        color = cluster_colors.get(cluster, "#222222")
        tooltip = f"{row.get(STATION_ID_COL)} - {row.get(LOCATION_COL, '')}".strip()
        folium.CircleMarker(
            location=(lat, lon),
            radius=3,
            color=color,
            fill=True,
            fill_opacity=0.9,
            tooltip=tooltip,
        ).add_to(m)

    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    m.save(str(output_path))


def render_matplotlib(nodes: pd.DataFrame, edges: pd.DataFrame, output: str) -> None:
    try:
        import matplotlib.pyplot as plt
    except ImportError as exc:
        raise ImportError("matplotlib is required for png rendering") from exc

    cluster_colors = _build_color_map(nodes.get("river_cluster", pd.Series(dtype=str)))
    node_lookup = {
        int(row[STATION_ID_COL]): (row[LAT_COL], row[LON_COL], row.get("river_cluster"))
        for _, row in nodes.iterrows()
    }

    plt.figure(figsize=(10, 8))

    for _, row in edges.iterrows():
        src = int(row["src"])
        dst = int(row["dst"])
        if src not in node_lookup or dst not in node_lookup:
            continue
        src_lat, src_lon, cluster = node_lookup[src]
        dst_lat, dst_lon, _ = node_lookup[dst]
        color = cluster_colors.get(cluster, "#666666")
        plt.plot([src_lon, dst_lon], [src_lat, dst_lat], color=color, alpha=0.4, linewidth=0.8)

    for _, row in nodes.iterrows():
        lat = row[LAT_COL]
        lon = row[LON_COL]
        cluster = row.get("river_cluster")
        color = cluster_colors.get(cluster, "#222222")
        plt.scatter(lon, lat, s=20, c=color, edgecolors="k", linewidths=0.3)

    plt.title("River Monitoring Graph")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.grid(True, alpha=0.2)

    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(output_path, dpi=180)


def _build_color_map(values: pd.Series) -> dict:
    unique = [val for val in values.dropna().unique().tolist()]
    color_map = {}
    for idx, val in enumerate(unique):
        color_map[val] = COLORS[idx % len(COLORS)]
    return color_map


def _ensure_columns(df: pd.DataFrame, columns: list[str]) -> None:
    missing = [col for col in columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")


if __name__ == "__main__":
    main()
