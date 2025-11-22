from typing import List, Optional
from pydantic import BaseModel

class CalculateRouteRequest(BaseModel):
    start_station_id: str
    end_station_id: str
    departure_time: Optional[str] = None 
    departure_date: Optional[str] = None 
class RouteResultStep(BaseModel):
    stopId: str
    stopName: str
    edgeType: str
    arrivalTime: Optional[str] = None
    departureTime: Optional[str] = None
    tripId: Optional[str] = None
    routeShortName: Optional[str] = None
    routeColor: Optional[str] = None
    walkDurationSeconds: Optional[int] = None
    travelDurationSeconds: Optional[int] = None
    waitDurationSeconds: Optional[int] = None

class RouteResult(BaseModel):
    totalTimeSeconds: int
    departureTime: str
    arrivalTime: str
    steps: List[RouteResultStep]