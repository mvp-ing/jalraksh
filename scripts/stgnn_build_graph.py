from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from stgnn.data.io import load_sensor_data
from stgnn.graph.graph_builder import build_graph, save_graph


def main() -> None:
    parser = argparse.ArgumentParser(description="Build downstream graph for sensor stations")
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to the sensor CSV (defaults to stgnn.config.DATA_PATH)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="artifacts/graph",
        help="Output directory for nodes/edges CSVs",
    )
    parser.add_argument(
        "--shapefile",
        type=str,
        default=None,
        help="Optional shapefile/geopackage for basin clustering",
    )
    parser.add_argument(
        "--name-field",
        type=str,
        default=None,
        help="Field name to use for basin/river names (required with --shapefile)",
    )
    parser.add_argument(
        "--no-name",
        action="store_true",
        help="Disable name-based clustering from Monitoring Location",
    )
    parser.add_argument(
        "--no-bbox",
        action="store_true",
        help="Disable bbox-based clustering",
    )

    args = parser.parse_args()

    df = load_sensor_data(path=args.data) if args.data else load_sensor_data()
    nodes, edges = build_graph(
        df,
        shapefile_path=args.shapefile,
        shapefile_name_field=args.name_field,
        use_name=not args.no_name,
        use_bbox=not args.no_bbox,
    )
    save_graph(nodes, edges, Path(args.output))


if __name__ == "__main__":
    main()
