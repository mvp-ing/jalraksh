"""Model hyperparameters configuration."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal


# Severity levels for multiclass classification
SEVERITY_CLASSES = ["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
NUM_CLASSES = len(SEVERITY_CLASSES)


@dataclass
class STGNNConfig:
    """Configuration for STGNN model architecture and training."""

    # Architecture
    input_features: int = 8
    hidden_dim: int = 64
    num_gat_layers: int = 2
    num_heads: int = 4
    temporal_type: Literal["gru", "lstm"] = "gru"
    num_temporal_layers: int = 1
    num_classes: int = NUM_CLASSES

    # Regularization
    dropout: float = 0.3
    edge_dropout: float = 0.1

    # Training
    learning_rate: float = 1e-3
    weight_decay: float = 1e-5
    focal_alpha: float = 0.25
    focal_gamma: float = 2.0

    # Data
    lookback_steps: int = 6
    horizon_steps: int = 1

    @property
    def spatial_out_dim(self) -> int:
        """Output dimension of spatial encoder."""
        return self.hidden_dim * self.num_heads
