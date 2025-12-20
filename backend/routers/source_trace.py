"""Source tracing API router."""

from fastapi import APIRouter, HTTPException

from ..models.schemas import SourceTraceRequest, SourceTraceResponse
from ..services.graph_service import get_graph_service
from ..services.permit_service import get_permit_service

router = APIRouter(prefix="/source", tags=["Source Tracing"])


@router.post("/trace", response_model=SourceTraceResponse)
async def trace_pollution_source(request: SourceTraceRequest):
    """
    Trace upstream from a detection station to find potential pollution sources.

    This endpoint:
    1. Takes a station code where an anomaly was detected
    2. Traverses the river graph upstream to find the pollution path
    3. Identifies suspected factories near the upstream stations
    """
    graph_service = get_graph_service()
    permit_service = get_permit_service()

    # Verify station exists
    station_info = graph_service.get_station_info(request.station_code)
    if not station_info:
        raise HTTPException(
            status_code=404,
            detail=f"Station {request.station_code} not found in river network",
        )

    # Determine river cluster
    river_cluster = request.river_cluster or station_info.get("river_cluster")

    # Trace upstream path
    trace_path = graph_service.trace_upstream(
        station_code=request.station_code,
        max_hops=request.max_hops,
        river_cluster=river_cluster,
    )

    if not trace_path:
        raise HTTPException(
            status_code=404,
            detail=f"No upstream path found from station {request.station_code}",
        )

    # Find suspected factories along the trace path
    all_suspects = []
    seen_factories = set()

    for node in trace_path:
        # Search for factories near each station in the path
        suspects = permit_service.get_suspected_factories(
            station_lat=node.coordinates[0],
            station_lon=node.coordinates[1],
            radius_km=request.radius_km,
            trace_depth=node.depth,
            max_depth=request.max_hops,
        )

        for suspect in suspects:
            if suspect.license_id not in seen_factories:
                seen_factories.add(suspect.license_id)
                all_suspects.append(suspect)

    # Sort all suspects by suspicion score
    all_suspects.sort(key=lambda x: x.suspicion_score, reverse=True)

    # Calculate total trace distance
    total_distance = trace_path[-1].distance_km if trace_path else 0

    # Generate path geometry for map visualization
    path_geometry = graph_service.get_path_geometry(trace_path)
    path_segments = graph_service.get_path_segments(trace_path)

    # Generate factory markers for map
    factory_markers = [
        {
            "id": s.license_id,
            "name": s.company_name,
            "coordinates": [s.coordinates[1], s.coordinates[0]],  # [lon, lat]
            "suspicion_score": s.suspicion_score,
            "permit_status": s.permit_status.value,
            "industry_type": s.industry_type,
        }
        for s in all_suspects[:10]
    ]

    return SourceTraceResponse(
        source_station=request.station_code,
        path=trace_path,
        suspected_factories=all_suspects[:10],  # Top 10 suspects
        river_cluster=river_cluster or "UNKNOWN",
        total_distance_km=round(total_distance, 2),
        path_geometry=path_geometry,
        path_segments=path_segments,
        factory_markers=factory_markers,
    )


@router.get("/stations")
async def get_all_stations():
    """Get all monitoring stations in the river network."""
    graph_service = get_graph_service()
    return {"stations": graph_service.get_all_stations()}


@router.get("/stations/{station_code}")
async def get_station(station_code: str):
    """Get information about a specific station."""
    graph_service = get_graph_service()
    station = graph_service.get_station_info(station_code)

    if not station:
        raise HTTPException(
            status_code=404,
            detail=f"Station {station_code} not found",
        )

    return station


@router.get("/clusters/{cluster_name}/stations")
async def get_cluster_stations(cluster_name: str):
    """Get all stations in a river cluster."""
    graph_service = get_graph_service()
    stations = graph_service.get_stations_by_cluster(cluster_name.upper())

    if not stations:
        raise HTTPException(
            status_code=404,
            detail=f"No stations found in cluster {cluster_name}",
        )

    return {"cluster": cluster_name.upper(), "stations": stations}
