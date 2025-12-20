"""Pydantic models for Inspector Mode API."""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# Enums
class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"


class PermitStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


# Water Quality Parameters
class WaterQualityParameters(BaseModel):
    """Water quality measurement parameters."""

    temperature: Optional[float] = Field(None, description="Temperature in °C")
    dissolved_oxygen: Optional[float] = Field(None, alias="do", description="Dissolved oxygen in mg/L")
    ph: Optional[float] = Field(None, description="pH level")
    conductivity: Optional[float] = Field(None, description="Conductivity in µmho/cm")
    bod: Optional[float] = Field(None, description="Biochemical Oxygen Demand in mg/L")
    nitrate_n: Optional[float] = Field(None, description="Nitrate Nitrogen in mg/L")
    fecal_coliform: Optional[float] = Field(None, description="Fecal Coliform in MPN/100ml")
    total_coliform: Optional[float] = Field(None, description="Total Coliform in MPN/100ml")

    class Config:
        populate_by_name = True


# Alert Models
class InspectorAlert(BaseModel):
    """Alert for pollution anomaly."""

    id: str
    station_code: str
    station_name: str
    location: str
    river_cluster: str
    coordinates: tuple[float, float]  # (lat, lon)
    severity: AlertSeverity
    anomaly_type: str
    parameters: WaterQualityParameters
    severity_score: float = Field(ge=0.0, le=1.0)
    timestamp: datetime
    status: AlertStatus = AlertStatus.NEW


class AlertListResponse(BaseModel):
    """Response for listing alerts."""

    alerts: list[InspectorAlert]
    total: int


class AlertAcknowledgeRequest(BaseModel):
    """Request to acknowledge an alert."""

    inspector_id: Optional[str] = None
    notes: Optional[str] = None


# Source Trace Models
class TraceNode(BaseModel):
    """Node in the source trace path."""

    station_code: str
    station_name: str
    location: str
    coordinates: tuple[float, float]
    depth: int  # Hops from detection point
    distance_km: float


class FactorySuspect(BaseModel):
    """Suspected factory in source trace."""

    license_id: str
    company_name: str
    industry_type: str
    coordinates: tuple[float, float]
    distance_from_station_km: float
    permit_status: PermitStatus
    suspicion_score: float = Field(ge=0.0, le=1.0)
    valid_upto: Optional[str] = None
    historical_violations: int = 0


class SourceTraceRequest(BaseModel):
    """Request for source tracing."""

    station_code: str
    river_cluster: Optional[str] = None
    max_hops: int = Field(default=5, ge=1, le=10)
    radius_km: float = Field(default=10.0, ge=1.0, le=50.0)


class PathSegment(BaseModel):
    """A segment of the river path for map visualization."""

    from_station: str
    to_station: str
    coordinates: list[tuple[float, float]]  # List of [lon, lat] points
    distance_km: float
    timestamp: int = 0  # For animation timing


class SourceTraceResponse(BaseModel):
    """Response from source tracing."""

    source_station: str
    path: list[TraceNode]
    suspected_factories: list[FactorySuspect]
    river_cluster: str
    total_distance_km: float
    # Map visualization data
    path_geometry: list[tuple[float, float]] = []  # Full path as [lon, lat] points
    path_segments: list[PathSegment] = []  # Segmented path for animation
    factory_markers: list[dict] = []  # Factory locations with suspicion data


# Classification Models
class ClassificationRequest(BaseModel):
    """Request for pollution classification."""

    parameters: WaterQualityParameters
    station_code: Optional[str] = None
    context: Optional[str] = None


class ClassificationResult(BaseModel):
    """Result of pollution classification."""

    pollution_type: str
    pollution_category: str
    confidence: float = Field(ge=0.0, le=100.0)
    reasoning: str
    ruled_out: list[dict[str, str]]  # [{type, reason}]
    key_indicators: list[str]
    recommended_action: str
    act_section: str
    base_fine: float


# Factory Models
class AuthorizedLimits(BaseModel):
    """Authorized discharge limits for a factory."""

    max_discharge_kld: float
    primary_pollutant: str


class ComplianceHistory(BaseModel):
    """Compliance history for a factory."""

    last_inspection: Optional[str] = None
    bank_guarantee: Optional[float] = None
    violations_count: int = 0


class FactoryDetails(BaseModel):
    """Detailed factory information."""

    license_id: str
    company_name: str
    industry_type: str
    status: PermitStatus
    valid_upto: str
    authorized_limits: AuthorizedLimits
    coordinates: tuple[float, float]
    location_hint: str
    compliance_history: ComplianceHistory
    distance_from_station_km: Optional[float] = None


class FactoryNearbyRequest(BaseModel):
    """Request for nearby factories."""

    lat: float
    lon: float
    radius_km: float = Field(default=10.0, ge=1.0, le=50.0)


class FactoryNearbyResponse(BaseModel):
    """Response for nearby factories."""

    factories: list[FactoryDetails]
    total: int


# Fine Generation Models
class FineGenerationRequest(BaseModel):
    """Request to generate a fine document."""

    factory_id: str
    alert_id: str
    violation_type: str
    violation_details: Optional[str] = None
    fine_amount: Optional[float] = None  # Auto-calculated if not provided
    inspector_name: str
    inspector_designation: str = "Municipal Inspector"


class FineGenerationResponse(BaseModel):
    """Response from fine generation."""

    fine_id: str
    pdf_url: str
    fine_amount: float
    factory_name: str
    violation_type: str
    generated_at: datetime


# Push Notification Models
class PushSubscription(BaseModel):
    """Web Push subscription."""

    endpoint: str
    keys: dict[str, str]  # {p256dh, auth}


class PushSubscribeRequest(BaseModel):
    """Request to subscribe to push notifications."""

    subscription: PushSubscription
    inspector_id: Optional[str] = None
    topics: list[str] = Field(default=["alerts"])


class PushNotificationPayload(BaseModel):
    """Payload for push notification."""

    title: str
    body: str
    alert_id: Optional[str] = None
    station_code: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    url: Optional[str] = None


# Health Check
class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    timestamp: datetime
