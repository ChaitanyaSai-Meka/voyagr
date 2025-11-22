import pandas as pd

def parse_time_to_seconds(time_str):
    if not isinstance(time_str, str):
        return None
    try:
        parts = time_str.split(':')
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = int(parts[2])
        return hours * 3600 + minutes * 60 + seconds
    except (ValueError, IndexError):
        return None

def build_graph(gtfs_data):

    print("Building graph...")
    
    stops_df = gtfs_data["stops"]
    stop_times_df = gtfs_data["stop_times"]
    trips_df = gtfs_data["trips"]
    
    graph = {}
    
    for stop_id in stops_df['stop_id']:
        graph[stop_id] = []
        
    sorted_stop_times = stop_times_df.sort_values(by=['trip_id', 'stop_sequence'])
    
    for trip_id, trip_stops in sorted_stop_times.groupby('trip_id'):
        stops_list = trip_stops.to_dict('records')
        
        for i in range(len(stops_list) - 1):
            current_stop = stops_list[i]
            next_stop = stops_list[i+1]
            
            origin_id = str(current_stop['stop_id'])
            dest_id = str(next_stop['stop_id'])
            
            dep_time_secs = parse_time_to_seconds(current_stop['departure_time'])
            arr_time_secs = parse_time_to_seconds(next_stop['arrival_time'])
            
            if dep_time_secs is not None and arr_time_secs is not None:
                travel_time = arr_time_secs - dep_time_secs
                
                if origin_id in graph:
                    graph[origin_id].append({
                        'type': 'travel',
                        'destination_id': dest_id,
                        'trip_id': trip_id,
                        'departure_time': dep_time_secs,
                        'arrival_time': arr_time_secs,
                        'travel_time': travel_time
                    })

    if 'parent_station' in stops_df.columns:
        child_stops = stops_df[stops_df['parent_station'].notna()]
        
        for parent_id, group in child_stops.groupby('parent_station'):
            siblings = group['stop_id'].tolist()
            if len(siblings) > 1:
                for i in range(len(siblings)):
                    for j in range(len(siblings)):
                        if i != j:
                            stop_a = str(siblings[i])
                            stop_b = str(siblings[j])
                            
                            if stop_a in graph:
                                graph[stop_a].append({
                                    'type': 'transfer',
                                    'destination_id': stop_b,
                                    'walk_time': 300 
                                })

    print(f"Graph built with {len(graph)} nodes.")
    return graph