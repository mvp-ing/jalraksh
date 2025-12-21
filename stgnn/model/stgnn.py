"""Main STGNN model for water quality severity prediction."""
from __future__ import annotations

import torch
import torch.nn as nn

from stgnn.model.config import STGNNConfig
from stgnn.model.layers.temporal import TemporalEncoder
from stgnn.model.layers.spatial import SpatialEncoder


class STGNN(nn.Module):
    """Spatio-Temporal Graph Neural Network for severity classification.

    Architecture:
        Input (B, N, T, F) -> Temporal Encoder -> Spatial Encoder -> MLP Head -> (B, N, C)

    Where:
        B = batch size
        N = number of nodes (stations)
        T = temporal lookback steps
        F = input features (sensor readings)
        C = number of severity classes (SAFE, LOW, MEDIUM, HIGH, CRITICAL)
    """

    def __init__(self, config: STGNNConfig, num_nodes: int) -> None:
        super().__init__()
        self.config = config
        self.num_nodes = num_nodes

        # Temporal encoding: (B, N, T, F) -> (B, N, hidden_dim)
        self.temporal_encoder = TemporalEncoder(
            input_dim=config.input_features,
            hidden_dim=config.hidden_dim,
            num_layers=config.num_temporal_layers,
            temporal_type=config.temporal_type,
            dropout=config.dropout,
        )

        # Spatial encoding: (B*N, hidden_dim) -> (B*N, hidden_dim * num_heads)
        self.spatial_encoder = SpatialEncoder(
            in_dim=config.hidden_dim,
            hidden_dim=config.hidden_dim,
            num_layers=config.num_gat_layers,
            num_heads=config.num_heads,
            dropout=config.dropout,
            edge_dim=1,
        )

        # Classification head: (B*N, hidden_dim * num_heads) -> (B*N, num_classes)
        spatial_out_dim = config.spatial_out_dim
        self.classifier = nn.Sequential(
            nn.Linear(spatial_out_dim, config.hidden_dim),
            nn.ReLU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.hidden_dim, config.num_classes),
        )

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: torch.Tensor | None = None,
        batch_size: int | None = None,
    ) -> torch.Tensor:
        """Forward pass.

        Args:
            x: Input tensor of shape (B, N, T, F) or (N, T, F) if unbatched
            edge_index: Graph connectivity of shape (2, E)
            edge_attr: Edge weights of shape (E, 1)
            batch_size: Batch size if x is already flattened

        Returns:
            Class logits of shape (B, N, num_classes)
        """
        # Handle unbatched input
        if x.dim() == 3:
            x = x.unsqueeze(0)  # (1, N, T, F)

        B, N, T, F = x.shape

        # Temporal encoding: (B, N, T, F) -> (B, N, hidden_dim)
        h = self.temporal_encoder(x)

        # Flatten for graph operations: (B, N, hidden_dim) -> (B*N, hidden_dim)
        h = h.view(B * N, -1)

        # Expand edge_index for batched graphs
        # Each graph in the batch has the same structure, so we offset node indices
        if B > 1:
            edge_index_batched = self._batch_edge_index(edge_index, B, N)
            if edge_attr is not None:
                edge_attr_batched = edge_attr.repeat(B, 1)
            else:
                edge_attr_batched = None
        else:
            edge_index_batched = edge_index
            edge_attr_batched = edge_attr

        # Spatial encoding: (B*N, hidden_dim) -> (B*N, hidden_dim * num_heads)
        h = self.spatial_encoder(h, edge_index_batched, edge_attr_batched)

        # Classification: (B*N, hidden_dim * num_heads) -> (B*N, num_classes)
        logits = self.classifier(h)

        # Reshape: (B*N, num_classes) -> (B, N, num_classes)
        logits = logits.view(B, N, self.config.num_classes)

        return logits

    def _batch_edge_index(
        self, edge_index: torch.Tensor, batch_size: int, num_nodes: int
    ) -> torch.Tensor:
        """Create batched edge_index by offsetting node indices.

        Args:
            edge_index: Original edge_index of shape (2, E)
            batch_size: Number of graphs in batch
            num_nodes: Number of nodes per graph

        Returns:
            Batched edge_index of shape (2, B*E)
        """
        edge_indices = []
        for i in range(batch_size):
            offset = i * num_nodes
            edge_indices.append(edge_index + offset)
        return torch.cat(edge_indices, dim=1)

    def predict(self, x: torch.Tensor, edge_index: torch.Tensor, edge_attr: torch.Tensor | None = None) -> torch.Tensor:
        """Get class predictions (argmax of logits).

        Args:
            x: Input tensor
            edge_index: Graph connectivity
            edge_attr: Edge weights

        Returns:
            Predicted class indices of shape (B, N)
        """
        logits = self.forward(x, edge_index, edge_attr)
        return logits.argmax(dim=-1)

    def predict_proba(self, x: torch.Tensor, edge_index: torch.Tensor, edge_attr: torch.Tensor | None = None) -> torch.Tensor:
        """Get class probabilities (softmax of logits).

        Args:
            x: Input tensor
            edge_index: Graph connectivity
            edge_attr: Edge weights

        Returns:
            Class probabilities of shape (B, N, num_classes)
        """
        logits = self.forward(x, edge_index, edge_attr)
        return torch.softmax(logits, dim=-1)
