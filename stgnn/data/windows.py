from __future__ import annotations

from typing import Iterable, List, Tuple

import numpy as np
import pandas as pd

from stgnn.config import DATE_COL, SENSOR_COLS, STATION_ID_COL


def build_tensor(
    df: pd.DataFrame,
    value_cols: Iterable[str] | None = None,
    station_ids: Iterable[int] | None = None,
    freq: str | None = None,
) -> Tuple[pd.DatetimeIndex, List[int], np.ndarray, np.ndarray]:
    df = df.copy()
    df[DATE_COL] = pd.to_datetime(df[DATE_COL], errors="coerce")

    if value_cols is None:
        value_cols = SENSOR_COLS
    value_cols = list(value_cols)

    if station_ids is None:
        station_ids = sorted(df[STATION_ID_COL].unique().tolist())
    station_ids = list(station_ids)

    frames = []
    for col in value_cols:
        pivot = df.pivot_table(
            index=DATE_COL,
            columns=STATION_ID_COL,
            values=col,
            aggfunc="mean",
        ).reindex(columns=station_ids)
        if freq:
            pivot = pivot.resample(freq).mean()
        frames.append(pivot)

    if not frames:
        raise ValueError("No value columns provided")

    common_index = frames[0].index
    for frame in frames[1:]:
        common_index = common_index.intersection(frame.index)

    aligned = [frame.loc[common_index] for frame in frames]
    data = np.stack([frame.values for frame in aligned], axis=-1)
    mask = ~np.isnan(data)

    return common_index, station_ids, data, mask


def make_windows(
    data: np.ndarray, lookback_steps: int, horizon_steps: int
) -> Tuple[np.ndarray, np.ndarray]:
    if data.ndim != 3:
        raise ValueError("Expected data shape (T, N, F)")
    if lookback_steps < 1 or horizon_steps < 1:
        raise ValueError("lookback_steps and horizon_steps must be >= 1")

    t_max = data.shape[0]
    window_count = t_max - lookback_steps - horizon_steps + 1
    if window_count <= 0:
        raise ValueError("Not enough timesteps for the requested window sizes")

    xs = []
    ys = []
    for t in range(lookback_steps, t_max - horizon_steps + 1):
        xs.append(data[t - lookback_steps : t])
        ys.append(data[t : t + horizon_steps])

    return np.stack(xs), np.stack(ys)
