"""Configuration for Inspector Mode Backend."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Path to the backend directory
BACKEND_DIR = Path(__file__).parent
ENV_FILE_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Settings
    app_name: str = "JalRakshak Inspector API"
    debug: bool = True
    api_prefix: str = "/api"

    # Gemini API
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # VAPID Keys for Web Push
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_claims_email: str = "mailto:admin@jalrakshak.gov.in"

    # File paths (relative to project root)
    project_root: Path = Path(__file__).parent.parent
    data_dir: Path = project_root / "data"
    artifacts_dir: Path = project_root / "artifacts"
    municipal_records_dir: Path = data_dir / "Municipal Records" / "metadata"
    sensor_data_path: Path = data_dir / "Sensor Stream" / "Indian_water_data_augmented.csv"
    nodes_path: Path = artifacts_dir / "graph" / "nodes.csv"
    edges_path: Path = artifacts_dir / "graph" / "edges.csv"

    # Fine document output
    fines_output_dir: Path = project_root / "backend" / "generated_fines"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000","http://localhost:8080"]

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Pollution classification categories
POLLUTION_CATEGORIES = {
    "industrial_dye": {
        "name": "Industrial Dye Discharge",
        "indicators": ["high_conductivity", "abnormal_ph", "temperature_spike"],
        "industry_types": ["Textile Dyeing & Bleaching"],
        "act_section": "Section 25 of Water Act 1974",
        "base_fine": 100000,
        "color": "#9C27B0"
    },
    "sewage": {
        "name": "Sewage Contamination",
        "indicators": ["high_fecal_coliform", "high_total_coliform", "elevated_bod"],
        "industry_types": ["Common Effluent Treatment Plant", "Sewage Treatment Plant"],
        "act_section": "Section 25 of Water Act 1974",
        "base_fine": 50000,
        "color": "#795548"
    },
    "agricultural_runoff": {
        "name": "Agricultural Runoff",
        "indicators": ["high_nitrate", "moderate_bod"],
        "industry_types": [],
        "act_section": "Section 24 of Water Act 1974",
        "base_fine": 25000,
        "color": "#4CAF50"
    },
    "thermal": {
        "name": "Thermal Pollution",
        "indicators": ["high_temperature", "low_do"],
        "industry_types": ["Thermal Power Station"],
        "act_section": "Section 21 of Air Act 1981",
        "base_fine": 75000,
        "color": "#FF5722"
    },
    "chemical_industrial": {
        "name": "Chemical Industrial Waste",
        "indicators": ["extreme_ph", "high_conductivity", "low_do"],
        "industry_types": ["Light Engineering / Assembly", "Chemical Manufacturing"],
        "act_section": "Hazardous Waste Rules 2016",
        "base_fine": 200000,
        "color": "#F44336"
    },
    "organic_industrial": {
        "name": "Organic Industrial Waste",
        "indicators": ["very_high_bod", "low_do"],
        "industry_types": ["Food Processing / Distillery", "Leather Tanning"],
        "act_section": "Section 25 of Water Act 1974",
        "base_fine": 150000,
        "color": "#FF9800"
    }
}

# Water quality thresholds (based on CPCB standards)
WATER_QUALITY_THRESHOLDS = {
    "temperature": {"normal_max": 35.0, "unit": "°C"},
    "dissolved_oxygen": {"normal_min": 5.0, "unit": "mg/L"},
    "ph": {"normal_min": 6.5, "normal_max": 8.5, "unit": ""},
    "conductivity": {"normal_max": 1500, "unit": "µmho/cm"},
    "bod": {"normal_max": 3.0, "unit": "mg/L"},
    "nitrate_n": {"normal_max": 10.0, "unit": "mg/L"},
    "fecal_coliform": {"normal_max": 500, "unit": "MPN/100ml"},
    "total_coliform": {"normal_max": 5000, "unit": "MPN/100ml"}
}

# Severity levels
SEVERITY_LEVELS = {
    "low": {"min_score": 0.0, "max_score": 0.3, "color": "#4CAF50"},
    "medium": {"min_score": 0.3, "max_score": 0.5, "color": "#FFC107"},
    "high": {"min_score": 0.5, "max_score": 0.7, "color": "#FF9800"},
    "critical": {"min_score": 0.7, "max_score": 1.0, "color": "#F44336"}
}
