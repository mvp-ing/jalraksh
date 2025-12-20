"""Factory/Permit lookup API router."""

from fastapi import APIRouter, HTTPException, Query

from ..models.schemas import (
    FactoryDetails,
    FactoryNearbyResponse,
    PermitStatus,
)
from ..services.permit_service import get_permit_service

router = APIRouter(prefix="/factory", tags=["Factory Lookup"])


@router.get("/nearby", response_model=FactoryNearbyResponse)
async def get_nearby_factories(
    lat: float = Query(..., description="Latitude of search center"),
    lon: float = Query(..., description="Longitude of search center"),
    radius_km: float = Query(10.0, ge=1.0, le=50.0, description="Search radius in km"),
):
    """
    Find factories/industries within a given radius of coordinates.

    Useful for finding potential pollution sources near a monitoring station.
    """
    permit_service = get_permit_service()
    factories = permit_service.get_nearby_factories(lat, lon, radius_km)

    return FactoryNearbyResponse(
        factories=factories,
        total=len(factories),
    )


@router.get("/all")
async def get_all_factories():
    """Get all registered factories/industries."""
    permit_service = get_permit_service()
    permits = permit_service.get_all_permits()

    return {
        "factories": [
            {
                "license_id": p.get("license_id"),
                "company_name": p.get("company_name"),
                "industry_type": p.get("industry_type"),
                "status": p.get("status"),
                "coordinates": (p.get("lat"), p.get("lon")),
            }
            for p in permits
        ],
        "total": len(permits),
    }


@router.get("/expired")
async def get_expired_permits():
    """Get all factories with expired permits."""
    permit_service = get_permit_service()
    factories = permit_service.get_factories_by_status(PermitStatus.EXPIRED)

    return {
        "factories": factories,
        "total": len(factories),
    }


@router.get("/by-industry/{industry_type}")
async def get_factories_by_industry(industry_type: str):
    """
    Get factories by industry type.

    Examples: "textile", "dyeing", "thermal", "sewage", "food", "leather"
    """
    permit_service = get_permit_service()
    factories = permit_service.get_factories_by_industry_type(industry_type)

    if not factories:
        raise HTTPException(
            status_code=404,
            detail=f"No factories found for industry type: {industry_type}",
        )

    return {
        "industry_type": industry_type,
        "factories": factories,
        "total": len(factories),
    }


@router.get("/{license_id}", response_model=FactoryDetails)
async def get_factory_details(license_id: str):
    """Get detailed information about a specific factory by license ID."""
    permit_service = get_permit_service()
    factory = permit_service.get_permit_by_id(license_id)

    if not factory:
        raise HTTPException(
            status_code=404,
            detail=f"Factory with license ID {license_id} not found",
        )

    return factory


@router.get("/{license_id}/permit")
async def get_factory_permit_status(license_id: str):
    """Get permit status and compliance information for a factory."""
    permit_service = get_permit_service()
    factory = permit_service.get_permit_by_id(license_id)

    if not factory:
        raise HTTPException(
            status_code=404,
            detail=f"Factory with license ID {license_id} not found",
        )

    return {
        "license_id": factory.license_id,
        "company_name": factory.company_name,
        "status": factory.status,
        "valid_upto": factory.valid_upto,
        "authorized_limits": factory.authorized_limits,
        "compliance_history": factory.compliance_history,
        "is_compliant": factory.status == PermitStatus.ACTIVE,
    }
