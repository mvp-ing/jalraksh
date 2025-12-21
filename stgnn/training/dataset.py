"""PyTorch Dataset for STGNN training."""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset

from stgnn.config import SENSOR_COLS


# Severity thresholds for each parameter
# Based on CPCB standards with severity multipliers
SEVERITY_THRESHOLDS = {
    "Temperature (C)": {
        "normal_max": 35.0,
        "low": 38.0,       # 1.1x normal
        "medium": 42.0,    # 1.2x normal
        "high": 48.0,      # 1.4x normal
        "critical": 55.0,  # 1.6x normal
    },
    "Dissolved Oxygen (mg/L)": {
        "normal_min": 5.0,
        "low": 4.0,        # Below normal
        "medium": 3.0,     # Concerning
        "high": 2.0,       # Dangerous
        "critical": 1.0,   # Critical hypoxia
    },
    "pH": {
        "normal_min": 6.5,
        "normal_max": 8.5,
        "low_deviation": 0.5,
        "medium_deviation": 1.0,
        "high_deviation": 1.5,
        "critical_deviation": 2.5,
    },
    "Conductivity (µmho/cm)": {
        "normal_max": 1500,
        "low": 2000,
        "medium": 3000,
        "high": 5000,
        "critical": 10000,
    },
    "BOD (mg/L)": {
        "normal_max": 3.0,
        "low": 6.0,        # 2x normal
        "medium": 10.0,    # ~3x normal
        "high": 20.0,      # ~7x normal
        "critical": 50.0,  # >15x normal
    },
    "NitrateN (mg/L)": {
        "normal_max": 10.0,
        "low": 15.0,
        "medium": 25.0,
        "high": 45.0,
        "critical": 100.0,
    },
    "Fecal Coliform (MPN/100ml)": {
        "normal_max": 500,
        "low": 1000,
        "medium": 5000,
        "high": 25000,
        "critical": 100000,
    },
    "Total Coliform (MPN/100ml)": {
        "normal_max": 5000,
        "low": 10000,
        "medium": 50000,
        "high": 250000,
        "critical": 1000000,
    },
}

# Class indices
SEVERITY_TO_IDX = {
    "SAFE": 0,
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4,
}


def compute_severity_score(values: np.ndarray, param_name: str) -> np.ndarray:
    """Compute severity score (0-4) for a single parameter.

    Args:
        values: Array of parameter values
        param_name: Name of the parameter (must be in SEVERITY_THRESHOLDS)

    Returns:
        Array of severity scores (0=SAFE, 1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL)
    """
    thresholds = SEVERITY_THRESHOLDS.get(param_name)
    if thresholds is None:
        return np.zeros_like(values)

    scores = np.zeros_like(values)

    if param_name == "Dissolved Oxygen (mg/L)":
        # Lower is worse for DO
        scores = np.where(values < thresholds["critical"], 4, scores)
        scores = np.where((values >= thresholds["critical"]) & (values < thresholds["high"]), 3, scores)
        scores = np.where((values >= thresholds["high"]) & (values < thresholds["medium"]), 2, scores)
        scores = np.where((values >= thresholds["medium"]) & (values < thresholds["low"]), 1, scores)

    elif param_name == "pH":
        # Deviation from normal range
        min_ph, max_ph = thresholds["normal_min"], thresholds["normal_max"]
        deviation = np.maximum(min_ph - values, values - max_ph)
        deviation = np.maximum(deviation, 0)

        scores = np.where(deviation >= thresholds["critical_deviation"], 4, scores)
        scores = np.where((deviation >= thresholds["high_deviation"]) & (deviation < thresholds["critical_deviation"]), 3, scores)
        scores = np.where((deviation >= thresholds["medium_deviation"]) & (deviation < thresholds["high_deviation"]), 2, scores)
        scores = np.where((deviation >= thresholds["low_deviation"]) & (deviation < thresholds["medium_deviation"]), 1, scores)

    else:
        # Higher is worse for all other parameters
        scores = np.where(values >= thresholds["critical"], 4, scores)
        scores = np.where((values >= thresholds["high"]) & (values < thresholds["critical"]), 3, scores)
        scores = np.where((values >= thresholds["medium"]) & (values < thresholds["high"]), 2, scores)
        scores = np.where((values >= thresholds["low"]) & (values < thresholds["medium"]), 1, scores)

    return scores


def compute_aggregate_severity(data: np.ndarray, feature_names: List[str]) -> np.ndarray:
    """Compute aggregate severity as max severity across all parameters.

    Args:
        data: Array of shape (N, F) where F is number of features
        feature_names: List of feature names corresponding to F dimension

    Returns:
        Array of shape (N,) with severity class indices
    """
    all_scores = []
    for i, name in enumerate(feature_names):
        if name in SEVERITY_THRESHOLDS:
            param_values = data[:, i]
            scores = compute_severity_score(param_values, name)
            all_scores.append(scores)

    if not all_scores:
        return np.zeros(data.shape[0], dtype=np.int64)

    # Take max severity across all parameters
    stacked = np.stack(all_scores, axis=0)
    return np.nanmax(stacked, axis=0).astype(np.int64)


