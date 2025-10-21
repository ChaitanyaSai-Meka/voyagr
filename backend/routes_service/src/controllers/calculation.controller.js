import { findFastestPath } from '../core/aStar.js';
import { parseGTFSTime } from '../core/graphBuilder.js';
import { loadedStops, loadedTrips, loadedCalendar, metroGraph } from '../server.js';

const SECONDS_IN_DAY = 24 * 60 * 60;

export const handleCalculation = async (req, res, next) => {
    const { start_station_id, end_station_id, departure_time, departure_date } = req.body;

    if (!start_station_id || !end_station_id) {
        return res.status(400).json({ error: 'start_station_id and end_station_id are required.' });
    }
    if (!loadedStops || !loadedTrips || !loadedCalendar || !metroGraph) {
        return res.status(503).json({ error: 'Service is not ready, data still loading.' });
    }
    if (!loadedStops.has(start_station_id) || !loadedStops.has(end_station_id)) {
        if (!loadedStops.has(start_station_id)) console.error(`Start station ID not found: ${start_station_id}`);
        if (!loadedStops.has(end_station_id)) console.error(`End station ID not found: ${end_station_id}`);
        return res.status(404).json({ error: 'One or both station IDs were not found in the loaded data.' });
    }

    let departureTimeSeconds;
    let departureDateObj;

    if (departure_date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(departure_date)) {
            return res.status(400).json({ error: 'Invalid departure_date format. Use YYYY-MM-DD.' });
        }
        departureDateObj = new Date(departure_date + 'T00:00:00');
        if (isNaN(departureDateObj.getTime())) {
             return res.status(400).json({ error: 'Invalid departure_date value.' });
        }
        console.log(`Using provided departure date (set to midnight initially): ${departureDateObj.toDateString()}`);
    } else {
        departureDateObj = new Date();
        departureDateObj.setHours(0, 0, 0, 0);
        console.log(`No departure date provided, defaulting to today (set to midnight initially): ${departureDateObj.toDateString()}`);
    }

    if (departure_time) {
        if (!/^\d{2}:\d{2}:\d{2}$/.test(departure_time)) {
             return res.status(400).json({ error: 'Invalid departure_time format. Use HH:MM:SS.' });
        }
        departureTimeSeconds = parseGTFSTime(departure_time);
        if (departureTimeSeconds === null) {
            return res.status(400).json({ error: 'Invalid departure_time value.' });
        }

        if (departureTimeSeconds >= SECONDS_IN_DAY) {
            const daysToAdd = Math.floor(departureTimeSeconds / SECONDS_IN_DAY);
            departureDateObj.setDate(departureDateObj.getDate() + daysToAdd);
            departureTimeSeconds %= SECONDS_IN_DAY;
            console.log(`Departure time > 24h detected. Adjusted date to: ${departureDateObj.toDateString()}`);
        }
        console.log(`Using provided departure time: ${departure_time} (${departureTimeSeconds}s)`);

        departureDateObj.setHours(
            Math.floor(departureTimeSeconds / 3600),
            Math.floor((departureTimeSeconds % 3600) / 60),
            departureTimeSeconds % 60, 0
        );

    } else {
        const now = new Date();
        departureTimeSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        departureDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
        console.log(`No departure time provided, using current time: ${departureTimeSeconds}s on date: ${departureDateObj.toDateString()}`);
    }

    try {
        console.log(`Calling findFastestPath from ${start_station_id} to ${end_station_id} departing around ${departureTimeSeconds}s on ${departureDateObj.toDateString()}`);
        const pathResult = findFastestPath(
            start_station_id,
            end_station_id,
            departureTimeSeconds,
            departureDateObj,    
            metroGraph,
            loadedStops,
            loadedTrips,
            loadedCalendar
        );

        if (pathResult) {
            console.log(`Path found with total time: ${pathResult.totalTimeSeconds}s`);
            return res.status(200).json(pathResult);
        } else {
            console.log(`No path found by A*.`);
            return res.status(404).json({ error: 'No valid route found between the specified stations for the given date and time.' });
        }

    } catch (error) {
        console.error("Error during path calculation execution:", error);
        next(error);
    }
};