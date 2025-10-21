import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { loadStops, loadRoutes, loadTrips, loadStopTimes, loadCalendar, loadShapes} from './core/gtfsLoader.js';
import { buildGraph } from './core/graphBuilder.js';
import calculationRoutes from './routes/calculation.routes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

export let loadedStops = null;
export let loadedRoutes = null;
export let loadedTrips = null;
export let loadedStopTimes = null;
export let loadedCalendar = null;
export let loadedShapes = null;
export let metroGraph = null;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  let totalEdges = 0;
  if (metroGraph) {
      metroGraph.forEach(edges => totalEdges += edges.length);
  }
  res.json({
    message: 'Route Calculation Service is running!',
    stopsLoaded: loadedStops ? loadedStops.size : 0,
    routesLoaded: loadedRoutes ? loadedRoutes.size : 0,
    tripsLoaded: loadedTrips ? loadedTrips.size : 0,
    stopTimesLoaded: loadedStopTimes ? `Data loaded for ${loadedStopTimes.size} trips` : 'Not loaded',
    calendarLoaded: loadedCalendar ? `${loadedCalendar.size} services loaded` : 'Not loaded',
    shapesLoaded: loadedShapes ? `${loadedShapes.size} shapes loaded` : 'Not loaded',
    graphNodes: metroGraph ? metroGraph.size : 0,
    graphTotalEdges: totalEdges
  });
});

app.use('/', calculationRoutes);

app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err.message || err);
    res.status(500).json({ error: 'An internal server error occurred. Please try again later.' });
});

const startServer = async () => {

  try {
      console.log("Loading GTFS data...");
      const [stops, routes, trips, stopTimes, calendar, shapes] = await Promise.all([
              loadStops(), loadRoutes(), loadTrips(), loadStopTimes(), loadCalendar(), loadShapes()
          ]);

      loadedStops = stops;
      loadedRoutes = routes;
      loadedTrips = trips;
      loadedStopTimes = stopTimes;
      loadedCalendar = calendar;
      loadedShapes = shapes;
      console.log("All GTFS data loaded successfully.");
      

      metroGraph = buildGraph(loadedStops, loadedStopTimes);
      console.log("Metro graph built successfully (with transfers).");

      app.listen(port, () => {
        console.log(`Route service listening on http://localhost:${port}`);
      });

  } catch (error) {
    console.error("FATAL: Failed to load GTFS data on startup. Server not started.", error);
    process.exit(1);
  }
};

startServer();