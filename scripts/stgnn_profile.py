from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from stgnn.data.io import load_sensor_data
from stgnn.data.profile import profile_dataset, render_profile_markdown


def main() -> None:
    parser = argparse.ArgumentParser(description="Profile the sensor dataset")
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to the sensor CSV (defaults to stgnn.config.DATA_PATH)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Write markdown summary to this path",
    )
    args = parser.parse_args()

    df = load_sensor_data(path=args.data) if args.data else load_sensor_data()
    summary = profile_dataset(df)
    markdown = render_profile_markdown(summary)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(markdown)
    else:
        print(markdown)


if __name__ == "__main__":
    main()
