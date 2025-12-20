"""Alert Service - Scans real sensor data for threshold violations."""

import pandas as pd
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import uuid4
from functools import lru_cache

from ..config import get_settings, WATER_QUALITY_THRESHOLDS, SEVERITY_LEVELS
from ..models.schemas import (
    InspectorAlert,
    AlertSeverity,
    AlertStatus,
    WaterQualityParameters,
)


class AlertService:
    """Service for generating alerts from real sensor data."""

    # Column mappings from CSV to our schema
    COLUMN_MAP = {
        "STN code": "station_code",
        "Monitoring Location": "location",
        "Date": "date",
        "Temperature (C)": "temperature",
        "Dissolved Oxygen (mg/L)": "dissolved_oxygen",
        "pH": "ph",
        "Conductivity (µmho/cm)": "conductivity",
        "BOD (mg/L)": "bod",
        "NitrateN (mg/L)": "nitrate_n",
        "Fecal Coliform (MPN/100ml)": "fecal_coliform",
        "Total Coliform (MPN/100ml)": "total_coliform",
        "latitude": "latitude",
        "longitude": "longitude",
    }

    def __init__(self):
        self._settings = get_settings()
        self._sensor_data: Optional[pd.DataFrame] = None
        self._stations_meta: Optional[Dict[str, Dict]] = None

    def _load_sensor_data(self) -> pd.DataFrame:
        """Load sensor data from CSV file."""
        if self._sensor_data is None:
            csv_path = self._settings.sensor_data_path
            if not csv_path.exists():
                raise FileNotFoundError(f"Sensor data not found at {csv_path}")

            df = pd.read_csv(csv_path)

            # Parse date column if present
            if "Date" in df.columns:
                df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

            self._sensor_data = df

        return self._sensor_data

    def _load_stations_metadata(self) -> Dict[str, Dict]:
        """Load station metadata from nodes.csv."""
        if self._stations_meta is None:
            nodes_path = self._settings.nodes_path
            if nodes_path.exists():
                nodes_df = pd.read_csv(nodes_path)
                self._stations_meta = {}
                for _, row in nodes_df.iterrows():
                    self._stations_meta[str(row["STN code"])] = {
                        "station_name": row.get("Monitoring Location", "Unknown"),
                        "location": row.get("Monitoring Location", "Unknown"),
                        "river_cluster": row.get("river_cluster", "UNKNOWN"),
                        "water_body": row.get("Type Water Body", "RIVER"),
                        "state": row.get("State Name", ""),
                        "lat": row.get("latitude", 0),
                        "lon": row.get("longitude", 0),
                    }
            else:
                self._stations_meta = {}

        return self._stations_meta

    def _extract_parameters(self, row: pd.Series) -> WaterQualityParameters:
        """Extract water quality parameters from a data row."""
        return WaterQualityParameters(
            temperature=self._safe_float(row.get("Temperature (C)")),
            dissolved_oxygen=self._safe_float(row.get("Dissolved Oxygen (mg/L)")),
            ph=self._safe_float(row.get("pH")),
            conductivity=self._safe_float(row.get("Conductivity (µmho/cm)")),
            bod=self._safe_float(row.get("BOD (mg/L)")),
            nitrate_n=self._safe_float(row.get("NitrateN (mg/L)")),
            fecal_coliform=self._safe_float(row.get("Fecal Coliform (MPN/100ml)")),
            total_coliform=self._safe_float(row.get("Total Coliform (MPN/100ml)")),
        )

    def _safe_float(self, value) -> Optional[float]:
        """Safely convert value to float."""
        if pd.isna(value):
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _check_thresholds(self, params: WaterQualityParameters) -> List[Dict[str, Any]]:
        """Check parameters against thresholds and return violations."""
        violations = []
        thresholds = WATER_QUALITY_THRESHOLDS

        # Temperature check
        if params.temperature is not None:
            max_temp = thresholds["temperature"]["normal_max"]
            if params.temperature > max_temp:
                violations.append({
                    "parameter": "temperature",
                    "value": params.temperature,
                    "threshold": max_temp,
                    "type": "exceeds_max",
                    "severity": min(1.0, (params.temperature - max_temp) / 10),
                })

        # Dissolved Oxygen check (lower is bad)
        if params.dissolved_oxygen is not None:
            min_do = thresholds["dissolved_oxygen"]["normal_min"]
            if params.dissolved_oxygen < min_do:
                violations.append({
                    "parameter": "dissolved_oxygen",
                    "value": params.dissolved_oxygen,
                    "threshold": min_do,
                    "type": "below_min",
                    "severity": min(1.0, (min_do - params.dissolved_oxygen) / 5),
                })

        # pH check (both bounds)
        if params.ph is not None:
            min_ph = thresholds["ph"]["normal_min"]
            max_ph = thresholds["ph"]["normal_max"]
            if params.ph < min_ph:
                violations.append({
                    "parameter": "ph",
                    "value": params.ph,
                    "threshold": min_ph,
                    "type": "below_min",
                    "severity": min(1.0, (min_ph - params.ph) / 3),
                })
            elif params.ph > max_ph:
                violations.append({
                    "parameter": "ph",
                    "value": params.ph,
                    "threshold": max_ph,
                    "type": "exceeds_max",
                    "severity": min(1.0, (params.ph - max_ph) / 3),
                })

        # Conductivity check
        if params.conductivity is not None:
            max_cond = thresholds["conductivity"]["normal_max"]
            if params.conductivity > max_cond:
                violations.append({
                    "parameter": "conductivity",
                    "value": params.conductivity,
                    "threshold": max_cond,
                    "type": "exceeds_max",
                    "severity": min(1.0, (params.conductivity - max_cond) / 1000),
                })

        # BOD check
        if params.bod is not None:
            max_bod = thresholds["bod"]["normal_max"]
            if params.bod > max_bod:
                violations.append({
                    "parameter": "bod",
                    "value": params.bod,
                    "threshold": max_bod,
                    "type": "exceeds_max",
                    "severity": min(1.0, (params.bod - max_bod) / 30),
                })

        # Nitrate check
        if params.nitrate_n is not None:
            max_nitrate = thresholds["nitrate_n"]["normal_max"]
            if params.nitrate_n > max_nitrate:
                violations.append({
                    "parameter": "nitrate_n",
                    "value": params.nitrate_n,
                    "threshold": max_nitrate,
                    "type": "exceeds_max",
                    "severity": min(1.0, (params.nitrate_n - max_nitrate) / 20),
                })

        # Fecal Coliform check
        if params.fecal_coliform is not None:
            max_fc = thresholds["fecal_coliform"]["normal_max"]
            if params.fecal_coliform > max_fc:
                violations.append({
                    "parameter": "fecal_coliform",
                    "value": params.fecal_coliform,
                    "threshold": max_fc,
                    "type": "exceeds_max",
                    "severity": min(1.0, params.fecal_coliform / 10000),
                })

        # Total Coliform check
        if params.total_coliform is not None:
            max_tc = thresholds["total_coliform"]["normal_max"]
            if params.total_coliform > max_tc:
                violations.append({
                    "parameter": "total_coliform",
                    "value": params.total_coliform,
                    "threshold": max_tc,
                    "type": "exceeds_max",
                    "severity": min(1.0, params.total_coliform / 50000),
                })

        return violations

    def _calculate_severity_score(self, violations: List[Dict]) -> float:
        """Calculate overall severity score from violations."""
        if not violations:
            return 0.0
        # Average of individual violation severities, weighted by count
        total_severity = sum(v["severity"] for v in violations)
        return min(1.0, total_severity / len(violations) + 0.1 * len(violations))

    def _get_severity_level(self, score: float) -> AlertSeverity:
        """Map severity score to severity level."""
        for level, config in SEVERITY_LEVELS.items():
            if config["min_score"] <= score < config["max_score"]:
                return AlertSeverity(level)
        return AlertSeverity.CRITICAL

    def _determine_anomaly_type(self, violations: List[Dict]) -> str:
        """Determine anomaly type from violations."""
        if not violations:
            return "Normal"

        # Priority order for anomaly types
        violation_params = {v["parameter"] for v in violations}

        if "fecal_coliform" in violation_params or "total_coliform" in violation_params:
            return "Bacterial Contamination"
        if "bod" in violation_params and any(v["severity"] > 0.5 for v in violations if v["parameter"] == "bod"):
            return "High Organic Load"
        if "conductivity" in violation_params:
            return "Chemical Anomaly"
        if "temperature" in violation_params:
            return "Thermal Anomaly"
        if "ph" in violation_params:
            return "pH Anomaly"
        if "dissolved_oxygen" in violation_params:
            return "Low Oxygen"
        if "nitrate_n" in violation_params:
            return "Agricultural Runoff"

        return "Water Quality Anomaly"

    def scan_for_anomalies(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        station_codes: Optional[List[str]] = None,
        min_severity: float = 0.3,
        limit: int = 100,
    ) -> List[InspectorAlert]:
        """
        Scan sensor data for threshold exceedances and generate alerts.

        Args:
            start_date: Filter readings from this date
            end_date: Filter readings until this date
            station_codes: Filter to specific stations
            min_severity: Minimum severity score to include
            limit: Maximum number of alerts to return

        Returns:
            List of InspectorAlert objects for threshold violations
        """
        df = self._load_sensor_data()
        stations_meta = self._load_stations_metadata()
        alerts = []

        # Apply date filters
        if "Date" in df.columns:
            if start_date:
                df = df[df["Date"] >= start_date]
            if end_date:
                df = df[df["Date"] <= end_date]

        # Apply station filter
        if station_codes:
            df = df[df["STN code"].astype(str).isin([str(s) for s in station_codes])]

        # Process each reading
        for _, row in df.iterrows():
            params = self._extract_parameters(row)
            violations = self._check_thresholds(params)

            if not violations:
                continue

            severity_score = self._calculate_severity_score(violations)

            if severity_score < min_severity:
                continue

            station_code = str(row.get("STN code", ""))
            station_info = stations_meta.get(station_code, {})

            # Get timestamp from data or use current time
            timestamp = row.get("Date")
            if pd.isna(timestamp):
                timestamp = datetime.utcnow()
            elif isinstance(timestamp, pd.Timestamp):
                timestamp = timestamp.to_pydatetime()

            alert = InspectorAlert(
                id=str(uuid4())[:8],
                station_code=station_code,
                station_name=station_info.get("station_name", row.get("Monitoring Location", "Unknown")),
                location=station_info.get("location", row.get("Monitoring Location", "Unknown")),
                river_cluster=station_info.get("river_cluster", "UNKNOWN"),
                coordinates=(
                    station_info.get("lat", row.get("latitude", 0)),
                    station_info.get("lon", row.get("longitude", 0)),
                ),
                severity=self._get_severity_level(severity_score),
                anomaly_type=self._determine_anomaly_type(violations),
                parameters=params,
                severity_score=round(severity_score, 3),
                timestamp=timestamp,
                status=AlertStatus.NEW,
            )

            alerts.append(alert)

        # Sort by severity score descending, then by timestamp
        alerts.sort(key=lambda a: (-a.severity_score, a.timestamp), reverse=False)

        return alerts[:limit]

    def get_latest_alerts(
        self,
        limit: int = 20,
        min_severity: float = 0.3,
    ) -> List[InspectorAlert]:
        """Get most recent alerts from the latest data readings."""
        df = self._load_sensor_data()

        # Get the most recent date in the dataset
        if "Date" in df.columns:
            latest_date = df["Date"].max()
            # Get readings from the last month
            start_date = latest_date - pd.Timedelta(days=30)
            return self.scan_for_anomalies(
                start_date=start_date,
                min_severity=min_severity,
                limit=limit,
            )

        return self.scan_for_anomalies(min_severity=min_severity, limit=limit)

    def get_station_history(
        self,
        station_code: str,
        limit: int = 50,
    ) -> List[InspectorAlert]:
        """Get historical alerts for a specific station."""
        return self.scan_for_anomalies(
            station_codes=[station_code],
            min_severity=0.0,
            limit=limit,
        )


# Singleton instance
_alert_service: Optional[AlertService] = None


def get_alert_service() -> AlertService:
    """Get or create the AlertService singleton."""
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService()
    return _alert_service
