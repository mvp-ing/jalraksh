"""Evaluation metrics for severity classification."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

import numpy as np

try:
    from sklearn.metrics import (
        accuracy_score,
        precision_score,
        recall_score,
        f1_score,
        confusion_matrix,
        classification_report,
    )
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


@dataclass
class ExceedanceMetrics:
    """Container for classification metrics."""

    accuracy: float = 0.0
    precision_macro: float = 0.0
    recall_macro: float = 0.0
    f1_macro: float = 0.0
    precision_weighted: float = 0.0
    recall_weighted: float = 0.0
    f1_weighted: float = 0.0
    confusion_matrix: np.ndarray = field(default_factory=lambda: np.array([]))
    per_class_accuracy: Dict[int, float] = field(default_factory=dict)
    per_class_f1: Dict[int, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary (excluding confusion matrix)."""
        result = {
            "accuracy": self.accuracy,
            "precision_macro": self.precision_macro,
            "recall_macro": self.recall_macro,
            "f1_macro": self.f1_macro,
            "precision_weighted": self.precision_weighted,
            "recall_weighted": self.recall_weighted,
            "f1_weighted": self.f1_weighted,
        }
        for cls, acc in self.per_class_accuracy.items():
            result[f"accuracy_class_{cls}"] = acc
        for cls, f1 in self.per_class_f1.items():
            result[f"f1_class_{cls}"] = f1
        return result


def compute_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    num_classes: int = 5,
    class_names: List[str] | None = None,
) -> ExceedanceMetrics:
    """Compute classification metrics.

    Args:
        y_true: Ground truth labels
        y_pred: Predicted labels
        num_classes: Number of classes
        class_names: Optional class names for reporting

    Returns:
        ExceedanceMetrics dataclass
    """
    y_true = np.asarray(y_true).ravel()
    y_pred = np.asarray(y_pred).ravel()

    # Filter out any invalid labels
    valid_mask = (y_true >= 0) & (y_true < num_classes)
    y_true = y_true[valid_mask]
    y_pred = y_pred[valid_mask]

    if len(y_true) == 0:
        return ExceedanceMetrics()

    if not HAS_SKLEARN:
        # Basic accuracy without sklearn
        accuracy = (y_true == y_pred).mean()
        return ExceedanceMetrics(accuracy=accuracy)

    metrics = ExceedanceMetrics()
    metrics.accuracy = accuracy_score(y_true, y_pred)

    # Macro and weighted averages
    metrics.precision_macro = precision_score(
        y_true, y_pred, average="macro", zero_division=0
    )
    metrics.recall_macro = recall_score(
        y_true, y_pred, average="macro", zero_division=0
    )
    metrics.f1_macro = f1_score(
        y_true, y_pred, average="macro", zero_division=0
    )

    metrics.precision_weighted = precision_score(
        y_true, y_pred, average="weighted", zero_division=0
    )
    metrics.recall_weighted = recall_score(
        y_true, y_pred, average="weighted", zero_division=0
    )
    metrics.f1_weighted = f1_score(
        y_true, y_pred, average="weighted", zero_division=0
    )

    # Confusion matrix
    metrics.confusion_matrix = confusion_matrix(
        y_true, y_pred, labels=list(range(num_classes))
    )

    # Per-class metrics
    per_class_f1 = f1_score(
        y_true, y_pred, average=None, labels=list(range(num_classes)), zero_division=0
    )

    for cls in range(num_classes):
        cls_mask = y_true == cls
        if cls_mask.sum() > 0:
            metrics.per_class_accuracy[cls] = (y_pred[cls_mask] == cls).mean()
        else:
            metrics.per_class_accuracy[cls] = 0.0
        metrics.per_class_f1[cls] = per_class_f1[cls]

    return metrics


def print_classification_report(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: List[str] | None = None,
) -> str:
    """Generate and print sklearn classification report.

    Args:
        y_true: Ground truth labels
        y_pred: Predicted labels
        class_names: Optional class names

    Returns:
        Classification report string
    """
    if not HAS_SKLEARN:
        return "sklearn not available for detailed report"

    if class_names is None:
        class_names = ["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]

    report = classification_report(
        y_true, y_pred, target_names=class_names, zero_division=0
    )
    print(report)
    return report


def print_confusion_matrix(
    confusion_mat: np.ndarray,
    class_names: List[str] | None = None,
) -> None:
    """Print formatted confusion matrix.

    Args:
        confusion_mat: Confusion matrix array
        class_names: Optional class names
    """
    if class_names is None:
        class_names = ["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]

    n_classes = len(class_names)
    header = "Predicted:".ljust(12) + " ".join(f"{name:>8}" for name in class_names)
    print(header)
    print("-" * len(header))

    for i, name in enumerate(class_names):
        row = f"{name:12}" + " ".join(f"{confusion_mat[i, j]:8d}" for j in range(n_classes))
        print(row)
