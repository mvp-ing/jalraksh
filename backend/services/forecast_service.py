"""Forecast Service - STGNN-based pollution prediction."""

import random
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple
from uuid import uuid4

import numpy as np
import pandas as pd
import torch

# Add project root to path for stgnn imports
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from stgnn.config import DATA_PATH, DEFAULT_WINDOW_CONFIG, SENSOR_COLS
from stgnn.data.io import load_sensor_data, get_station_metadata
from stgnn.data.windows import build_tensor, make_windows
from stgnn.model import STGNN, STGNNConfig
from stgnn.model.config import SEVERITY_CLASSES
from stgnn.training import load_graph_tensors

from ..models.schemas import ForecastAlert, ForecastSeverity


class ForecastService:
    """Service for STGNN-based pollution forecasting."""

    CHECKPOINT_PATH = ROOT / "artifacts" / "checkpoints" / "best_model.pt"
    GRAPH_DIR = ROOT / "artifacts" / "graph"

    def __init__(self):
        self._model: Optional[STGNN] = None
        self._checkpoint: Optional[dict] = None
        self._station_metadata: Optional[pd.DataFrame] = None
        self._station_ids: Optional[List[int]] = None
        self._edge_index: Optional[torch.Tensor] = None
        self._edge_attr: Optional[torch.Tensor] = None
        self._X_windows: Optional[np.ndarray] = None
        self._device = torch.device("cpu")
        self._loaded = False

    def _load_model(self) -> None:
        """Load STGNN model and prepare data."""
        if self._loaded:
            return

        if not self.CHECKPOINT_PATH.exists():
            raise FileNotFoundError(f"Model checkpoint not found: {self.CHECKPOINT_PATH}")

        # Load checkpoint
        checkpoint = torch.load(self.CHECKPOINT_PATH, map_location="cpu")
        config_dict = checkpoint["config"]

        config = STGNNConfig(
            input_features=config_dict.get("input_features", 8),
            hidden_dim=config_dict.get("hidden_dim", 64),
            num_gat_layers=config_dict.get("num_gat_layers", 2),
            num_heads=config_dict.get("num_heads", 4),
            temporal_type=config_dict.get("temporal_type", "gru"),
            num_classes=config_dict.get("num_classes", 5),
            dropout=config_dict.get("dropout", 0.3),
        )

        num_nodes = checkpoint.get("num_nodes", 168)
        self._model = STGNN(config, num_nodes=num_nodes)
        self._model.load_state_dict(checkpoint["model_state_dict"])
        self._model = self._model.to(self._device)
        self._model.eval()
        self._checkpoint = checkpoint

        # Load sensor data and build tensors
        df = load_sensor_data(path=DATA_PATH)
        self._station_metadata = get_station_metadata(df)

        timestamps, station_ids, data, mask = build_tensor(
            df, freq=DEFAULT_WINDOW_CONFIG["freq"]
        )
        self._station_ids = station_ids

        # Load graph
        self._edge_index, self._edge_attr = load_graph_tensors(
            self.GRAPH_DIR / "nodes.csv",
            self.GRAPH_DIR / "edges.csv",
            station_ids,
        )

        # Store windows for inference
        self._X_windows, _ = make_windows(
            data,
            lookback_steps=DEFAULT_WINDOW_CONFIG["lookback_steps"],
            horizon_steps=DEFAULT_WINDOW_CONFIG["horizon_steps"],
        )

        self._loaded = True
        print(f"ForecastService: Loaded model with {len(station_ids)} stations")

    def _run_inference(self, window_idx: int = -1) -> Tuple[np.ndarray, np.ndarray]:
        """Run inference on a specific window.

        Returns:
            predictions: (N,) array of severity indices
            probabilities: (N, 5) array of class probabilities
        """
        self._load_model()

        x = self._X_windows[window_idx]  # (T, N, F)
        x = np.transpose(x, (1, 0, 2))  # (N, T, F)
        x = np.nan_to_num(x, nan=0.0)
        x = torch.tensor(x, dtype=torch.float32).unsqueeze(0).to(self._device)

        with torch.no_grad():
            logits = self._model(x, self._edge_index, self._edge_attr)
            probs = torch.softmax(logits, dim=-1)
            preds = logits.argmax(dim=-1)

        return preds.squeeze(0).cpu().numpy(), probs.squeeze(0).cpu().numpy()

    def _select_random_stations(
        self,
        num_stations: int,
        seed: Optional[int] = None
    ) -> List[int]:
        """Randomly select station indices."""
        self._load_model()

        if seed is not None:
            random.seed(seed)

        n_total = len(self._station_ids)
        indices = random.sample(range(n_total), min(num_stations, n_total))
        return indices

    def predict_multi_horizon(
        self,
        num_stations: int = 15,
        horizons: List[int] = None,
        min_severity: Optional[str] = "CRITICAL",
        random_seed: Optional[int] = None,
    ) -> List[ForecastAlert]:
        """Generate forecasts for randomly selected stations across multiple horizons.

        Args:
            num_stations: Number of stations to randomly select (10-20)
            horizons: List of months ahead to predict (1, 2, 3)
            min_severity: Only return alerts at or above this severity
            random_seed: Optional seed for reproducibility

        Returns:
            List of ForecastAlert objects for predictions meeting severity threshold
        """
        if horizons is None:
            horizons = [1, 2, 3]

        self._load_model()

        # Select random stations
        selected_indices = self._select_random_stations(num_stations, random_seed)

        alerts = []
        now = datetime.utcnow()

        # Run inference once (all stations)
        predictions, probabilities = self._run_inference(window_idx=-1)

        for horizon in horizons:
            # Apply confidence decay for further horizons (uncertainty grows)
            # 1 month: 1.0, 2 months: 0.9, 3 months: 0.8
            confidence_decay = 1.0 - (horizon - 1) * 0.1

            for idx in selected_indices:
                station_id = self._station_ids[idx]
                pred_idx = int(predictions[idx])
                pred_severity = SEVERITY_CLASSES[pred_idx]
                probs = probabilities[idx]

                # Filter by minimum severity
                if min_severity:
                    try:
                        severity_idx = SEVERITY_CLASSES.index(min_severity)
                        if pred_idx < severity_idx:
                            continue
                    except ValueError:
                        pass  # Invalid severity, don't filter

                # Get station metadata
                meta = self._station_metadata[
                    self._station_metadata["STN code"] == station_id
                ]

                if not meta.empty:
                    row = meta.iloc[0]
                    station_name = str(row.get("Monitoring Location", f"Station {station_id}"))
                    water_body = str(row.get("Type Water Body", "RIVER"))
                    state = str(row.get("State Name", ""))
                    location = f"{water_body} - {state}" if state else water_body
                    lat = float(row.get("latitude", 0) or 0)
                    lon = float(row.get("longitude", 0) or 0)
                    river_cluster = str(row.get("river_cluster", "UNKNOWN"))
                else:
                    station_name = f"Station {station_id}"
                    location = "Unknown"
                    lat, lon = 0.0, 0.0
                    river_cluster = "UNKNOWN"

                confidence = float(probs[pred_idx]) * confidence_decay

                # Generate alert message
                alert_message = (
                    f"{station_name[:50]} will cross limits in {horizon} month(s) "
                    f"with {confidence * 100:.0f}% probability"
                )

                alert = ForecastAlert(
                    id=f"fc-{uuid4().hex[:8]}",
                    station_id=station_id,
                    station_code=str(station_id),
                    station_name=station_name[:100],
                    location=location[:100],
                    river_cluster=river_cluster,
                    coordinates=(lat, lon),
                    forecast_horizon_months=horizon,
                    predicted_severity=ForecastSeverity(pred_severity),
                    severity_index=pred_idx,
                    confidence=round(confidence, 4),
                    probabilities={
                        SEVERITY_CLASSES[i]: round(float(probs[i]), 4)
                        for i in range(5)
                    },
                    alert_message=alert_message,
                    model_timestamp=now,
                )

                alerts.append(alert)

        # Sort by severity (highest first), then by confidence
        alerts.sort(key=lambda a: (-a.severity_index, -a.confidence))

        return alerts

    def get_model_info(self) -> dict:
        """Get model metadata."""
        self._load_model()
        return {
            "checkpoint": str(self.CHECKPOINT_PATH.name),
            "epoch": self._checkpoint.get("epoch", "N/A"),
            "val_loss": round(self._checkpoint.get("best_val_loss", 0), 4),
            "num_stations": len(self._station_ids),
            "severity_classes": SEVERITY_CLASSES,
        }


# Singleton instance
_forecast_service: Optional[ForecastService] = None


def get_forecast_service() -> ForecastService:
    """Get or create the ForecastService singleton."""
    global _forecast_service
    if _forecast_service is None:
        _forecast_service = ForecastService()
    return _forecast_service
