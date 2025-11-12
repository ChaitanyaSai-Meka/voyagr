from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class Stop(BaseModel):
    stop_id: str
    name: Optional[str] = None
    parent_station: Optional[str] = None
    location_type: Optional[int] = 0

class StopTime(BaseModel):
    trip_id: str
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    stop_id: str
    stop_sequence: Optional[int] = None

class Trip(BaseModel):
    trip_id: str
    service_id: str
    route_id: Optional[str] = None

class CalendarEntry(BaseModel):
    service_id: str
    start_date: str  
    end_date: str   
    monday: Optional[int] = 0
    tuesday: Optional[int] = 0
    wednesday: Optional[int] = 0
    thursday: Optional[int] = 0
    friday: Optional[int] = 0
    saturday: Optional[int] = 0
    sunday: Optional[int] = 0

class RouteResultStep(BaseModel):
    stopId: str
    stopName: Optional[str]
    edgeType: str
    arrivalTime: Optional[str]
    departureTime: Optional[str]
    tripId: Optional[str]
    routeShortName: Optional[str]
    walkDurationSeconds: Optional[int]
    travelDurationSeconds: Optional[int]
    waitDurationSeconds: Optional[int]

class RouteResult(BaseModel):
    totalTimeSeconds: Optional[int]
    departureTime: Optional[str]
    arrivalTime: Optional[str]
    steps: List[RouteResultStep]

class CalculateRouteRequest(BaseModel):
    start_station_id: str
    end_station_id: str
    departure_time: Optional[str] = None     
    departure_date: Optional[str] = None     
    stops: List[Stop]
    stop_times: List[StopTime]
    trips: List[Trip]
    calendar: Optional[List[CalendarEntry]] = []
    routes: Optional[List[Dict[str, Any]]] = []