def load_graph_tensors(
    nodes_path: str | Path,
    edges_path: str | Path,
    station_ids: List[int],
) -> Tuple[torch.Tensor, torch.Tensor]:
    """Load graph structure from CSV files and convert to PyTorch tensors.

    Args:
        nodes_path: Path to nodes.csv
        edges_path: Path to edges.csv
        station_ids: List of station IDs in the order used by the data tensor

    Returns:
        edge_index: (2, E) tensor of source and target node indices
        edge_attr: (E, 1) tensor of edge weights
    """
    edges_df = pd.read_csv(edges_path)

    # Create station ID to index mapping
    station_to_idx = {sid: idx for idx, sid in enumerate(station_ids)}

    # Convert src/dst to indices
    src_indices = []
    dst_indices = []
    weights = []

    for _, row in edges_df.iterrows():
        src = row["src"]
        dst = row["dst"]

        # Skip edges with stations not in our data
        if src not in station_to_idx or dst not in station_to_idx:
            continue

        src_indices.append(station_to_idx[src])
        dst_indices.append(station_to_idx[dst])

        # Handle NaN weights by using default value
        weight = row.get("weight", 1.0)
        if pd.isna(weight):
            weight = 1.0
        weights.append(weight)

    edge_index = torch.tensor([src_indices, dst_indices], dtype=torch.long)
    edge_attr = torch.tensor(weights, dtype=torch.float32).unsqueeze(1)

    # Ensure no NaN values in edge_attr
    edge_attr = torch.nan_to_num(edge_attr, nan=1.0)

    return edge_index, edge_attr


class STGNNDataset(Dataset):
    """PyTorch Dataset for STGNN training.

    Wraps windowed sensor data with severity labels for training.
    """

    def __init__(
        self,
        X_windows: np.ndarray,
        Y_windows: np.ndarray,
        edge_index: torch.Tensor,
        edge_attr: torch.Tensor,
        feature_names: List[str] | None = None,
        mask: np.ndarray | None = None,
    ) -> None:
        """Initialize dataset.

        Args:
            X_windows: Input windows of shape (num_samples, lookback, N, F)
            Y_windows: Target windows of shape (num_samples, horizon, N, F)
            edge_index: Graph connectivity of shape (2, E)
            edge_attr: Edge weights of shape (E, 1)
            feature_names: Names of features (F dimension)
            mask: Valid data mask of shape matching X_windows
        """
        self.X_windows = X_windows
        self.Y_windows = Y_windows
        self.edge_index = edge_index
        self.edge_attr = edge_attr
        self.feature_names = feature_names or SENSOR_COLS
        self.mask = mask

        # Precompute labels from Y_windows (target timestep)
        # Take the first horizon step for labeling
        self.labels = self._compute_labels()

    def _compute_labels(self) -> np.ndarray:
        """Compute severity labels for each sample.

        Returns:
            Array of shape (num_samples, N) with severity class indices
        """
        num_samples, horizon, num_nodes, num_features = self.Y_windows.shape

        # Use first timestep of horizon for labels
        target_data = self.Y_windows[:, 0, :, :]  # (num_samples, N, F)

        labels = np.zeros((num_samples, num_nodes), dtype=np.int64)
        for i in range(num_samples):
            labels[i] = compute_aggregate_severity(target_data[i], self.feature_names)

        return labels

    def __len__(self) -> int:
        return len(self.X_windows)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        """Get a single sample.

        Returns:
            Dictionary containing:
                - x: Input tensor of shape (N, T, F)
                - y: Labels of shape (N,)
                - edge_index: Graph connectivity (2, E)
                - edge_attr: Edge weights (E, 1)
                - mask: Valid data mask (N, T, F) if available
        """
        # Get input window and transpose to (N, T, F)
        x = self.X_windows[idx]  # (T, N, F)
        x = np.transpose(x, (1, 0, 2))  # (N, T, F)

        # Replace NaN values with 0 for model input
        x = np.nan_to_num(x, nan=0.0)

        sample = {
            "x": torch.tensor(x, dtype=torch.float32),
            "y": torch.tensor(self.labels[idx], dtype=torch.long),
            "edge_index": self.edge_index,
            "edge_attr": self.edge_attr,
        }

        if self.mask is not None:
            m = self.mask[idx]  # (T, N, F)
            m = np.transpose(m, (1, 0, 2))  # (N, T, F)
            sample["mask"] = torch.tensor(m, dtype=torch.bool)

        return sample


def collate_stgnn(batch: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
    """Custom collate function for STGNNDataset.

    Stacks samples and handles graph batching.

    Args:
        batch: List of sample dictionaries

    Returns:
        Batched dictionary with stacked tensors
    """
    x = torch.stack([s["x"] for s in batch])  # (B, N, T, F)
    y = torch.stack([s["y"] for s in batch])  # (B, N)

    # Edge index and attr are same for all samples
    edge_index = batch[0]["edge_index"]
    edge_attr = batch[0]["edge_attr"]

    result = {
        "x": x,
        "y": y,
        "edge_index": edge_index,
        "edge_attr": edge_attr,
    }

    if "mask" in batch[0]:
        result["mask"] = torch.stack([s["mask"] for s in batch])

    return result
