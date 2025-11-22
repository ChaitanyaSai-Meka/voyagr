import pandas as pd
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

def load_gtfs_data():
    print("Loading GTFS data with Pandas...")
    
    try:

        stops_df = pd.read_csv(os.path.join(DATA_DIR, "stops.txt"))
        routes_df = pd.read_csv(os.path.join(DATA_DIR, "routes.txt"))
        trips_df = pd.read_csv(os.path.join(DATA_DIR, "trips.txt"))  
        stop_times_df = pd.read_csv(os.path.join(DATA_DIR, "stop_times.txt"), dtype={
            'trip_id': str,
            'stop_id': str,
            'stop_sequence': int
        })
        
        calendar_df = pd.read_csv(os.path.join(DATA_DIR, "calendar.txt"))
        
        # shapes_df = pd.read_csv(os.path.join(DATA_DIR, "shapes.txt"))

        print("GTFS data loaded successfully.")
        
        return {
            "stops": stops_df,
            "routes": routes_df,
            "trips": trips_df,
            "stop_times": stop_times_df,
            "calendar": calendar_df,
            # "shapes": shapes_df 
        }

    except FileNotFoundError as e:
        print(f"Error loading GTFS data: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while loading GTFS data: {e}")
        return None