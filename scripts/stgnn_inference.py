#!/usr/bin/env python
"""
STGNN Inference Script

Load a trained model and run inference on sensor data.

Usage:
    python scripts/stgnn_inference.py
    python scripts/stgnn_inference.py --checkpoint artifacts/checkpoints/best_model.pt
    python scripts/stgnn_inference.py --output predictions.csv
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
import torch

from stgnn.config import DATA_PATH, DEFAULT_WINDOW_CONFIG, SENSOR_COLS
from stgnn.data.io import load_sensor_data, get_station_metadata
from stgnn.data.windows import build_tensor, make_windows
from stgnn.model import STGNN, STGNNConfig
from stgnn.model.config import SEVERITY_CLASSES
from stgnn.training import load_graph_tensors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run STGNN inference on water quality data",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "--checkpoint",
        type=str,
        default="artifacts/checkpoints/best_model.pt",
        help="Path to model checkpoint",
    )
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to sensor CSV (default: from config)",
    )
    parser.add_argument(
        "--graph-dir",
        type=str,
        default="artifacts/graph",
        help="Directory with nodes.csv and edges.csv",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="artifacts/predictions/latest_predictions.csv",
        help="Output CSV path for predictions",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        choices=["cpu", "cuda", "mps"],
        help="Device for inference",
    )

    return parser.parse_args()


def load_model(checkpoint_path: Path, device: str) -> tuple[STGNN, dict]:
    """Load trained model from checkpoint."""
    checkpoint = torch.load(checkpoint_path, map_location=device)

    config_dict = checkpoint["config"]
    config = STGNNConfig(
        input_features=config_dict.get("input_features", 8),
        hidden_dim=config_dict.get("hidden_dim", 64),
        num_gat_layers=config_dict.get("num_gat_layers", 2),
        num_heads=config_dict.get("num_heads", 4),
        temporal_type=config_dict.get("temporal_type", "gru"),
        num_classes=config_dict.get("num_classes", 5),
        dropout=config_dict.get("dropout", 0.3),
    )

    # We need num_nodes, get from checkpoint or use default
    num_nodes = checkpoint.get("num_nodes", 168)

    model = STGNN(config, num_nodes=num_nodes)
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()

    return model, checkpoint


def run_inference(
    model: STGNN,
    x: torch.Tensor,
    edge_index: torch.Tensor,
    edge_attr: torch.Tensor,
    device: str,
) -> tuple[np.ndarray, np.ndarray]:
    """Run inference and return predictions and probabilities."""
    model.eval()

    with torch.no_grad():
        x = x.to(device)
        edge_index = edge_index.to(device)
        edge_attr = edge_attr.to(device)

        logits = model(x, edge_index, edge_attr)
        probs = torch.softmax(logits, dim=-1)
        preds = logits.argmax(dim=-1)

    return preds.cpu().numpy(), probs.cpu().numpy()


def main() -> None:
    args = parse_args()

    print("=" * 60)
    print("STGNN Inference")
    print("=" * 60)

    # Load model
    print("\n[1/4] Loading model...")
    checkpoint_path = ROOT / args.checkpoint
    model, checkpoint = load_model(checkpoint_path, args.device)
    print(f"  Loaded from: {checkpoint_path}")
    print(f"  Best val_loss: {checkpoint.get('best_val_loss', 'N/A')}")

    # Load data
    print("\n[2/4] Loading sensor data...")
    data_path = Path(args.data) if args.data else DATA_PATH
    df = load_sensor_data(path=data_path)
    station_metadata = get_station_metadata(df)
    print(f"  Loaded {len(df)} records from {len(station_metadata)} stations")

    # Build tensors
    print("\n[3/4] Preparing input tensors...")
    timestamps, station_ids, data, mask = build_tensor(
        df,
        freq=DEFAULT_WINDOW_CONFIG["freq"],
    )

    X_windows, Y_windows = make_windows(
        data,
        lookback_steps=DEFAULT_WINDOW_CONFIG["lookback_steps"],
        horizon_steps=DEFAULT_WINDOW_CONFIG["horizon_steps"],
    )
    print(f"  Windows: {len(X_windows)} samples")

    # Load graph
    graph_dir = ROOT / args.graph_dir
    edge_index, edge_attr = load_graph_tensors(
        graph_dir / "nodes.csv",
        graph_dir / "edges.csv",
        station_ids,
    )

    # Run inference on most recent window
    print("\n[4/4] Running inference...")

    # Get the most recent window
    latest_idx = -1
    x = X_windows[latest_idx]  # (T, N, F)
    x = np.transpose(x, (1, 0, 2))  # (N, T, F)
    x = np.nan_to_num(x, nan=0.0)
    x = torch.tensor(x, dtype=torch.float32).unsqueeze(0)  # (1, N, T, F)

    preds, probs = run_inference(model, x, edge_index, edge_attr, args.device)

    # Flatten predictions
    preds = preds.flatten()  # (N,)
    probs = probs.squeeze(0)  # (N, C)

    # Create results DataFrame
    results = []
    for i, station_id in enumerate(station_ids):
        station_info = station_metadata[station_metadata["STN code"] == station_id]

        if len(station_info) > 0:
            location = station_info["Monitoring Location"].iloc[0]
            state = station_info["State Name"].iloc[0]
            lat = station_info["latitude"].iloc[0]
            lon = station_info["longitude"].iloc[0]
        else:
            location = "Unknown"
            state = "Unknown"
            lat = np.nan
            lon = np.nan

        severity_idx = preds[i]
        severity_label = SEVERITY_CLASSES[severity_idx]

        results.append({
            "station_id": station_id,
            "location": location,
            "state": state,
            "latitude": lat,
            "longitude": lon,
            "predicted_severity": severity_label,
            "severity_index": int(severity_idx),
            "prob_SAFE": float(probs[i, 0]),
            "prob_LOW": float(probs[i, 1]),
            "prob_MEDIUM": float(probs[i, 2]),
            "prob_HIGH": float(probs[i, 3]),
            "prob_CRITICAL": float(probs[i, 4]),
            "confidence": float(probs[i, severity_idx]),
        })

    results_df = pd.DataFrame(results)

    # Save predictions
    output_path = ROOT / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    results_df.to_csv(output_path, index=False)
    print(f"\n  Predictions saved to: {output_path}")

    # Print summary
    print("\n" + "=" * 60)
    print("Prediction Summary")
    print("=" * 60)

    severity_counts = results_df["predicted_severity"].value_counts()
    print("\nSeverity Distribution:")
    for severity in SEVERITY_CLASSES:
        count = severity_counts.get(severity, 0)
        pct = count / len(results_df) * 100
        print(f"  {severity:10}: {count:3d} stations ({pct:.1f}%)")

    # Show critical stations
    critical = results_df[results_df["severity_index"] >= 3]  # HIGH or CRITICAL
    if len(critical) > 0:
        print(f"\n{len(critical)} stations with HIGH/CRITICAL severity:")
        for _, row in critical.head(10).iterrows():
            print(f"  - {row['location'][:40]:40} | {row['predicted_severity']:8} | {row['confidence']:.2%}")

    # Save summary metrics
    summary = {
        "timestamp": pd.Timestamp.now().isoformat(),
        "checkpoint": str(checkpoint_path),
        "num_stations": len(results_df),
        "severity_distribution": severity_counts.to_dict(),
        "critical_count": int((results_df["severity_index"] >= 4).sum()),
        "high_count": int((results_df["severity_index"] == 3).sum()),
        "medium_count": int((results_df["severity_index"] == 2).sum()),
        "low_count": int((results_df["severity_index"] == 1).sum()),
        "safe_count": int((results_df["severity_index"] == 0).sum()),
        "average_confidence": float(results_df["confidence"].mean()),
    }

    summary_path = output_path.parent / "inference_summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\nSummary saved to: {summary_path}")

    print("\n" + "=" * 60)
    print("Inference complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
