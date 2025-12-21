# STGNN Training Report

**Generated**: 2024-12-21

## Model Configuration

| Parameter | Value |
|-----------|-------|
| Architecture | STGNN (GRU + GAT) |
| Hidden Dimension | 64 |
| GAT Layers | 2 |
| Attention Heads | 4 |
| Temporal Encoder | GRU |
| Dropout | 0.3 |
| Total Parameters | 198,533 |

## Training Configuration

| Parameter | Value |
|-----------|-------|
| Epochs | 50 |
| Batch Size | 16 |
| Learning Rate | 1e-3 |
| Weight Decay | 1e-5 |
| Scheduler | Cosine Annealing |
| Loss Function | Focal Loss (alpha=0.25, gamma=2.0) |
| Early Stopping Patience | 15 |

## Dataset Statistics

| Metric | Value |
|--------|-------|
| Total Samples | 18 windows |
| Train/Val/Test Split | 12/3/3 |
| Number of Stations | 168 |
| Number of Edges | 145 |
| Input Features | 8 sensors |
| Lookback Steps | 6 |
| Horizon | 1 |

### Label Distribution (Training Set)

| Class | Count | Percentage |
|-------|-------|------------|
| SAFE | 1,373 | 68.1% |
| LOW | 138 | 6.8% |
| MEDIUM | 166 | 8.2% |
| HIGH | 75 | 3.7% |
| CRITICAL | 264 | 13.1% |

## Training Results

### Final Metrics

| Metric | Train | Validation | Test |
|--------|-------|------------|------|
| Loss | 0.0738 | 0.1106 | - |
| Accuracy | - | 79.76% | 74.80% |
| F1 (Macro) | - | - | 0.4905 |
| F1 (Weighted) | - | - | 0.8074 |

### Per-Class Performance (Test Set)

| Class | Precision | Recall | F1-Score | Support |
|-------|-----------|--------|----------|---------|
| SAFE | 0.72 | 0.99 | 0.83 | 293 |
| LOW | 0.79 | 0.25 | 0.38 | 76 |
| MEDIUM | 0.77 | 0.22 | 0.34 | 46 |
| HIGH | 0.00 | 0.00 | 0.00 | 24 |
| CRITICAL | 0.89 | 0.91 | 0.90 | 65 |

### Training Progress

- Best validation loss achieved at epoch 46: 0.1106
- Training converged smoothly with no instabilities
- Model shows strong performance on majority class (SAFE) and extreme class (CRITICAL)
- Intermediate classes (LOW, MEDIUM, HIGH) have lower recall due to class imbalance

## Observations

1. **Class Imbalance**: The dataset is heavily skewed toward SAFE class (68.1%). This affects minority class predictions.

2. **Strong Critical Detection**: The model achieves 90% F1 on CRITICAL cases, which is the most important for early warning systems.

3. **LOW/MEDIUM Confusion**: Intermediate severity classes have lower performance, suggesting potential overlap in feature space.

4. **HIGH Class Issue**: HIGH class has zero predictions, likely due to:
   - Very small sample size (3.7% of training data)
   - Feature overlap with adjacent classes

## Recommendations

1. **Address Class Imbalance**:
   - Use class-weighted loss
   - Oversample minority classes
   - Consider merging HIGH into CRITICAL or MEDIUM

2. **More Training Data**:
   - Current dataset has only 18 windows (limited by temporal constraints)
   - Consider using overlapping windows or synthetic augmentation

3. **Hyperparameter Tuning**:
   - Experiment with higher focal loss gamma for harder samples
   - Try larger hidden dimensions for more capacity

## Artifacts

| File | Description |
|------|-------------|
| `artifacts/checkpoints/best_model.pt` | Best model weights (epoch 46) |
| `artifacts/checkpoints/last_model.pt` | Final model weights (epoch 50) |
| `artifacts/checkpoints/config.json` | Model configuration |
| `artifacts/checkpoints/history.json` | Training history |
| `artifacts/predictions.json` | Latest inference results |

## Usage

### Training
```bash
python scripts/stgnn_train.py --epochs 50 --batch-size 16 --device cpu
```

### Inference
```bash
python scripts/stgnn_predict.py --checkpoint artifacts/checkpoints/best_model.pt
```
