"""Alerts API router for Inspector Mode."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from ..models.schemas import (
    InspectorAlert,
    AlertListResponse,
    AlertAcknowledgeRequest,
    AlertSeverity,
    AlertStatus,
    WaterQualityParameters,
)
from ..services.graph_service import get_graph_service
from ..services.alert_service import get_alert_service
from ..config import WATER_QUALITY_THRESHOLDS, SEVERITY_LEVELS

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# In-memory alert storage (combines real data alerts + acknowledged status)
_alerts: dict[str, InspectorAlert] = {}
_alerts_loaded: bool = False


def _ensure_alerts_loaded():
    """Load alerts from real sensor data if not already loaded."""
    global _alerts_loaded
    if not _alerts_loaded:
        try:
            alert_service = get_alert_service()
            real_alerts = alert_service.get_latest_alerts(limit=50, min_severity=0.3)
            for alert in real_alerts:
                _alerts[alert.id] = alert
            _alerts_loaded = True
        except Exception as e:
            print(f"Warning: Could not load real alerts: {e}")


def calculate_severity_score(params: WaterQualityParameters) -> float:
    """Calculate severity score based on water quality parameters."""
    violations = 0
    total_params = 0

    thresholds = WATER_QUALITY_THRESHOLDS

    if params.temperature is not None:
        total_params += 1
        if params.temperature > thresholds["temperature"]["normal_max"]:
            violations += (params.temperature - thresholds["temperature"]["normal_max"]) / 10

    if params.dissolved_oxygen is not None:
        total_params += 1
        if params.dissolved_oxygen < thresholds["dissolved_oxygen"]["normal_min"]:
            violations += (thresholds["dissolved_oxygen"]["normal_min"] - params.dissolved_oxygen) / 5

    if params.ph is not None:
        total_params += 1
        if params.ph < thresholds["ph"]["normal_min"] or params.ph > thresholds["ph"]["normal_max"]:
            violations += abs(params.ph - 7.0) / 3

    if params.conductivity is not None:
        total_params += 1
        if params.conductivity > thresholds["conductivity"]["normal_max"]:
            violations += (params.conductivity - thresholds["conductivity"]["normal_max"]) / 1000

    if params.bod is not None:
        total_params += 1
        if params.bod > thresholds["bod"]["normal_max"]:
            violations += (params.bod - thresholds["bod"]["normal_max"]) / 10

    if params.fecal_coliform is not None:
        total_params += 1
        if params.fecal_coliform > thresholds["fecal_coliform"]["normal_max"]:
            violations += min(1.0, params.fecal_coliform / 10000)

    if total_params == 0:
        return 0.0

    # Normalize to 0-1 range
    score = min(1.0, violations / total_params)
    return round(score, 3)


def get_severity_level(score: float) -> AlertSeverity:
    """Map severity score to severity level."""
    for level, config in SEVERITY_LEVELS.items():
        if config["min_score"] <= score < config["max_score"]:
            return AlertSeverity(level)
    return AlertSeverity.CRITICAL


def determine_anomaly_type(params: WaterQualityParameters) -> str:
    """Determine the type of anomaly based on parameters."""
    if params.fecal_coliform and params.fecal_coliform > 5000:
        return "Bacterial Contamination"
    if params.bod and params.bod > 30:
        return "High Organic Load"
    if params.conductivity and params.conductivity > 2000:
        return "Chemical Anomaly"
    if params.temperature and params.temperature > 35:
        return "Thermal Anomaly"
    if params.ph and (params.ph < 5 or params.ph > 9):
        return "pH Anomaly"
    if params.dissolved_oxygen and params.dissolved_oxygen < 3:
        return "Low Oxygen"
    return "Water Quality Anomaly"


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    status: Optional[AlertStatus] = Query(None, description="Filter by status"),
    severity: Optional[AlertSeverity] = Query(None, description="Filter by severity"),
    river_cluster: Optional[str] = Query(None, description="Filter by river cluster"),
    min_severity: float = Query(
        0.0, ge=0.0, le=1.0, description="Minimum severity score (0.0 - 1.0)"
    ),
    limit: int = Query(50, ge=1, le=200),
):
    """List all active alerts with optional filtering."""
    # Load real alerts from sensor data on first request
    _ensure_alerts_loaded()

    alerts = list(_alerts.values())

    # Apply filters
    if status:
        alerts = [a for a in alerts if a.status == status]
    if severity:
        alerts = [a for a in alerts if a.severity == severity]
    if river_cluster:
        alerts = [a for a in alerts if a.river_cluster.upper() == river_cluster.upper()]
    if min_severity:
        alerts = [a for a in alerts if a.severity_score >= min_severity]

    # Sort by timestamp (newest first) and severity
    alerts.sort(key=lambda a: (a.severity_score, a.timestamp), reverse=True)

    return AlertListResponse(
        alerts=alerts[:limit],
        total=len(alerts),
    )


@router.get("/{alert_id}", response_model=InspectorAlert)
async def get_alert(alert_id: str):
    """Get details of a specific alert."""
    if alert_id not in _alerts:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return _alerts[alert_id]


@router.post("/{alert_id}/ack")
async def acknowledge_alert(alert_id: str, request: AlertAcknowledgeRequest):
    """Acknowledge an alert."""
    if alert_id not in _alerts:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    alert = _alerts[alert_id]
    alert.status = AlertStatus.ACKNOWLEDGED

    return {
        "message": f"Alert {alert_id} acknowledged",
        "alert": alert,
    }


@router.patch("/{alert_id}/status")
async def update_alert_status(alert_id: str, status: AlertStatus):
    """Update the status of an alert."""
    if alert_id not in _alerts:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    alert = _alerts[alert_id]
    alert.status = status

    return {
        "message": f"Alert {alert_id} status updated to {status.value}",
        "alert": alert,
    }


@router.post("/create", response_model=InspectorAlert)
async def create_alert(
    station_code: str,
    parameters: WaterQualityParameters,
):
    """
    Create a new alert for a station.

    This endpoint is typically called by the anomaly detection system.
    """
    graph_service = get_graph_service()
    station = graph_service.get_station_info(station_code)

    if not station:
        raise HTTPException(
            status_code=404,
            detail=f"Station {station_code} not found",
        )

    # Calculate severity
    severity_score = calculate_severity_score(parameters)
    severity = get_severity_level(severity_score)
    anomaly_type = determine_anomaly_type(parameters)

    alert = InspectorAlert(
        id=str(uuid4())[:8],
        station_code=station_code,
        station_name=station["station_name"],
        location=station["location"],
        river_cluster=station["river_cluster"],
        coordinates=(station["lat"], station["lon"]),
        severity=severity,
        anomaly_type=anomaly_type,
        parameters=parameters,
        severity_score=severity_score,
        timestamp=datetime.utcnow(),
        status=AlertStatus.NEW,
    )

    _alerts[alert.id] = alert

    return alert


@router.post("/demo/generate")
async def generate_demo_alerts():
    """Generate demo alerts for testing the inspector workflow."""
    graph_service = get_graph_service()
    stations = graph_service.get_all_stations()[:5]  # Use first 5 stations

    demo_scenarios = [
        {
            "params": WaterQualityParameters(
                temperature=42.0,
                dissolved_oxygen=2.5,
                ph=5.2,
                conductivity=2800,
                bod=45.0,
                fecal_coliform=200,
            ),
            "description": "Industrial Dye Discharge",
        },
        {
            "params": WaterQualityParameters(
                temperature=28.0,
                dissolved_oxygen=3.0,
                ph=7.5,
                conductivity=800,
                bod=35.0,
                fecal_coliform=12000,
            ),
            "description": "Sewage Contamination",
        },
        {
            "params": WaterQualityParameters(
                temperature=38.0,
                dissolved_oxygen=4.0,
                ph=8.2,
                conductivity=1200,
                bod=8.0,
            ),
            "description": "Thermal Pollution",
        },
    ]

    created_alerts = []

    for i, station in enumerate(stations[:len(demo_scenarios)]):
        scenario = demo_scenarios[i]
        severity_score = calculate_severity_score(scenario["params"])
        severity = get_severity_level(severity_score)

        alert = InspectorAlert(
            id=str(uuid4())[:8],
            station_code=station["station_code"],
            station_name=station["station_name"],
            location=station["location"],
            river_cluster=station["river_cluster"],
            coordinates=(station["lat"], station["lon"]),
            severity=severity,
            anomaly_type=scenario["description"],
            parameters=scenario["params"],
            severity_score=severity_score,
            timestamp=datetime.utcnow(),
            status=AlertStatus.NEW,
        )

        _alerts[alert.id] = alert
        created_alerts.append(alert)

    return {
        "message": f"Generated {len(created_alerts)} demo alerts",
        "alerts": created_alerts,
    }


@router.post("/scan")
async def scan_real_data(
    min_severity: float = Query(0.3, ge=0.0, le=1.0, description="Minimum severity threshold"),
    limit: int = Query(50, ge=1, le=200, description="Maximum alerts to return"),
):
    """
    Scan real sensor data for threshold violations and generate alerts.

    This endpoint scans the actual sensor data CSV file and creates alerts
    for any readings that exceed CPCB water quality thresholds.
    """
    global _alerts_loaded

    try:
        alert_service = get_alert_service()
        real_alerts = alert_service.get_latest_alerts(limit=limit, min_severity=min_severity)

        # Update the alerts store
        new_count = 0
        for alert in real_alerts:
            if alert.id not in _alerts:
                _alerts[alert.id] = alert
                new_count += 1

        _alerts_loaded = True

        return {
            "message": f"Scanned sensor data: found {len(real_alerts)} violations, {new_count} new alerts added",
            "total_alerts": len(_alerts),
            "alerts": real_alerts,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Sensor data file not found: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scanning data: {str(e)}")


@router.post("/refresh")
async def refresh_alerts():
    """
    Clear existing alerts and reload from real sensor data.
    """
    global _alerts, _alerts_loaded

    _alerts.clear()
    _alerts_loaded = False

    _ensure_alerts_loaded()

    return {
        "message": f"Refreshed alerts from real sensor data",
        "total_alerts": len(_alerts),
        "alerts": list(_alerts.values())[:20],  # Return first 20
    }
