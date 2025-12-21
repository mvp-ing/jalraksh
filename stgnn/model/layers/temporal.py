"""Temporal encoding layers for STGNN."""
from __future__ import annotations

import torch
import torch.nn as nn


class TemporalEncoder(nn.Module):
    """Encodes temporal sequence per node using GRU or LSTM.

    Takes input of shape (B, N, T, F) and outputs (B, N, hidden_dim).
    Each node's time series is encoded independently using shared weights.
    """

    def __init__(
        self,
        input_dim: int,
        hidden_dim: int,
        num_layers: int = 1,
        temporal_type: str = "gru",
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.hidden_dim = hidden_dim

        rnn_cls = nn.GRU if temporal_type == "gru" else nn.LSTM
        self.rnn = rnn_cls(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
        )
        self.norm = nn.LayerNorm(hidden_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            x: Input tensor of shape (B, N, T, F)

        Returns:
            Encoded tensor of shape (B, N, hidden_dim)
        """
        B, N, T, F = x.shape

        # Reshape to (B*N, T, F) for RNN processing
        x = x.view(B * N, T, F)

        # Run through RNN
        out, _ = self.rnn(x)  # (B*N, T, hidden_dim)

        # Take last timestep output
        out = out[:, -1, :]  # (B*N, hidden_dim)

        # Reshape back to (B, N, hidden_dim)
        out = out.view(B, N, self.hidden_dim)

        return self.norm(out)
