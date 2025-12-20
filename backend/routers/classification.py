"""Classification API router using Gemini AI."""

from fastapi import APIRouter

from ..models.schemas import (
    ClassificationRequest,
    ClassificationResult,
)
from ..services.gemini_agent import get_gemini_agent

router = APIRouter(prefix="/classify", tags=["Classification"])


@router.post("", response_model=ClassificationResult)
async def classify_pollution(request: ClassificationRequest):
    """
    Classify pollution type from water quality parameters using Gemini AI.

    This endpoint analyzes water quality parameters and determines:
    - The type of pollution (Industrial Dye, Sewage, Thermal, etc.)
    - Confidence level of the classification
    - Detailed reasoning for the classification
    - Which pollution types were ruled out and why
    - Recommended action for the inspector

    If Gemini API is not configured, falls back to rule-based classification.
    """
    agent = get_gemini_agent()

    result = await agent.classify_pollution(
        parameters=request.parameters,
        station_code=request.station_code,
        context=request.context,
    )

    return result


@router.post("/batch")
async def classify_batch(requests: list[ClassificationRequest]):
    """
    Classify multiple pollution samples in batch.

    Useful for analyzing multiple stations or time series data.
    """
    agent = get_gemini_agent()
    results = []

    for req in requests:
        result = await agent.classify_pollution(
            parameters=req.parameters,
            station_code=req.station_code,
            context=req.context,
        )
        results.append(result)

    return {"classifications": results, "total": len(results)}


@router.get("/categories")
async def get_pollution_categories():
    """Get all pollution categories with their indicators and fines."""
    from ..config import POLLUTION_CATEGORIES

    return {
        "categories": [
            {
                "key": key,
                "name": cat["name"],
                "indicators": cat["indicators"],
                "industry_types": cat["industry_types"],
                "act_section": cat["act_section"],
                "base_fine": cat["base_fine"],
                "color": cat["color"],
            }
            for key, cat in POLLUTION_CATEGORIES.items()
        ]
    }
