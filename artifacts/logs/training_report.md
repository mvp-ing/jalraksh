# STGNN Training Report

**Date:** 2025-12-21
**Experiment:** Water Quality Severity Prediction

---

## Model Architecture

| Component | Configuration |
|-----------|--------------|
| Architecture | STGNN (GRU Temporal + GAT Spatial) |
| Temporal Encoder | GRU, 1 layer |
| Spatial Encoder | GATv2Conv, 2 layers, 4 heads |
| Hidden Dimension | 64 |
| Output Classes | 5 (SAFE, LOW, MEDIUM, HIGH, CRITICAL) |
| Total Parameters | 198,533 |

---

## Dataset

| Metric | Value |
|--------|-------|
| Total Records | 4,032 |
| Stations | 168 |
| Graph Edges | 145 |
| Temporal Steps | 24 |
| Lookback Window | 6 steps |
| Prediction Horizon | 1 step |
| Sampling Frequency | 30 days |

### Train/Val/Test Split
- Train: 12 windows (70%)
- Validation: 3 windows (15%)
- Test: 3 windows (15%)

### Class Distribution (Training)
| Class | Count | Percentage |
|-------|-------|------------|
| SAFE | 1,373 | 68.1% |
| LOW | 138 | 6.8% |
| MEDIUM | 166 | 8.2% |
| HIGH | 75 | 3.7% |
| CRITICAL | 264 | 13.1% |

---

## Training Configuration

| Parameter | Value |
|-----------|-------|
| Max Epochs | 50 |
| Epochs Run | 25 (early stopped) |
| Batch Size | 16 |
| Learning Rate | 0.001 |
| Weight Decay | 1e-5 |
| Optimizer | AdamW |
| Scheduler | CosineAnnealingLR |
| Loss Function | FocalLoss (α=0.25, γ=2.0) |
| Early Stopping | Patience=10 |

---

## Training Results

### Loss Curves
- **Best Validation Loss:** 0.1193 (Epoch 15)
- **Final Training Loss:** 0.0831
- **Final Validation Accuracy:** 76.6%

### Test Set Performance

| Metric | Value |
|--------|-------|
| Accuracy | 70.24% |
| F1 (Macro) | 0.392 |
| F1 (Weighted) | 0.794 |

### Per-Class Metrics

| Class | Precision | Recall | F1-Score | Support |
|-------|-----------|--------|----------|---------|
| SAFE | 0.68 | 0.99 | 0.80 | 293 |
| LOW | 1.00 | 0.04 | 0.08 | 76 |
| MEDIUM | 0.50 | 0.13 | 0.21 | 46 |
| HIGH | 0.00 | 0.00 | 0.00 | 24 |
| CRITICAL | 0.89 | 0.86 | 0.88 | 65 |

---

## Inference Results (Latest)

### Severity Distribution
| Severity | Stations | Percentage |
|----------|----------|------------|
| SAFE | 142 | 84.5% |
| LOW | 1 | 0.6% |
| MEDIUM | 4 | 2.4% |
| HIGH | 0 | 0.0% |
| CRITICAL | 21 | 12.5% |

### High-Risk Stations (Top 10)
1. TULJE BAGH CANAL, TEKRI DRAIN, KAKINADA (CRITICAL, 77.7%)
2. PIMPAL-PANERI NALA AT RATNAGIRI (CRITICAL, 77.7%)
3. TULIA BAGH DRAIN AT MATLAPALEM (CRITICAL, 75.6%)
4. TIRACOL BEACH (CRITICAL, 77.7%)
5. MIRAMAR BEACH (CRITICAL, 77.7%)
6. CALANGUTE BEACH (CRITICAL, 77.7%)
7. MORJIM BEACH (CRITICAL, 77.7%)
8. MOBOR BEACH (CRITICAL, 77.7%)
9. SEA WATER, BAY OF BENGAL (CRITICAL, 77.7%)
10. SEA WATER BAY OF BENGAL (CRITICAL, 77.7%)

---

## Artifacts

| File | Path |
|------|------|
| Best Model | `artifacts/checkpoints/best_model.pt` |
| Last Model | `artifacts/checkpoints/last_model.pt` |
| Config | `artifacts/checkpoints/config.json` |
| Training History | `artifacts/checkpoints/history.json` |
| Predictions | `artifacts/predictions/latest_predictions.csv` |
| Metrics JSON | `artifacts/logs/training_metrics.json` |

---

## Observations & Recommendations

### Strengths
- Strong performance on SAFE (F1=0.80) and CRITICAL (F1=0.88) classes
- Model learns meaningful patterns from spatio-temporal data
- Graph attention successfully propagates information across river network

### Weaknesses
- Poor performance on LOW (F1=0.08) and HIGH (F1=0.00) classes
- Severe class imbalance affects minority class predictions
- Limited training data (only 18 temporal windows)

### Recommendations
1. **Data Augmentation:** Apply time-series augmentation techniques
2. **Class Balancing:** Use SMOTE or class-weighted sampling
3. **More Data:** Collect additional temporal data points
4. **Threshold Tuning:** Adjust severity thresholds based on domain expertise
5. **Ensemble:** Consider ensemble of multiple models for robustness

---

*Report generated automatically by STGNN training pipeline*
