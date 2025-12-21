"""Training loop for STGNN."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Callable, Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader
from tqdm import tqdm

from stgnn.model import STGNN, STGNNConfig
from stgnn.training.loss import FocalLoss, compute_class_weights


class Trainer:
    """Training loop with checkpointing, early stopping, and logging."""

    def __init__(
        self,
        model: STGNN,
        config: STGNNConfig,
        train_loader: DataLoader,
        val_loader: DataLoader,
        device: str | torch.device = "auto",
        checkpoint_dir: str | Path = "artifacts/checkpoints",
    ) -> None:
        """Initialize trainer.

        Args:
            model: STGNN model to train
            config: Model configuration
            train_loader: Training data loader
            val_loader: Validation data loader
            device: Device to use ('auto', 'cuda', 'cpu', 'mps')
            checkpoint_dir: Directory for checkpoints
        """
        if device == "auto":
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

        self.device = torch.device(device)
        self.model = model.to(self.device)
        self.config = config
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        # Optimizer and scheduler
        self.optimizer = AdamW(
            model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay,
        )

        # Loss function
        self.criterion = FocalLoss(
            alpha=config.focal_alpha,
            gamma=config.focal_gamma,
            reduction="mean",
        )

        # Tracking
        self.best_val_loss = float("inf")
        self.patience_counter = 0
        self.history: Dict[str, List[float]] = {
            "train_loss": [],
            "val_loss": [],
            "val_accuracy": [],
            "learning_rate": [],
        }

    def train_epoch(self) -> float:
        """Run one training epoch.

        Returns:
            Average training loss
        """
        self.model.train()
        total_loss = 0.0
        num_batches = 0

        progress = tqdm(self.train_loader, desc="Training", leave=False)
        for batch in progress:
            x = batch["x"].to(self.device)
            y = batch["y"].to(self.device)
            edge_index = batch["edge_index"].to(self.device)
            edge_attr = batch["edge_attr"].to(self.device)
            mask = batch.get("mask")
            if mask is not None:
                # Create valid sample mask from feature mask
                mask = mask.any(dim=-1).any(dim=-1).to(self.device)  # (B, N)

            self.optimizer.zero_grad()

            # Forward pass
            logits = self.model(x, edge_index, edge_attr)

            # Compute loss
            loss = self.criterion(logits, y, mask)

            # Backward pass
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item()
            num_batches += 1
            progress.set_postfix(loss=f"{loss.item():.4f}")

        return total_loss / max(num_batches, 1)

    @torch.no_grad()
    def validate(self) -> Tuple[float, float, Dict[str, float]]:
        """Run validation.

        Returns:
            Tuple of (val_loss, val_accuracy, metrics_dict)
        """
        self.model.eval()
        total_loss = 0.0
        num_batches = 0
        all_preds = []
        all_labels = []

        for batch in self.val_loader:
            x = batch["x"].to(self.device)
            y = batch["y"].to(self.device)
            edge_index = batch["edge_index"].to(self.device)
            edge_attr = batch["edge_attr"].to(self.device)

            logits = self.model(x, edge_index, edge_attr)
            loss = self.criterion(logits, y)

            total_loss += loss.item()
            num_batches += 1

            preds = logits.argmax(dim=-1)
            all_preds.append(preds.cpu())
            all_labels.append(y.cpu())

        avg_loss = total_loss / max(num_batches, 1)

        # Compute metrics
        all_preds = torch.cat(all_preds).view(-1).numpy()
        all_labels = torch.cat(all_labels).view(-1).numpy()

        accuracy = (all_preds == all_labels).mean()

        # Per-class accuracy
        metrics = {"accuracy": accuracy}
        for cls in range(self.config.num_classes):
            cls_mask = all_labels == cls
            if cls_mask.sum() > 0:
                cls_acc = (all_preds[cls_mask] == all_labels[cls_mask]).mean()
                metrics[f"accuracy_class_{cls}"] = cls_acc

        return avg_loss, accuracy, metrics

    def fit(
        self,
        epochs: int = 100,
        patience: int = 15,
        min_delta: float = 1e-4,
        scheduler_T_max: int | None = None,
    ) -> Dict[str, List[float]]:
        """Train the model.

        Args:
            epochs: Maximum number of epochs
            patience: Early stopping patience
            min_delta: Minimum improvement for early stopping
            scheduler_T_max: Cosine annealing period (default: epochs)

        Returns:
            Training history dictionary
        """
        if scheduler_T_max is None:
            scheduler_T_max = epochs

        scheduler = CosineAnnealingLR(self.optimizer, T_max=scheduler_T_max)

        print(f"Training on {self.device}")
        print(f"Train batches: {len(self.train_loader)}, Val batches: {len(self.val_loader)}")

        for epoch in range(1, epochs + 1):
            # Train
            train_loss = self.train_epoch()

            # Validate
            val_loss, val_accuracy, metrics = self.validate()

            # Update scheduler
            scheduler.step()
            current_lr = scheduler.get_last_lr()[0]

            # Record history
            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_loss)
            self.history["val_accuracy"].append(val_accuracy)
            self.history["learning_rate"].append(current_lr)

            # Print progress
            print(
                f"Epoch {epoch:3d}/{epochs} | "
                f"Train: {train_loss:.4f} | "
                f"Val: {val_loss:.4f} | "
                f"Acc: {val_accuracy:.4f} | "
                f"LR: {current_lr:.2e}"
            )

            # Checkpointing
            import math
            is_valid_loss = not math.isnan(val_loss) and not math.isinf(val_loss)
            is_first_valid = self.best_val_loss == float("inf") and is_valid_loss
            is_improvement = is_valid_loss and val_loss < self.best_val_loss - min_delta

            if is_first_valid or is_improvement:
                self.best_val_loss = val_loss
                self.patience_counter = 0
                self.save_checkpoint("best_model.pt", epoch, metrics)
                print(f"  -> New best model saved (val_loss: {val_loss:.4f})")
            else:
                self.patience_counter += 1

            # Early stopping
            if self.patience_counter >= patience:
                print(f"Early stopping at epoch {epoch}")
                # Save best model as last checkpoint if no valid best exists
                if self.best_val_loss == float("inf"):
                    self.save_checkpoint("best_model.pt", epoch, metrics)
                    print("  -> Saved current model as best (no valid loss achieved)")
                break

        # Save final model
        self.save_checkpoint("last_model.pt", epoch, metrics)

        # Save training history
        history_path = self.checkpoint_dir / "history.json"
        with open(history_path, "w") as f:
            json.dump(self.history, f, indent=2)

        return self.history

    def save_checkpoint(
        self,
        filename: str,
        epoch: int,
        metrics: Dict[str, float],
    ) -> Path:
        """Save model checkpoint.

        Args:
            filename: Checkpoint filename
            epoch: Current epoch
            metrics: Validation metrics

        Returns:
            Path to saved checkpoint
        """
        checkpoint_path = self.checkpoint_dir / filename

        checkpoint = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "config": {
                "input_features": self.config.input_features,
                "hidden_dim": self.config.hidden_dim,
                "num_gat_layers": self.config.num_gat_layers,
                "num_heads": self.config.num_heads,
                "temporal_type": self.config.temporal_type,
                "num_classes": self.config.num_classes,
                "dropout": self.config.dropout,
            },
            "best_val_loss": self.best_val_loss,
            "metrics": metrics,
        }

        torch.save(checkpoint, checkpoint_path)

        # Also save config as JSON for easy inspection
        config_path = self.checkpoint_dir / "config.json"
        with open(config_path, "w") as f:
            json.dump(checkpoint["config"], f, indent=2)

        return checkpoint_path

    @classmethod
    def load_checkpoint(
        cls,
        checkpoint_path: str | Path,
        model: STGNN,
        device: str = "auto",
    ) -> Tuple[STGNN, Dict]:
        """Load model from checkpoint.

        Args:
            checkpoint_path: Path to checkpoint file
            model: STGNN model instance (must match checkpoint config)
            device: Device to load model on

        Returns:
            Tuple of (loaded model, checkpoint dict)
        """
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        model.load_state_dict(checkpoint["model_state_dict"])

        if device == "auto":
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

        model = model.to(device)
        return model, checkpoint
