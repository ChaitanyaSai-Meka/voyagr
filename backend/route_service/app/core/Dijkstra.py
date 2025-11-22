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

def find_fastest_path(graph, start_id, end_id, departure_time, gtfs_data, target_date):
    pq = []
    heapq.heappush(pq, (departure_time, start_id))
    
    earliest_arrival = {node: float('inf') for node in graph}
    earliest_arrival[start_id] = departure_time
    
    came_from = {}
    
    trips_df = gtfs_data['trips']
    calendar_df = gtfs_data['calendar']
    
    trip_service_map = pd.Series(trips_df.service_id.values, index=trips_df.trip_id).to_dict()

    while pq:
        current_time, current_stop = heapq.heappop(pq)
        
        if current_time > earliest_arrival[current_stop]:
            continue
            
        if current_stop == end_id:
            break 
            

        edges = graph.get(current_stop, [])
        for edge in edges:
            arrival_at_next = float('inf')
            
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
            
            dest = edge['destination_id']
            if arrival_at_next < earliest_arrival.get(dest, float('inf')):
                earliest_arrival[dest] = arrival_at_next
                came_from[dest] = {
                    'prev_stop': current_stop,
                    'edge': edge,
                    'arrival_time': arrival_at_next
                }
                heapq.heappush(pq, (arrival_at_next, dest))
                

    if end_id not in came_from:
        return None
        
    path = []
    curr = end_id
    while curr != start_id:
        step = came_from[curr]
        path.append(step)
        curr = step['prev_stop']
    
    path.reverse()
    return {
        "total_time": earliest_arrival[end_id] - departure_time,
        "steps": path
    }