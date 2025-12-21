from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

import pandas as pd


@dataclass(frozen=True)
class ThresholdRule:
    column: str
    threshold: float
    direction: str = ">"
    include_equal: bool = True

    def apply(self, series: pd.Series) -> pd.Series:
        if self.direction not in {">", "<"}:
            raise ValueError("direction must be '>' or '<'")
        if self.direction == ">":
            return series >= self.threshold if self.include_equal else series > self.threshold
        return series <= self.threshold if self.include_equal else series < self.threshold


def compute_exceedance_flags(
    df: pd.DataFrame, rules: Iterable[ThresholdRule]
) -> pd.DataFrame:
    rules = list(rules)
    missing = [rule.column for rule in rules if rule.column not in df.columns]
    if missing:
        raise ValueError(f"Missing columns for threshold rules: {missing}")

    flags = {}
    for rule in rules:
        flags[rule.column] = rule.apply(df[rule.column])

    return pd.DataFrame(flags)


def aggregate_exceedance(flags: pd.DataFrame) -> pd.Series:
    if flags.empty:
        raise ValueError("No exceedance flags provided")
    return flags.any(axis=1).astype(int)


def labels_from_rules(
    df: pd.DataFrame, rules: Iterable[ThresholdRule], label_name: str = "exceedance"
) -> pd.DataFrame:
    flags = compute_exceedance_flags(df, rules)
    labels = aggregate_exceedance(flags)
    return pd.DataFrame({label_name: labels})
