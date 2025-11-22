from fastapi import FastAPI
import uvicorn
from contextlib import asynccontextmanager

from .core.gtfs_loader import load_gtfs_data
from .core.graph_builder import build_graph
from .routes.calculation_routes import router as calculation_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server starting up...")
    
    gtfs_data = load_gtfs_data()
    if not gtfs_data:
        print("Failed to load GTFS data! Exiting.")

    graph = build_graph(gtfs_data)
    
    app.state.gtfs_data = gtfs_data
    app.state.metro_graph = graph
    
    print("Route service is ready!")
    yield

    print("Server shutting down...")

app = FastAPI(lifespan=lifespan)

app.include_router(calculation_router)

@app.get("/")
def health_check():
    return {"status": "healthy", "message": "Route Calculation Service is running"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=3002, reload=True)