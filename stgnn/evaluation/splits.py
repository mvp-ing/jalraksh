"""Data splitting utilities for train/val/test."""
from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


def temporal_split(
    num_samples: int,
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
) -> Dict[str, np.ndarray]:
    """Split data temporally - train on past, validate/test on future.

    This is the recommended split for time series to avoid data leakage.

    Args:
        num_samples: Total number of samples
        train_ratio: Fraction for training
        val_ratio: Fraction for validation

    Returns:
        Dictionary with 'train', 'val', 'test' index arrays
    """
    train_end = int(num_samples * train_ratio)
    val_end = int(num_samples * (train_ratio + val_ratio))

    return {
        "train": np.arange(0, train_end),
        "val": np.arange(train_end, val_end),
        "test": np.arange(val_end, num_samples),
    }


def station_split(
    station_ids: List[int],
    river_clusters: List[str] | None = None,
    holdout_clusters: List[str] | None = None,
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
    random_state: int = 42,
) -> Dict[str, List[int]]:
    """Split by stations - optionally hold out entire river basins.

    Useful for testing spatial generalization to unseen regions.

    Args:
        station_ids: List of all station IDs
        river_clusters: Optional cluster assignment for each station
        holdout_clusters: Clusters to hold out for testing
        train_ratio: Fraction for training (of non-held-out stations)
        val_ratio: Fraction for validation (of non-held-out stations)
        random_state: Random seed for reproducibility

    Returns:
        Dictionary with 'train', 'val', 'test' station ID lists
    """
    rng = np.random.RandomState(random_state)

    if river_clusters is not None and holdout_clusters is not None:
        # Split by river clusters
        holdout_set = set(holdout_clusters)
        test_stations = [
            sid for sid, cluster in zip(station_ids, river_clusters)
            if cluster in holdout_set
        ]
        remaining = [
            sid for sid, cluster in zip(station_ids, river_clusters)
            if cluster not in holdout_set
        ]
    else:
        test_stations = []
        remaining = list(station_ids)

    # Shuffle remaining stations
    remaining = rng.permutation(remaining).tolist()

    # Split remaining into train/val
    n_remaining = len(remaining)
    train_end = int(n_remaining * train_ratio / (train_ratio + val_ratio))

    train_stations = remaining[:train_end]
    val_stations = remaining[train_end:]

    # If no holdout clusters, take some from validation for testing
    if not test_stations:
        n_val = len(val_stations)
        test_count = int(n_val * 0.3)  # 30% of val becomes test
        test_stations = val_stations[-test_count:]
        val_stations = val_stations[:-test_count]

    return {
        "train": train_stations,
        "val": val_stations,
        "test": test_stations,
    }


def create_split_indices(
    num_samples: int,
    num_stations: int,
    station_split_dict: Dict[str, List[int]],
    station_ids: List[int],
) -> Dict[str, np.ndarray]:
    """Create sample indices from station splits.

    For each sample (which contains data for all stations), create
    indices based on which stations are in train/val/test.

    Note: This is for station-based evaluation. For training, we typically
    use all samples but mask out held-out stations.

    Args:
        num_samples: Number of time windows
        num_stations: Number of stations
        station_split_dict: Output from station_split()
        station_ids: List of station IDs in data order

    Returns:
        Dictionary with sample indices for each split
    """
    station_to_idx = {sid: idx for idx, sid in enumerate(station_ids)}

    split_indices = {}
    for split_name, split_stations in station_split_dict.items():
        indices = [station_to_idx[sid] for sid in split_stations if sid in station_to_idx]
        split_indices[split_name] = np.array(indices)

    return split_indices


def kfold_temporal(
    num_samples: int,
    n_folds: int = 5,
) -> List[Tuple[np.ndarray, np.ndarray]]:
    """Generate temporal k-fold splits.

    Unlike standard k-fold, each fold uses all previous data for training
    and a window of future data for validation.

    Args:
        num_samples: Total number of samples
        n_folds: Number of folds

    Returns:
        List of (train_indices, val_indices) tuples
    """
    fold_size = num_samples // (n_folds + 1)
    folds = []

    for i in range(1, n_folds + 1):
        train_end = fold_size * i
        val_end = fold_size * (i + 1)

        train_idx = np.arange(0, train_end)
        val_idx = np.arange(train_end, min(val_end, num_samples))

        if len(val_idx) > 0:
            folds.append((train_idx, val_idx))

    return folds
