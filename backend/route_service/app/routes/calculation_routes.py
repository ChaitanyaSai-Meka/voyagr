from fastapi import APIRouter, HTTPException, Request
from datetime import datetime
from ..models import CalculateRouteRequest, RouteResult 

router = APIRouter()

@router.post("/calculate", response_model=RouteResult)
async def calculate_route(request: Request, body: CalculateRouteRequest):

    graph = request.app.state.metro_graph
    gtfs_data = request.app.state.gtfs_data
    
    from core.Dijkstra import find_fastest_path
    from core.graph_builder import parse_time_to_seconds
    
    dep_time_secs = parse_time_to_seconds(body.departure_time)
    
    try:
        if body.departure_date:
            target_date = datetime.strptime(body.departure_date, "%Y-%m-%d")
        else:
            target_date = datetime.now()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    result = find_fastest_path(
        graph, 
        body.start_station_id, 
        body.end_station_id, 
        dep_time_secs, 
        gtfs_data, 
        target_date
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="No route found")
        
    return result