"""STGNN model architecture for water quality exceedance prediction."""
from __future__ import annotations

from stgnn.model.config import STGNNConfig
from stgnn.model.stgnn import STGNN

__all__ = ["STGNN", "STGNNConfig"]
