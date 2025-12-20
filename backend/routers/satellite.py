# SPDX-License-Identifier: MIT
# Copyright Jalraksh

"""
Satellite Agent API Routes
Provides endpoints for satellite imagery simulation and analysis
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/satellite",
    tags=["Satellite"]
)

# Path to frontend public satellite folder
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
SATELLITE_OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'jalrakshak', 'src', 'frontend', 'public', 'satellite')


# ==============================================================================
# Request/Response Models
# ==============================================================================
class SimulationRequest(BaseModel):
    """Request model for satellite simulation"""
    station_code: str = Field(..., description="Station code from the water quality database")
    year: int = Field(default=2023, description="Year to analyze (default: 2023)")
    simulate: bool = Field(default=True, description="Generate pollution simulation views")


class SimulationResponse(BaseModel):
    """Response model for satellite simulation"""
    status: str
    station_code: Optional[str] = None
    output_dir: Optional[str] = None
    total_frames: Optional[int] = None
    coords: Optional[dict] = None
    mode: Optional[str] = None
    message: str


class ChatRequest(BaseModel):
    """Request model for agent chat"""
    user_id: str = Field(default="anonymous", description="User identifier")
    prompt: str = Field(..., description="User's natural language request")


class ChatResponse(BaseModel):
    """Response model for agent chat"""
    response: Optional[str] = None
    error: Optional[str] = None


class FrameInfo(BaseModel):
    """Info about a generated frame"""
    filename: str
    url: str
    date: str


class SimulationStatusResponse(BaseModel):
    """Response with simulation status and available frames"""
    station_code: str
    exists: bool
    original_frames: List[FrameInfo] = []
    simulated_frames: List[FrameInfo] = []


# ==============================================================================
# Lazy Agent Initialization (to avoid import issues at startup)
# ==============================================================================
_agent_instance = None

def get_agent():
    """Lazily initialize the SatelliteAgent"""
    global _agent_instance
    if _agent_instance is None:
        try:
            # Import here to avoid circular imports and startup issues
            import sys
            sys.path.insert(0, PROJECT_ROOT)
            from agents.satellite_agent import SatelliteAgent
            
            _agent_instance = SatelliteAgent()
            logger.info("SatelliteAgent initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize SatelliteAgent: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize satellite agent: {str(e)}"
            )
    return _agent_instance


# ==============================================================================
# API Endpoints
# ==============================================================================

@router.post("/simulate", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest, background_tasks: BackgroundTasks):
    """
    Run satellite pollution simulation for a station.
    
    This endpoint triggers the generation of satellite imagery showing:
    - Original satellite views of the river
    - Simulated pollution views (high turbidity visualization)
    
    The processing happens in the background. Use `/satellite/status/{station_code}` 
    to check progress and get generated frames.
    """
    try:
        # Import the tool directly for synchronous execution
        import sys
        sys.path.insert(0, PROJECT_ROOT)
        from agents.satellite_agent import river_simulation_tool
        
        # Run the simulation (this may take a while)
        result = river_simulation_tool(
            station_code=request.station_code,
            year=request.year,
            simulate=request.simulate
        )
        
        return SimulationResponse(**result)
        
    except Exception as e:
        logger.error(f"Simulation error: {e}")
        return SimulationResponse(
            status="error",
            message=str(e)
        )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """
    Chat with the satellite agent using natural language.
    
    The agent can:
    - Understand location requests and find coordinates
    - Generate satellite imagery for rivers
    - Explain differences between original and simulated views
    
    Example prompts:
    - "Simulate pollution for station 4085"
    - "Show me satellite views of the Ganga near Varanasi"
    """
    try:
        agent = get_agent()
        result = await agent.process_user_request(
            user_id=request.user_id,
            prompt=request.prompt
        )
        
        return ChatResponse(
            response=result.get("response"),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(error=str(e))


@router.get("/status/{station_code}", response_model=SimulationStatusResponse)
async def get_simulation_status(
    station_code: str,
    base_url: str = Query(default="", description="Base URL for image serving (empty for frontend-relative)")
):
    """
    Get the status of a simulation and list available frames.
    
    Returns URLs to all generated satellite images for a station.
    Images are served from the frontend public folder.
    """
    output_dir = os.path.join(SATELLITE_OUTPUT_DIR, station_code)
    
    response = SimulationStatusResponse(
        station_code=station_code,
        exists=os.path.exists(output_dir)
    )
    
    if response.exists:
        # List original frames - return frontend-relative URLs
        original_dir = os.path.join(output_dir, "original_raw")
        if os.path.exists(original_dir):
            for filename in sorted(os.listdir(original_dir)):
                if filename.endswith('.png'):
                    # URL relative to frontend public folder
                    response.original_frames.append(FrameInfo(
                        filename=filename,
                        url=f"/satellite/{station_code}/original_raw/{filename}",
                        date=filename.replace("frame_", "").replace(".png", "")
                    ))
        
        # List simulated frames
        simulated_dir = os.path.join(output_dir, "simulated_raw")
        if os.path.exists(simulated_dir):
            for filename in sorted(os.listdir(simulated_dir)):
                if filename.endswith('.png'):
                    response.simulated_frames.append(FrameInfo(
                        filename=filename,
                        url=f"/satellite/{station_code}/simulated_raw/{filename}",
                        date=filename.replace("frame_", "").replace(".png", "")
                    ))
    
    return response


@router.get("/images/{station_code}/{folder}/{filename}")
async def get_satellite_image(station_code: str, folder: str, filename: str):
    """
    Serve a generated satellite image.
    
    Args:
        station_code: The station identifier
        folder: Either 'original_raw' or 'simulated_raw'
        filename: The image filename (e.g., 'frame_000.png')
    """
    if folder not in ["original_raw", "simulated_raw"]:
        raise HTTPException(status_code=400, detail="Invalid folder. Must be 'original_raw' or 'simulated_raw'")
    
    image_path = os.path.join(SATELLITE_OUTPUT_DIR, station_code, folder, filename)
    
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {filename}")
    
    return FileResponse(image_path, media_type="image/png")


@router.get("/stations")
async def list_available_stations():
    """
    List all station codes that have been processed.
    """
    if not os.path.exists(SATELLITE_OUTPUT_DIR):
        return {"stations": []}
    
    stations = [
        d for d in os.listdir(SATELLITE_OUTPUT_DIR)
        if os.path.isdir(os.path.join(SATELLITE_OUTPUT_DIR, d))
    ]
    
    return {"stations": sorted(stations)}
