"""Spatial encoding layers for STGNN using Graph Attention Networks."""
from __future__ import annotations

import torch
import torch.nn as nn
from torch_geometric.nn import GATv2Conv


class SpatialEncoder(nn.Module):
    """Graph attention layers for spatial message passing.

    Uses GATv2Conv which supports edge features (distance-based weights)
    and handles directed graphs (river flow direction).
    """

    def __init__(
        self,
        in_dim: int,
        hidden_dim: int,
        num_layers: int = 2,
        num_heads: int = 4,
        dropout: float = 0.1,
        edge_dim: int = 1,
    ) -> None:
        super().__init__()
        self.layers = nn.ModuleList()
        self.norms = nn.ModuleList()

        for i in range(num_layers):
            in_channels = in_dim if i == 0 else hidden_dim * num_heads
            self.layers.append(
                GATv2Conv(
                    in_channels=in_channels,
                    out_channels=hidden_dim,
                    heads=num_heads,
                    dropout=dropout,
                    edge_dim=edge_dim,
                    add_self_loops=True,
                    concat=True,
                )
            )
            self.norms.append(nn.LayerNorm(hidden_dim * num_heads))

        self.out_dim = hidden_dim * num_heads
        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """Forward pass through GAT layers.

        Args:
            x: Node features of shape (B*N, hidden_dim)
            edge_index: Graph connectivity of shape (2, E)
            edge_attr: Edge features of shape (E, edge_dim)

        Returns:
            Updated node features of shape (B*N, hidden_dim * num_heads)
        """
        for layer, norm in zip(self.layers, self.norms):
            residual = x if x.shape[-1] == self.out_dim else None
            x = layer(x, edge_index, edge_attr=edge_attr)
            x = torch.relu(x)
            x = norm(x)
            x = self.dropout(x)
            if residual is not None:
                x = x + residual

        return x
