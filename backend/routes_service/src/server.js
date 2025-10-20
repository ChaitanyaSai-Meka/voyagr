import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { loadStops, loadRoutes, loadTrips, loadStopTimes, loadCalendar, loadShapes} from './core/gtfsLoader.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

let loadedStops = null;
let loadedRoutes = null;
let loadedTrips = null;
let loadedStopTimes = null;
let loadedCalendar = null;
let loadedShapes = null;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Route Calculation Service is running!',
    stopsLoaded: loadedStops ? loadedStops.size : 0,
    routesLoaded: loadedRoutes ? loadedRoutes.size : 0,
    tripsLoaded: loadedTrips ? loadedTrips.size : 0,
    stopTimesLoaded: loadedStopTimes ? `Data loaded for ${loadedStopTimes.size} trips` : 'Not loaded',
    calendarLoaded: loadedCalendar ? `${loadedCalendar.size} services loaded` : 'Not loaded',
    shapesLoaded: loadedShapes ? `${loadedShapes.size} shapes loaded` : 'Not loaded'
  });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});

const startServer = async () => {
  try {
    console.log("Loading GTFS data...");
    loadedStops = await loadStops();
    console.log("GTFS stops loaded successfully.");

    loadedRoutes = await loadRoutes();
    console.log("GTFS routes loaded successfully.");

    loadedTrips = await loadTrips();
    console.log("GTFS trips loaded successfully.");

    loadedStopTimes = await loadStopTimes(); 
    console.log("GTFS stop times loaded successfully.");

    loadedCalendar = await loadCalendar();
    console.log("GTFS calendar loaded successfully.");

    loadedShapes = await loadShapes();
    console.log("GTFS shapes loaded successfully.");

    app.listen(port, () => {
      console.log(`Route service listening on http://localhost:${port}`);
    });

  } catch (error) {
    console.error("FATAL: Failed to load GTFS data on startup. Server not started.", error);
    process.exit(1);
  }
};

startServer();