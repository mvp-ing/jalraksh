"""
JalRakshak Inspector Mode API

FastAPI backend for the Municipal Inspector workflow:
- Alert management
- Pollution source tracing
- Factory/permit lookup
- AI-powered classification
- Fine generation
- Push notifications
"""

from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models.schemas import HealthResponse
from .routers import alerts, source_trace, factory, classification, fine, push

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Backend API for JalRakshak Inspector Mode - Water Pollution Monitoring & Enforcement",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(alerts.router, prefix=settings.api_prefix)
app.include_router(source_trace.router, prefix=settings.api_prefix)
app.include_router(factory.router, prefix=settings.api_prefix)
app.include_router(classification.router, prefix=settings.api_prefix)
app.include_router(fine.router, prefix=settings.api_prefix)
app.include_router(push.router, prefix=settings.api_prefix)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "description": "JalRakshak Inspector Mode API",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow(),
    )


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print(f"Starting {settings.app_name}...")

    # Pre-load graph and permit data
    from .services.graph_service import get_graph_service
    from .services.permit_service import get_permit_service

    graph_service = get_graph_service()
    permit_service = get_permit_service()

    # Trigger data loading
    stations = graph_service.get_all_stations()
    permits = permit_service.get_all_permits()

    print(f"Loaded {len(stations)} monitoring stations")
    print(f"Loaded {len(permits)} permit records")
    print(f"API ready at http://localhost:8000{settings.api_prefix}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("Shutting down JalRakshak Inspector API...")


# For running with uvicorn directly
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
