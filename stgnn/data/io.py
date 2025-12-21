from __future__ import annotations

from typing import Iterable

import pandas as pd

from stgnn.config import (
    DATA_PATH,
    DATE_COL,
    LAT_COL,
    LON_COL,
    LOCATION_COL,
    STATE_COL,
    STATION_ID_COL,
    WATER_BODY_COL,
)


def load_sensor_data(path=DATA_PATH, parse_dates: bool = True) -> pd.DataFrame:
    df = pd.read_csv(path)
    if parse_dates:
        df[DATE_COL] = pd.to_datetime(df[DATE_COL], errors="coerce")
    return df


def get_station_metadata(df: pd.DataFrame) -> pd.DataFrame:
    cols = [
        STATION_ID_COL,
        LOCATION_COL,
        WATER_BODY_COL,
        STATE_COL,
        LAT_COL,
        LON_COL,
    ]
    _ensure_columns(df, cols)
    stations = df[cols].drop_duplicates(subset=[STATION_ID_COL]).copy()
    return stations.reset_index(drop=True)


def _ensure_columns(df: pd.DataFrame, columns: Iterable[str]) -> None:
    missing = [col for col in columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
