"""Loss functions for STGNN training."""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class FocalLoss(nn.Module):
    """Focal Loss for multiclass classification with class imbalance.

    Reduces the relative loss for well-classified examples, focusing
    training on hard, misclassified examples.

    Reference: Lin et al., "Focal Loss for Dense Object Detection", ICCV 2017

    Args:
        alpha: Weighting factor for each class. If float, applies same weight
               to all classes. If tensor of shape (num_classes,), applies
               per-class weights.
        gamma: Focusing parameter. Higher gamma increases focus on hard examples.
        reduction: 'mean', 'sum', or 'none'
        ignore_index: Label index to ignore (e.g., for masked positions)
    """

    def __init__(
        self,
        alpha: float | torch.Tensor = 1.0,
        gamma: float = 2.0,
        reduction: str = "mean",
        ignore_index: int = -100,
    ) -> None:
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction
        self.ignore_index = ignore_index

    def forward(
        self,
        logits: torch.Tensor,
        targets: torch.Tensor,
        mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """Compute focal loss.

        Args:
            logits: Predictions of shape (B, N, C) or (B*N, C)
            targets: Ground truth labels of shape (B, N) or (B*N,)
            mask: Optional mask of shape matching targets (True = valid)

        Returns:
            Scalar loss value
        """
        # Flatten if needed
        if logits.dim() == 3:
            B, N, C = logits.shape
            logits = logits.view(B * N, C)
            targets = targets.view(B * N)
            if mask is not None:
                mask = mask.view(B * N)

        num_classes = logits.shape[-1]

        # Compute cross entropy loss (no reduction)
        ce_loss = F.cross_entropy(
            logits, targets, reduction="none", ignore_index=self.ignore_index
        )

        # Get predicted probabilities
        pt = torch.softmax(logits, dim=-1)
        pt = pt.gather(1, targets.unsqueeze(1)).squeeze(1)
        pt = pt.clamp(min=1e-8, max=1 - 1e-8)

        # Compute focal weight
        focal_weight = (1 - pt) ** self.gamma

        # Apply alpha weighting
        if isinstance(self.alpha, torch.Tensor):
            alpha_weight = self.alpha.to(logits.device)[targets]
        else:
            alpha_weight = self.alpha

        # Combine weights
        loss = alpha_weight * focal_weight * ce_loss

        # Apply mask if provided
        if mask is not None:
            loss = loss * mask.float()
            if self.reduction == "mean":
                return loss.sum() / mask.float().sum().clamp(min=1)
            elif self.reduction == "sum":
                return loss.sum()
            return loss

        # Standard reduction
        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss


class ClassBalancedFocalLoss(FocalLoss):
    """Focal Loss with automatic class balancing.

    Computes class weights inversely proportional to class frequency
    to handle severe class imbalance.

    Args:
        num_classes: Number of classes
        beta: Class balance factor (0.9-0.9999 typical)
        gamma: Focal loss gamma
        reduction: Loss reduction mode
    """

    def __init__(
        self,
        num_classes: int = 5,
        beta: float = 0.999,
        gamma: float = 2.0,
        reduction: str = "mean",
    ) -> None:
        super().__init__(alpha=1.0, gamma=gamma, reduction=reduction)
        self.num_classes = num_classes
        self.beta = beta
        self._class_counts: torch.Tensor | None = None

    def update_class_weights(self, targets: torch.Tensor) -> None:
        """Update class weights based on observed class frequencies.

        Args:
            targets: All training labels
        """
        targets = targets.view(-1)
        counts = torch.bincount(targets, minlength=self.num_classes).float()
        counts = counts.clamp(min=1)

        # Effective number of samples per class
        effective_num = 1.0 - torch.pow(self.beta, counts)
        weights = (1.0 - self.beta) / effective_num

        # Normalize
        weights = weights / weights.sum() * self.num_classes

        self.alpha = weights
        self._class_counts = counts


def compute_class_weights(labels: torch.Tensor, num_classes: int = 5) -> torch.Tensor:
    """Compute inverse frequency class weights.

    Args:
        labels: All training labels
        num_classes: Number of classes

    Returns:
        Tensor of shape (num_classes,) with class weights
    """
    labels = labels.view(-1)
    counts = torch.bincount(labels, minlength=num_classes).float()
    counts = counts.clamp(min=1)

    # Inverse frequency
    weights = 1.0 / counts

    # Normalize to sum to num_classes
    weights = weights / weights.sum() * num_classes

    return weights
