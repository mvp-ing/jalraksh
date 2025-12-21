"""Neural network layers for STGNN."""
from __future__ import annotations

from stgnn.model.layers.temporal import TemporalEncoder
from stgnn.model.layers.spatial import SpatialEncoder

__all__ = ["TemporalEncoder", "SpatialEncoder"]
