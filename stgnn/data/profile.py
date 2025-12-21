from __future__ import annotations

from collections import Counter
from typing import Any, Dict, Tuple

import pandas as pd

from stgnn.config import DATE_COL, SENSOR_COLS, STATION_ID_COL


def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    df = df.copy()
    if df[DATE_COL].dtype != "datetime64[ns]":
        df[DATE_COL] = pd.to_datetime(df[DATE_COL], errors="coerce")

    n_rows = len(df)
    n_stations = df[STATION_ID_COL].nunique()
    start_date = df[DATE_COL].min()
    end_date = df[DATE_COL].max()

    station_counts = df.groupby(STATION_ID_COL)[DATE_COL].nunique()
    median_steps = float(station_counts.median()) if not station_counts.empty else None

    delta_mode, delta_median = _delta_stats(df)
    recommended_freq = f"{delta_mode}D" if delta_mode else None
    lookback_steps = _recommend_lookback(median_steps)
    horizon_steps = 1

    missingness = df.isna().mean().sort_values(ascending=False)

    return {
        "n_rows": n_rows,
        "n_stations": n_stations,
        "start_date": _safe_date(start_date),
        "end_date": _safe_date(end_date),
        "median_steps_per_station": median_steps,
        "delta_mode_days": delta_mode,
        "delta_median_days": delta_median,
        "recommended_freq": recommended_freq,
        "recommended_lookback_steps": lookback_steps,
        "recommended_horizon_steps": horizon_steps,
        "missingness": missingness,
        "sensor_columns": SENSOR_COLS,
    }


def _delta_stats(df: pd.DataFrame) -> Tuple[int | None, float | None]:
    deltas: list[int] = []
    for _, group in df.groupby(STATION_ID_COL):
        dates = group[DATE_COL].sort_values()
        diff = dates.diff().dt.days.dropna().astype(int)
        deltas.extend(diff.tolist())

    if not deltas:
        return None, None

    counter = Counter(deltas)
    mode = counter.most_common(1)[0][0]
    median = float(pd.Series(deltas).median())
    return mode, median


def _recommend_lookback(median_steps: float | None) -> int:
    if median_steps is None or median_steps < 4:
        return 3
    return max(3, min(12, int(round(median_steps / 4))))


def render_profile_markdown(summary: Dict[str, Any]) -> str:
    missing = summary["missingness"]
    missing_lines = [f"- {col}: {missing[col]:.1%}" for col in missing.index[:8]]

    return "\n".join(
        [
            "# Data Profile",
            "",
            f"- Rows: {summary['n_rows']}",
            f"- Stations: {summary['n_stations']}",
            f"- Date range: {summary['start_date']} to {summary['end_date']}",
            f"- Median steps per station: {summary['median_steps_per_station']}",
            f"- Typical interval (mode/median days): {summary['delta_mode_days']} / {summary['delta_median_days']}",
            f"- Recommended resample freq: {summary['recommended_freq']}",
            f"- Recommended lookback/horizon: {summary['recommended_lookback_steps']} / {summary['recommended_horizon_steps']}",
            "",
            "## Missingness (top 8)",
            *missing_lines,
        ]
    )


def _safe_date(value: Any) -> str:
    if value is None or pd.isna(value):
        return "unknown"
    try:
        return value.date().isoformat()
    except AttributeError:
        return str(value)
