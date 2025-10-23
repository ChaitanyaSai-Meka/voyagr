import { loadedRoutes, loadedTrips, loadedShapes } from '../server.js';

export const getMapLines = (req, res, next) => {

    if (!loadedRoutes || !loadedTrips || !loadedShapes) {
        console.error("GTFS route/trip/shape data not loaded yet!");
        return res.status(503).json({ error: 'Service is not ready, map data still loading.' });
    }

    try {
        const mapLineData = [];
        const addedShapes = new Map();
        loadedTrips.forEach((trip) => {
            if (trip.routeId && trip.shapeId && loadedRoutes.has(trip.routeId) && loadedShapes.has(trip.shapeId)) {
                const routeInfo = loadedRoutes.get(trip.routeId);
                const shapeId = trip.shapeId;
                if (!addedShapes.has(routeInfo.id)) {
                    addedShapes.set(routeInfo.id, new Set());
                }
                if (!addedShapes.get(routeInfo.id).has(shapeId)) {
                    const shapeCoordinates = loadedShapes.get(shapeId);
                    let routeEntry = mapLineData.find(r => r.routeId === routeInfo.id);
                    if (!routeEntry) {
                        routeEntry = {
                            routeId: routeInfo.id,
                            routeName: routeInfo.shortName || routeInfo.longName,
                            routeColor: routeInfo.color || '#808080', 
                            shapes: []
                        };
                        mapLineData.push(routeEntry);
                    }

                    routeEntry.shapes.push(shapeCoordinates.map(p => [p.lat, p.lon]));
                    addedShapes.get(routeInfo.id).add(shapeId);
                }
            }
        });

        console.log(`Prepared map data for ${mapLineData.length} routes.`);
        res.status(200).json(mapLineData);

    } catch (error) {
        console.error("Error preparing map line data:", error);
        next(error);
    }
};