"""Fine generation API router."""

from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..models.schemas import (
    FineGenerationRequest,
    FineGenerationResponse,
    WaterQualityParameters,
)
from ..services.permit_service import get_permit_service
from ..services.gemini_agent import get_gemini_agent
from ..services.pdf_service import get_pdf_service
from ..config import POLLUTION_CATEGORIES

router = APIRouter(prefix="/fine", tags=["Fine Generation"])

# In-memory fine storage (in production, use a database)
_fines: dict[str, dict] = {}


@router.post("/generate", response_model=FineGenerationResponse)
async def generate_fine(request: FineGenerationRequest):
    """
    Generate a fine/violation notice for a factory.

    This endpoint:
    1. Looks up factory details from permit records
    2. Uses Gemini to generate formal legal content
    3. Creates a PDF document
    4. Returns the fine ID and PDF URL for download
    """
    permit_service = get_permit_service()
    gemini_agent = get_gemini_agent()
    pdf_service = get_pdf_service()

    # Get factory details
    factory = permit_service.get_permit_by_id(request.factory_id)
    if not factory:
        raise HTTPException(
            status_code=404,
            detail=f"Factory with ID {request.factory_id} not found",
        )

    # Calculate fine amount if not provided
    fine_amount = request.fine_amount
    if fine_amount is None:
        # Look up base fine from pollution category
        category_key = request.violation_type.lower().replace(" ", "_")
        category = POLLUTION_CATEGORIES.get(category_key)
        if category:
            fine_amount = category["base_fine"]
            # Add 50% if permit is expired
            if factory.status.value == "EXPIRED":
                fine_amount *= 1.5
        else:
            fine_amount = 100000.0  # Default fine

    # Generate fine ID
    fine_id = str(uuid4())[:8].upper()

    # Get alert info (mock for now)
    measurement_date = datetime.now().strftime("%d/%m/%Y %H:%M")

    # Generate content using Gemini
    generated_content = await gemini_agent.generate_fine_content(
        factory_name=factory.company_name,
        license_id=factory.license_id,
        violation_type=request.violation_type,
        violation_details=request.violation_details or f"Violation detected: {request.violation_type}",
        fine_amount=fine_amount,
        inspector_name=request.inspector_name,
        station_code=request.alert_id,  # Using alert_id as station reference
        measurement_date=measurement_date,
    )

    # Generate PDF
    pdf_path = pdf_service.generate_fine_pdf(
        fine_id=fine_id,
        factory_name=factory.company_name,
        license_id=factory.license_id,
        industry_type=factory.industry_type,
        location=factory.location_hint,
        violation_type=request.violation_type,
        fine_amount=fine_amount,
        inspector_name=request.inspector_name,
        inspector_designation=request.inspector_designation,
        station_code=request.alert_id,
        station_name="Monitoring Station",  # Could be looked up
        measurement_date=measurement_date,
        permit_status=factory.status.value,
        generated_content=generated_content,
    )

    # Store fine record
    _fines[fine_id] = {
        "fine_id": fine_id,
        "factory_id": request.factory_id,
        "factory_name": factory.company_name,
        "violation_type": request.violation_type,
        "fine_amount": fine_amount,
        "inspector_name": request.inspector_name,
        "pdf_path": pdf_path,
        "generated_at": datetime.utcnow(),
    }

    return FineGenerationResponse(
        fine_id=fine_id,
        pdf_url=pdf_service.get_pdf_url(fine_id),
        fine_amount=fine_amount,
        factory_name=factory.company_name,
        violation_type=request.violation_type,
        generated_at=datetime.utcnow(),
    )


@router.get("/{fine_id}/download")
async def download_fine_pdf(fine_id: str):
    """Download a generated fine PDF document."""
    if fine_id not in _fines:
        raise HTTPException(
            status_code=404,
            detail=f"Fine {fine_id} not found",
        )

    fine_record = _fines[fine_id]
    pdf_path = Path(fine_record["pdf_path"])

    if not pdf_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"PDF file not found for fine {fine_id}",
        )

    return FileResponse(
        path=pdf_path,
        filename=f"violation_notice_{fine_id}.pdf",
        media_type="application/pdf",
    )


@router.get("/{fine_id}")
async def get_fine_details(fine_id: str):
    """Get details of a generated fine."""
    if fine_id not in _fines:
        raise HTTPException(
            status_code=404,
            detail=f"Fine {fine_id} not found",
        )

    return _fines[fine_id]


@router.get("")
async def list_fines():
    """List all generated fines."""
    return {
        "fines": list(_fines.values()),
        "total": len(_fines),
    }


@router.post("/preview")
async def preview_fine_content(request: FineGenerationRequest):
    """
    Preview the fine content without generating a PDF.

    Useful for reviewing before final generation.
    """
    permit_service = get_permit_service()
    gemini_agent = get_gemini_agent()

    # Get factory details
    factory = permit_service.get_permit_by_id(request.factory_id)
    if not factory:
        raise HTTPException(
            status_code=404,
            detail=f"Factory with ID {request.factory_id} not found",
        )

    # Calculate fine amount
    fine_amount = request.fine_amount or 100000.0
    measurement_date = datetime.now().strftime("%d/%m/%Y %H:%M")

    # Generate content
    content = await gemini_agent.generate_fine_content(
        factory_name=factory.company_name,
        license_id=factory.license_id,
        violation_type=request.violation_type,
        violation_details=request.violation_details or "",
        fine_amount=fine_amount,
        inspector_name=request.inspector_name,
        station_code=request.alert_id,
        measurement_date=measurement_date,
    )

    return {
        "factory": {
            "name": factory.company_name,
            "license_id": factory.license_id,
            "industry_type": factory.industry_type,
            "status": factory.status.value,
        },
        "fine_amount": fine_amount,
        "content": content,
    }
