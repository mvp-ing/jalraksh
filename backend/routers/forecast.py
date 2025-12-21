"""Forecast API router for STGNN-based pollution prediction."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..models.schemas import (
    ForecastAlert,
    ForecastRequest,
    ForecastResponse,
    ForecastSeverity,
)
from ..services.forecast_service import get_forecast_service

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.post("/predict", response_model=ForecastResponse)
async def predict_pollution(request: ForecastRequest):
    """
    Generate pollution forecasts using the STGNN model.

    Randomly selects 10-20 monitoring stations and predicts
    severity for 1, 2, and 3 months ahead. Returns only
    CRITICAL predictions by default.

    Args:
        request: ForecastRequest with parameters

    Returns:
        ForecastResponse with list of forecast alerts
    """
    try:
        forecast_service = get_forecast_service()

        # Validate horizons
        valid_horizons = [h for h in request.horizons if 1 <= h <= 3]
        if not valid_horizons:
            valid_horizons = [1, 2, 3]

        # Generate forecasts
        min_sev = request.min_severity.value if request.min_severity else "CRITICAL"
        forecasts = forecast_service.predict_multi_horizon(
            num_stations=request.num_stations,
            horizons=valid_horizons,
            min_severity=min_sev,
            random_seed=request.random_seed,
        )

        # Get model info
        model_info = forecast_service.get_model_info()

        return ForecastResponse(
            forecasts=forecasts,
            total_stations_analyzed=request.num_stations,
            critical_count=sum(1 for f in forecasts if f.severity_index >= 4),
            horizons_analyzed=valid_horizons,
            model_info=model_info,
            generated_at=datetime.utcnow(),
        )

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model or data not available: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Forecast generation failed: {str(e)}"
        )


@router.get("/predict", response_model=ForecastResponse)
async def get_forecast(
    num_stations: int = Query(15, ge=10, le=20, description="Number of stations to analyze"),
    horizons: str = Query("1,2,3", description="Comma-separated forecast horizons in months"),
    min_severity: Optional[ForecastSeverity] = Query(
        ForecastSeverity.CRITICAL,
        description="Minimum severity to return"
    ),
):
    """
    GET endpoint for forecast prediction (simpler query parameters).

    Example:
        GET /api/forecast/predict?num_stations=15&horizons=1,2,3&min_severity=CRITICAL
    """
    try:
        horizon_list = [int(h.strip()) for h in horizons.split(",") if h.strip().isdigit()]

        request = ForecastRequest(
            num_stations=num_stations,
            horizons=horizon_list if horizon_list else [1, 2, 3],
            min_severity=min_severity,
        )

        return await predict_pollution(request)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {str(e)}")


@router.get("/model-info")
async def get_model_info():
    """Get information about the loaded STGNN model."""
    try:
        forecast_service = get_forecast_service()
        return forecast_service.get_model_info()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"Model not available: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
