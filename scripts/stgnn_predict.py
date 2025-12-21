#!/usr/bin/env python
"""
STGNN Inference Script

Run inference with a trained STGNN model to predict water quality severity.

Usage:
    python scripts/stgnn_predict.py
    python scripts/stgnn_predict.py --checkpoint artifacts/checkpoints/best_model.pt
    python scripts/stgnn_predict.py --output artifacts/predictions.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

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
from stgnn.training.dataset import collate_stgnn, STGNNDataset
from stgnn.evaluation import compute_metrics


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run STGNN inference for water quality severity prediction",
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
        default="artifacts/predictions.json",
        help="Output path for predictions JSON",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        choices=["auto", "cuda", "mps", "cpu"],
        help="Device for inference",
    )

    return parser.parse_args()


def load_model(checkpoint_path: Path, device: torch.device) -> STGNN:
    """Load trained model from checkpoint."""
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    config_dict = checkpoint["config"]

    config = STGNNConfig(
        input_features=config_dict["input_features"],
        hidden_dim=config_dict["hidden_dim"],
        num_gat_layers=config_dict["num_gat_layers"],
        num_heads=config_dict["num_heads"],
        temporal_type=config_dict["temporal_type"],
        num_classes=config_dict["num_classes"],
        dropout=config_dict["dropout"],
    )

    # We need num_nodes, get from graph
    model = STGNN(config, num_nodes=168)  # Will be overwritten
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()

    return model, checkpoint


def main() -> None:
    args = parse_args()

    # Determine device
    if args.device == "auto":
        if torch.cuda.is_available():
            device = torch.device("cuda")
        elif torch.backends.mps.is_available():
            device = torch.device("mps")
        else:
            device = torch.device("cpu")
    else:
        device = torch.device(args.device)

    print("=" * 60)
    print("STGNN Inference Pipeline")
    print("=" * 60)
    print(f"Device: {device}")

    # Load checkpoint
    checkpoint_path = ROOT / args.checkpoint
    print(f"\n[1/5] Loading model from {checkpoint_path}")
    model, checkpoint = load_model(checkpoint_path, device)
    print(f"  Model loaded (epoch {checkpoint['epoch']}, val_loss: {checkpoint['best_val_loss']:.4f})")

    # Load data
    print("\n[2/5] Loading sensor data...")
    data_path = Path(args.data) if args.data else DATA_PATH
    df = load_sensor_data(path=data_path)
    station_meta = get_station_metadata(df)
    print(f"  Loaded {len(df)} records from {len(station_meta)} stations")

    # Build tensor and windows
    print("\n[3/5] Building temporal windows...")
    timestamps, station_ids, data, mask = build_tensor(
        df,
        freq=DEFAULT_WINDOW_CONFIG["freq"],
    )

    X_windows, Y_windows = make_windows(
        data,
        lookback_steps=DEFAULT_WINDOW_CONFIG["lookback_steps"],
        horizon_steps=DEFAULT_WINDOW_CONFIG["horizon_steps"],
    )
    print(f"  Created {len(X_windows)} prediction windows")

    # Load graph
    print("\n[4/5] Loading graph structure...")
    graph_dir = ROOT / args.graph_dir
    edge_index, edge_attr = load_graph_tensors(
        graph_dir / "nodes.csv",
        graph_dir / "edges.csv",
        station_ids,
    )
    edge_index = edge_index.to(device)
    edge_attr = edge_attr.to(device)

    # Run inference
    print("\n[5/5] Running inference...")
    all_predictions = []
    all_probabilities = []

    model.eval()
    with torch.no_grad():
        for i in range(len(X_windows)):
            # Prepare input
            x = X_windows[i]  # (T, N, F)
            x = np.transpose(x, (1, 0, 2))  # (N, T, F)
            x = np.nan_to_num(x, nan=0.0)
            x = torch.tensor(x, dtype=torch.float32).unsqueeze(0).to(device)  # (1, N, T, F)

            # Forward pass
            logits = model(x, edge_index, edge_attr)
            probs = torch.softmax(logits, dim=-1)
            preds = logits.argmax(dim=-1)

            all_predictions.append(preds.cpu().numpy())
            all_probabilities.append(probs.cpu().numpy())

    predictions = np.concatenate(all_predictions, axis=0)  # (num_samples, N)
    probabilities = np.concatenate(all_probabilities, axis=0)  # (num_samples, N, C)

    # Create output structure
    print("\nPreparing output...")

    # Get the last window's predictions as "current" predictions
    last_predictions = predictions[-1]  # (N,)
    last_probabilities = probabilities[-1]  # (N, C)

    # Build station predictions
    station_predictions = []
    for i, station_id in enumerate(station_ids):
        pred_class = int(last_predictions[i])
        pred_probs = last_probabilities[i].tolist()

        station_pred = {
            "station_id": int(station_id),
            "predicted_severity": SEVERITY_CLASSES[pred_class],
            "severity_index": pred_class,
            "probabilities": {
                SEVERITY_CLASSES[j]: round(pred_probs[j], 4)
                for j in range(len(SEVERITY_CLASSES))
            },
            "confidence": round(max(pred_probs), 4),
        }

        # Add station metadata if available
        meta = station_meta[station_meta["STN code"] == station_id]
        if not meta.empty:
            row = meta.iloc[0]
            station_pred["location"] = row.get("Monitoring Location", "")
            station_pred["state"] = row.get("State Name", "")
            station_pred["latitude"] = float(row.get("latitude", 0)) if pd.notna(row.get("latitude")) else None
            station_pred["longitude"] = float(row.get("longitude", 0)) if pd.notna(row.get("longitude")) else None

        station_predictions.append(station_pred)

    # Compute summary statistics
    severity_counts = {s: 0 for s in SEVERITY_CLASSES}
    for pred in last_predictions:
        severity_counts[SEVERITY_CLASSES[pred]] += 1

    output = {
        "metadata": {
            "model_checkpoint": str(checkpoint_path),
            "model_epoch": checkpoint["epoch"],
            "model_val_loss": float(checkpoint["best_val_loss"]),
            "inference_timestamp": datetime.now().isoformat(),
            "num_stations": len(station_ids),
            "num_windows": len(X_windows),
            "device": str(device),
        },
        "summary": {
            "severity_distribution": severity_counts,
            "high_risk_stations": sum(1 for p in last_predictions if p >= 3),  # HIGH or CRITICAL
            "average_confidence": float(np.mean([max(p) for p in last_probabilities])),
        },
        "predictions": station_predictions,
    }

    # Save output
    output_path = ROOT / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nResults saved to: {output_path}")

    # Print summary
    print("\n" + "=" * 60)
    print("Prediction Summary")
    print("=" * 60)
    print(f"\nSeverity Distribution:")
    for severity, count in severity_counts.items():
        pct = count / len(station_ids) * 100
        print(f"  {severity:10}: {count:3d} stations ({pct:5.1f}%)")

    print(f"\nHigh-risk stations (HIGH/CRITICAL): {output['summary']['high_risk_stations']}")
    print(f"Average prediction confidence: {output['summary']['average_confidence']:.2%}")

    # Show top 5 high-risk stations
    high_risk = [p for p in station_predictions if p["severity_index"] >= 3]
    high_risk.sort(key=lambda x: x["severity_index"], reverse=True)

    if high_risk:
        print("\nTop High-Risk Stations:")
        for p in high_risk[:5]:
            print(f"  Station {p['station_id']}: {p['predicted_severity']} ({p['confidence']:.1%} confidence)")
            if p.get("location"):
                print(f"    Location: {p['location']}, {p.get('state', '')}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
