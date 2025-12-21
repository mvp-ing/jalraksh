from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = PROJECT_ROOT / "data" / "Sensor Stream" / "Indian_water_data_augmented.csv"

STATION_ID_COL = "STN code"
LOCATION_COL = "Monitoring Location"
WATER_BODY_COL = "Type Water Body"
STATE_COL = "State Name"
DATE_COL = "Date"
LAT_COL = "latitude"
LON_COL = "longitude"

SENSOR_COLS = [
    "Temperature (C)",
    "Dissolved Oxygen (mg/L)",
    "pH",
    "Conductivity (µmho/cm)",
    "BOD (mg/L)",
    "NitrateN (mg/L)",
    "Fecal Coliform (MPN/100ml)",
    "Total Coliform (MPN/100ml)",
]

DEFAULT_WINDOW_CONFIG = {
    "lookback_steps": 6,
    "horizon_steps": 1,
    "freq": "30D",
}

DEFAULT_GRAPH_CONFIG = {
    "k_neighbors": 1,
    "max_km": 150.0,
    "distance_scale_km": 50.0,
    "ensure_chain": False,
}

DEFAULT_MODEL_CONFIG = {
    "hidden_dim": 64,
    "num_gat_layers": 2,
    "num_heads": 4,
    "temporal_type": "gru",
    "dropout": 0.3,
    "learning_rate": 1e-3,
    "weight_decay": 1e-5,
    "num_classes": 5,  # SAFE, LOW, MEDIUM, HIGH, CRITICAL
}
