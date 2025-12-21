#!/usr/bin/env python
"""
STGNN Training Script

Train a Spatio-Temporal Graph Neural Network for water quality severity prediction.

Usage:
    python scripts/stgnn_train.py
    python scripts/stgnn_train.py --hidden-dim 128 --epochs 100
    python scripts/stgnn_train.py --split temporal --train-ratio 0.7
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import torch
from torch.utils.data import DataLoader

from stgnn.config import DATA_PATH, DEFAULT_WINDOW_CONFIG, SENSOR_COLS
from stgnn.data.io import load_sensor_data
from stgnn.data.windows import build_tensor, make_windows
from stgnn.model import STGNN, STGNNConfig
from stgnn.training import STGNNDataset, load_graph_tensors, Trainer
from stgnn.training.dataset import collate_stgnn
from stgnn.evaluation import temporal_split, compute_metrics, print_classification_report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train STGNN for water quality severity prediction",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    # Data arguments
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

    # Model arguments
    parser.add_argument(
        "--hidden-dim",
        type=int,
        default=64,
        help="Hidden dimension size",
    )
    parser.add_argument(
        "--num-gat-layers",
        type=int,
        default=2,
        help="Number of GAT layers",
    )
    parser.add_argument(
        "--num-heads",
        type=int,
        default=4,
        help="Attention heads per GAT layer",
    )
    parser.add_argument(
        "--temporal-type",
        type=str,
        choices=["gru", "lstm"],
        default="gru",
        help="Temporal encoder type",
    )
    parser.add_argument(
        "--dropout",
        type=float,
        default=0.3,
        help="Dropout probability",
    )

    # Training arguments
    parser.add_argument(
        "--epochs",
        type=int,
        default=100,
        help="Maximum training epochs",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=1e-3,
        help="Learning rate",
    )
    parser.add_argument(
        "--weight-decay",
        type=float,
        default=1e-5,
        help="Weight decay (L2 regularization)",
    )
    parser.add_argument(
        "--patience",
        type=int,
        default=15,
        help="Early stopping patience",
    )

    # Split arguments
    parser.add_argument(
        "--split",
        type=str,
        choices=["temporal", "random"],
        default="temporal",
        help="Data split strategy",
    )
    parser.add_argument(
        "--train-ratio",
        type=float,
        default=0.7,
        help="Training data ratio",
    )
    parser.add_argument(
        "--val-ratio",
        type=float,
        default=0.15,
        help="Validation data ratio",
    )

    # Output arguments
    parser.add_argument(
        "--checkpoint-dir",
        type=str,
        default="artifacts/checkpoints",
        help="Checkpoint directory",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        choices=["auto", "cuda", "mps", "cpu"],
        help="Device to train on",
    )

    return parser.parse_args()


def set_seed(seed: int) -> None:
    """Set random seeds for reproducibility."""
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def main() -> None:
    args = parse_args()
    set_seed(args.seed)

    print("=" * 60)
    print("STGNN Training Pipeline")
    print("=" * 60)

    # 1. Load sensor data
    print("\n[1/6] Loading sensor data...")
    data_path = Path(args.data) if args.data else DATA_PATH
    df = load_sensor_data(path=data_path)
    print(f"  Loaded {len(df)} records")

    # 2. Build tensor and windows
    print("\n[2/6] Building temporal windows...")
    timestamps, station_ids, data, mask = build_tensor(
        df,
        freq=DEFAULT_WINDOW_CONFIG["freq"],
    )
    print(f"  Tensor shape: {data.shape} (T, N, F)")

    X_windows, Y_windows = make_windows(
        data,
        lookback_steps=DEFAULT_WINDOW_CONFIG["lookback_steps"],
        horizon_steps=DEFAULT_WINDOW_CONFIG["horizon_steps"],
    )
    print(f"  Windows: {len(X_windows)} samples")
    print(f"  X shape: {X_windows.shape}, Y shape: {Y_windows.shape}")

    # Build mask windows if available
    if mask is not None:
        mask_windows, _ = make_windows(
            mask.astype(np.float32),
            lookback_steps=DEFAULT_WINDOW_CONFIG["lookback_steps"],
            horizon_steps=DEFAULT_WINDOW_CONFIG["horizon_steps"],
        )
    else:
        mask_windows = None

    # 3. Load graph
    print("\n[3/6] Loading graph structure...")
    graph_dir = ROOT / args.graph_dir
    nodes_path = graph_dir / "nodes.csv"
    edges_path = graph_dir / "edges.csv"

    edge_index, edge_attr = load_graph_tensors(nodes_path, edges_path, station_ids)
    print(f"  Nodes: {len(station_ids)}, Edges: {edge_index.shape[1]}")

    # 4. Split data
    print("\n[4/6] Splitting data...")
    num_samples = len(X_windows)

    if args.split == "temporal":
        splits = temporal_split(num_samples, args.train_ratio, args.val_ratio)
    else:
        # Random split
        indices = np.random.permutation(num_samples)
        train_end = int(num_samples * args.train_ratio)
        val_end = int(num_samples * (args.train_ratio + args.val_ratio))
        splits = {
            "train": indices[:train_end],
            "val": indices[train_end:val_end],
            "test": indices[val_end:],
        }

    print(f"  Train: {len(splits['train'])}, Val: {len(splits['val'])}, Test: {len(splits['test'])}")

    # 5. Create datasets and loaders
    print("\n[5/6] Creating data loaders...")

    train_dataset = STGNNDataset(
        X_windows=X_windows[splits["train"]],
        Y_windows=Y_windows[splits["train"]],
        edge_index=edge_index,
        edge_attr=edge_attr,
        feature_names=SENSOR_COLS,
        mask=mask_windows[splits["train"]] if mask_windows is not None else None,
    )

    val_dataset = STGNNDataset(
        X_windows=X_windows[splits["val"]],
        Y_windows=Y_windows[splits["val"]],
        edge_index=edge_index,
        edge_attr=edge_attr,
        feature_names=SENSOR_COLS,
        mask=mask_windows[splits["val"]] if mask_windows is not None else None,
    )

    test_dataset = STGNNDataset(
        X_windows=X_windows[splits["test"]],
        Y_windows=Y_windows[splits["test"]],
        edge_index=edge_index,
        edge_attr=edge_attr,
        feature_names=SENSOR_COLS,
        mask=mask_windows[splits["test"]] if mask_windows is not None else None,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=collate_stgnn,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=collate_stgnn,
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=collate_stgnn,
    )

    # Print label distribution
    train_labels = train_dataset.labels.ravel()
    unique, counts = np.unique(train_labels, return_counts=True)
    print("  Training label distribution:")
    for u, c in zip(unique, counts):
        pct = c / len(train_labels) * 100
        print(f"    Class {u}: {c} ({pct:.1f}%)")

    # 6. Initialize model
    print("\n[6/6] Initializing model...")
    config = STGNNConfig(
        input_features=len(SENSOR_COLS),
        hidden_dim=args.hidden_dim,
        num_gat_layers=args.num_gat_layers,
        num_heads=args.num_heads,
        temporal_type=args.temporal_type,
        dropout=args.dropout,
        learning_rate=args.lr,
        weight_decay=args.weight_decay,
    )

    model = STGNN(config, num_nodes=len(station_ids))
    num_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Model parameters: {num_params:,}")

    # 7. Train
    print("\n" + "=" * 60)
    print("Starting Training")
    print("=" * 60)

    trainer = Trainer(
        model=model,
        config=config,
        train_loader=train_loader,
        val_loader=val_loader,
        device=args.device,
        checkpoint_dir=args.checkpoint_dir,
    )

    history = trainer.fit(
        epochs=args.epochs,
        patience=args.patience,
    )

    # 8. Evaluate on test set
    print("\n" + "=" * 60)
    print("Test Set Evaluation")
    print("=" * 60)

    # Load best model
    best_checkpoint = Path(args.checkpoint_dir) / "best_model.pt"
    model, _ = Trainer.load_checkpoint(best_checkpoint, model, args.device)

    # Run evaluation
    model.eval()
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for batch in test_loader:
            x = batch["x"].to(trainer.device)
            edge_index = batch["edge_index"].to(trainer.device)
            edge_attr = batch["edge_attr"].to(trainer.device)

            logits = model(x, edge_index, edge_attr)
            preds = logits.argmax(dim=-1)

            all_preds.append(preds.cpu().numpy())
            all_labels.append(batch["y"].numpy())

    all_preds = np.concatenate(all_preds).ravel()
    all_labels = np.concatenate(all_labels).ravel()

    # Compute and print metrics
    metrics = compute_metrics(all_preds, all_labels)
    print(f"\nTest Accuracy: {metrics.accuracy:.4f}")
    print(f"Test F1 (macro): {metrics.f1_macro:.4f}")
    print(f"Test F1 (weighted): {metrics.f1_weighted:.4f}")

    print("\nPer-class F1 scores:")
    class_names = ["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    for i, name in enumerate(class_names):
        f1 = metrics.per_class_f1.get(i, 0.0)
        print(f"  {name}: {f1:.4f}")

    print("\nClassification Report:")
    print_classification_report(all_labels, all_preds, class_names)

    print("\n" + "=" * 60)
    print(f"Training complete. Best model saved to: {best_checkpoint}")
    print("=" * 60)


if __name__ == "__main__":
    main()
