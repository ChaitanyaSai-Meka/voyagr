import heapq
import pandas as pd

def is_service_active(service_id, target_date, calendar_df):
    service = calendar_df[calendar_df['service_id'] == service_id]
    if service.empty:
        return False
    
    service = service.iloc[0]
    
    date_str = int(target_date.strftime('%Y%m%d'))
    if not (service['start_date'] <= date_str <= service['end_date']):
        return False
        
    day_name = target_date.strftime('%A').lower()
    if service[day_name] == 1:
        return True
    
    return False

def reconstruct_path(came_from, final_state_key, start_state, gtfs_data):
    steps = []
    current_key = final_state_key
    
    stops_df = gtfs_data['stops']
    routes_df = gtfs_data['routes']
    trips_df = gtfs_data['trips']
    
    def get_stop_name(stop_id):
        stop = stops_df[stops_df['stop_id'].astype(str) == str(stop_id)]
        if not stop.empty:
            return stop.iloc[0]['stop_name']
        return "Unknown Stop"

    def get_route_details(trip_id):
        if not trip_id: return None, None
        trip = trips_df[trips_df['trip_id'] == trip_id]
        if not trip.empty:
            route_id = trip.iloc[0]['route_id']
            route = routes_df[routes_df['route_id'] == route_id]
            if not route.empty:
                long_name = route.iloc[0]['route_long_name'] if 'route_long_name' in route.columns else route.iloc[0]['route_short_name']
                color = route.iloc[0]['route_color'] if 'route_color' in route.columns else None
                return long_name, color
        return None, None

    def format_time(seconds):
        if seconds is None: return None
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        return f"{h:02}:{m:02}:{s:02}"

    while current_key in came_from:
        path_info = came_from[current_key]
        
        edge = path_info['edge']
        stop_id = path_info['stop_id']
        
        trip_id = edge.get('trip_id')
        walk_time = edge.get('walk_time')
        travel_time = edge.get('travel_time')
        wait_time = path_info.get('wait_time')

        step_data = {
            "stopId": str(stop_id),
            "stopName": get_stop_name(stop_id),
            "edgeType": edge['type'],
            "arrivalTime": format_time(path_info['arrival_time']),
            "departureTime": format_time(path_info['departure_time_from_prev']),
            "tripId": str(trip_id) if trip_id else None,
            "walkDurationSeconds": int(walk_time) if walk_time is not None else None,
            "travelDurationSeconds": int(travel_time) if travel_time is not None else None,
            "waitDurationSeconds": int(wait_time) if wait_time is not None else None
        }
        
        if edge['type'] == 'travel':
            r_name, r_color = get_route_details(trip_id)
            step_data["routeShortName"] = str(r_name) if r_name else None
            step_data["routeColor"] = f"#{r_color}" if r_color else None

        steps.append(step_data)
        
        current_key = path_info['prev_state_key']

    start_stop_id = start_state['stop_id']
    start_step = {
        "stopId": str(start_stop_id),
        "stopName": get_stop_name(start_stop_id),
        "edgeType": "start",
        "arrivalTime": None,
        "departureTime": format_time(start_state['arrival_time']),
        "tripId": None,
        "walkDurationSeconds": None,
        "travelDurationSeconds": None,
        "waitDurationSeconds": None
    }
    steps.append(start_step)
    
    steps.reverse()
    
    final_arrival_secs = int(final_state_key.split('_')[1])
    start_secs = start_state['arrival_time']
    
    return {
        "totalTimeSeconds": int(final_arrival_secs - start_secs),
        "departureTime": format_time(start_secs),
        "arrivalTime": format_time(final_arrival_secs),
        "steps": steps
    }

def find_fastest_path(graph, start_id, end_id, departure_time, gtfs_data, target_date):
    pq = []
    heapq.heappush(pq, (departure_time, start_id))
    
    earliest_arrival = {node: float('inf') for node in graph}
    earliest_arrival[start_id] = departure_time
    
    came_from = {}
    
    calendar_df = gtfs_data['calendar']
    trips_df = gtfs_data['trips']
    
    trip_service_map = pd.Series(trips_df.service_id.values, index=trips_df.trip_id).to_dict()

    MAX_ITERATIONS = 1000000
    iterations = 0

    while pq:
        iterations += 1
        if iterations > MAX_ITERATIONS:
            print("Max iterations reached in Dijkstra")
            return None

        current_time, current_stop = heapq.heappop(pq)
        
        if current_time > earliest_arrival[current_stop]:
            continue
            
        if current_stop == end_id:
            current_state_key = f"{current_stop}_{current_time}"
            start_state = {'stop_id': start_id, 'arrival_time': departure_time}
            return reconstruct_path(came_from, current_state_key, start_state, gtfs_data)
            
        edges = graph.get(current_stop, [])
        for edge in edges:
            arrival_at_next = float('inf')
            wait_time = None
            departure_from_curr = None
            
            if edge['type'] == 'transfer':
                arrival_at_next = current_time + edge['walk_time']
                
            elif edge['type'] == 'travel':
                train_dep = edge['departure_time']
                train_arr = edge['arrival_time']
                
                if current_time <= train_dep:
                    trip_id = edge['trip_id']
                    service_id = trip_service_map.get(trip_id)
                    
                    if service_id and is_service_active(service_id, target_date, calendar_df):
                        arrival_at_next = train_arr
                        wait_time = train_dep - current_time
                        departure_from_curr = train_dep
            
            dest = edge['destination_id']
            if dest in earliest_arrival and arrival_at_next < earliest_arrival[dest]:
                earliest_arrival[dest] = arrival_at_next
                
                next_state_key = f"{dest}_{arrival_at_next}"
                prev_state_key = f"{current_stop}_{current_time}"
                
                came_from[next_state_key] = {
                    'prev_state_key': prev_state_key,
                    'edge': edge,
                    'arrival_time': arrival_at_next,
                    'departure_time_from_prev': departure_from_curr,
                    'wait_time': wait_time,
                    'stop_id': dest
                }
                heapq.heappush(pq, (arrival_at_next, dest))
                
    return None