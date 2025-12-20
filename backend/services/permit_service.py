"""Permit service for factory/industry lookup from Municipal Records."""

import json
from pathlib import Path
from typing import Optional

from ..config import get_settings
from ..utils.geospatial import haversine_km, find_nearby_points
from ..models.schemas import (
    FactoryDetails,
    FactorySuspect,
    AuthorizedLimits,
    ComplianceHistory,
    PermitStatus,
)


class PermitService:
    """Service for managing and querying industrial permit records."""

    def __init__(self):
        settings = get_settings()
        self.records_dir = settings.municipal_records_dir
        self._permits: list[dict] = []
        self._loaded = False

    def _load_permits(self):
        """Load all permit records from JSON files."""
        if self._loaded:
            return

        self._permits = []
        records_path = Path(self.records_dir)

        if not records_path.exists():
            print(f"Warning: Municipal records directory not found: {records_path}")
            self._loaded = True
            return

        for json_file in records_path.glob("*.json"):
            try:
                with open(json_file, "r") as f:
                    data = json.load(f)
                    if "payload" in data:
                        permit = data["payload"]
                        # Normalize geolocation
                        if "geolocation" in permit:
                            permit["lat"] = permit["geolocation"]["lat"]
                            permit["lon"] = permit["geolocation"]["lon"]
                        self._permits.append(permit)
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Warning: Could not parse {json_file}: {e}")

        self._loaded = True
        print(f"Loaded {len(self._permits)} permit records")

    def get_all_permits(self) -> list[dict]:
        """Get all permit records."""
        self._load_permits()
        return self._permits

    def get_permit_by_id(self, license_id: str) -> Optional[FactoryDetails]:
        """Get a specific permit by license ID."""
        self._load_permits()

        for permit in self._permits:
            if permit.get("license_id") == license_id:
                return self._to_factory_details(permit)

        return None

    def get_nearby_factories(
        self,
        lat: float,
        lon: float,
        radius_km: float = 10.0,
    ) -> list[FactoryDetails]:
        """Find factories within a given radius of coordinates."""
        self._load_permits()

        def get_coords(permit: dict) -> tuple[float, float]:
            return (permit.get("lat", 0), permit.get("lon", 0))

        nearby = find_nearby_points(lat, lon, self._permits, get_coords, radius_km)

        return [
            self._to_factory_details(permit, distance_km)
            for permit, distance_km in nearby
        ]

    def get_suspected_factories(
        self,
        station_lat: float,
        station_lon: float,
        radius_km: float = 10.0,
        pollution_type: Optional[str] = None,
        detection_time: Optional["datetime"] = None,
        trace_depth: int = 0,
        max_depth: int = 5,
    ) -> list[FactorySuspect]:
        """
        Get factories suspected of pollution using enhanced multi-factor scoring.

        Factors considered:
        - Distance (25%): Closer = higher suspicion
        - Permit Status (15%): EXPIRED/REVOKED = higher
        - Industry Match (25%): Does factory type match pollution type?
        - Violation History (15%): Past violations increase suspicion
        - Temporal Correlation (10%): Night-time detection = higher
        - Upstream Position (10%): Optimal distance upstream

        Args:
            station_lat: Detection station latitude
            station_lon: Detection station longitude
            radius_km: Search radius in km
            pollution_type: Classified pollution type (if known)
            detection_time: When pollution was detected
            trace_depth: Current depth in upstream trace
            max_depth: Maximum trace depth

        Returns:
            List of FactorySuspect sorted by suspicion score (descending)
        """
        from .suspicion_scoring import get_suspicion_calculator
        from datetime import datetime

        self._load_permits()
        calculator = get_suspicion_calculator()

        suspects = []

        for permit in self._permits:
            permit_lat = permit.get("lat", 0)
            permit_lon = permit.get("lon", 0)

            distance = haversine_km(station_lat, station_lon, permit_lat, permit_lon)

            if distance <= radius_km:
                # Use enhanced multi-factor scoring
                score_result = calculator.calculate(
                    factory=permit,
                    station_lat=station_lat,
                    station_lon=station_lon,
                    distance_km=distance,
                    radius_km=radius_km,
                    pollution_type=pollution_type,
                    detection_time=detection_time,
                    trace_depth=trace_depth,
                    max_depth=max_depth,
                )

                # Parse bank guarantee for violations estimate
                bank_guarantee = permit.get("compliance_history", {}).get(
                    "bank_guarantee_amt", "0"
                )
                try:
                    bg_value = int(str(bank_guarantee).replace(",", "").replace(" ", ""))
                    violations = 1 if bg_value > 300000 else 0
                except (ValueError, AttributeError):
                    violations = 0

                suspects.append(
                    FactorySuspect(
                        license_id=permit.get("license_id", ""),
                        company_name=permit.get("company_name", "Unknown"),
                        industry_type=permit.get("industry_type", "Unknown"),
                        coordinates=(permit_lat, permit_lon),
                        distance_from_station_km=round(distance, 2),
                        permit_status=PermitStatus(permit.get("status", "ACTIVE")),
                        suspicion_score=score_result.total,
                        valid_upto=permit.get("valid_upto"),
                        historical_violations=violations,
                    )
                )

        # Sort by suspicion score descending
        suspects.sort(key=lambda x: x.suspicion_score, reverse=True)
        return suspects

    def get_factories_by_status(self, status: PermitStatus) -> list[FactoryDetails]:
        """Get all factories with a specific permit status."""
        self._load_permits()

        return [
            self._to_factory_details(permit)
            for permit in self._permits
            if permit.get("status") == status.value
        ]

    def get_factories_by_industry_type(self, industry_type: str) -> list[FactoryDetails]:
        """Get all factories of a specific industry type."""
        self._load_permits()

        return [
            self._to_factory_details(permit)
            for permit in self._permits
            if industry_type.lower() in permit.get("industry_type", "").lower()
        ]

    def _to_factory_details(
        self, permit: dict, distance_km: Optional[float] = None
    ) -> FactoryDetails:
        """Convert a permit dict to FactoryDetails model."""
        auth_limits = permit.get("authorized_limits", {})
        compliance = permit.get("compliance_history", {})

        # Parse bank guarantee
        bg_str = compliance.get("bank_guarantee_amt", "0")
        try:
            bg_value = float(bg_str.replace(",", "").replace(" ", ""))
        except (ValueError, AttributeError):
            bg_value = 0.0

        return FactoryDetails(
            license_id=permit.get("license_id", ""),
            company_name=permit.get("company_name", "Unknown"),
            industry_type=permit.get("industry_type", "Unknown"),
            status=PermitStatus(permit.get("status", "ACTIVE")),
            valid_upto=permit.get("valid_upto", ""),
            authorized_limits=AuthorizedLimits(
                max_discharge_kld=auth_limits.get("max_discharge_kld", 0),
                primary_pollutant=auth_limits.get("primary_pollutant", "Unknown"),
            ),
            coordinates=(permit.get("lat", 0), permit.get("lon", 0)),
            location_hint=permit.get("location_hint", ""),
            compliance_history=ComplianceHistory(
                last_inspection=compliance.get("last_inspection"),
                bank_guarantee=bg_value,
                violations_count=1 if bg_value > 300000 else 0,
            ),
            distance_from_station_km=round(distance_km, 2) if distance_km else None,
        )


# Singleton instance
_permit_service: Optional[PermitService] = None


def get_permit_service() -> PermitService:
    """Get singleton permit service instance."""
    global _permit_service
    if _permit_service is None:
        _permit_service = PermitService()
    return _permit_service
