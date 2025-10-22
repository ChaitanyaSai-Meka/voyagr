import { PriorityQueue } from './priorityQueue.js';
import { parseGTFSTime } from './graphBuilder.js';
import { loadedStops, loadedTrips, loadedCalendar, metroGraph, loadedRoutes } from '../server.js';

const formatSecondsToHHMMSS = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) {
        return null;
    }
    const seconds = Math.floor(totalSeconds % 60);
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const hours = Math.floor(totalSeconds / 3600);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const findFastestPathDijkstra = (
    startStopId,
    endStopId,
    departureTimeSeconds,
    departureDate
) => {
    console.log(`Starting Dijkstra from ${startStopId} to ${endStopId} at ${departureTimeSeconds}s on ${departureDate.toDateString()}`);

    const minQueue = new PriorityQueue();
    const earliestArrival = new Map();
    const cameFrom = new Map();

    metroGraph.forEach((_, stopId) => {
        earliestArrival.set(stopId, Infinity);
    });

    const getStateKey = (stopId, arrivalTimeSeconds) => `${stopId}_${arrivalTimeSeconds}`;

    const isServiceActive = (serviceId, date) => {
        const calendarEntry = loadedCalendar.get(serviceId);
        if (!calendarEntry) {
            console.warn(`Service ID ${serviceId} not found in calendar.txt.`);
            return false;
        }

        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        const dateString = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

        if (
            dateString >= calendarEntry.startDate &&
            dateString <= calendarEntry.endDate &&
            calendarEntry[dayOfWeek]
        ) {
            // TODO: Add logic here to check calendar_dates.txt for exceptions
            return true;
        }
        return false;
    };

    earliestArrival.set(startStopId, departureTimeSeconds);
    const startState = {
        stopId: startStopId,
        arrivalTimeSeconds: departureTimeSeconds
    };
    minQueue.enqueue(startState, departureTimeSeconds);

    let iterationCount = 0;
    const MAX_ITERATIONS = 1000000;

    while (!minQueue.isEmpty()) {
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
             console.error("Dijkstra exceeded maximum iterations. Aborting.");
             return null;
        }

        const currentState = minQueue.dequeue();
        const currentStateKey = getStateKey(currentState.stopId, currentState.arrivalTimeSeconds);

        if (currentState.arrivalTimeSeconds > (earliestArrival.get(currentState.stopId) ?? Infinity)) {
            continue;
        }

        if (currentState.stopId === endStopId) {
            console.log(`Goal reached at ${endStopId} arriving at ${currentState.arrivalTimeSeconds}s after ${iterationCount} iterations.`);
            return reconstructPath(cameFrom, currentStateKey, startState);
        }

        const edges = metroGraph.get(currentState.stopId) || [];

        edges.forEach(edge => {
            let nextArrivalTimeSeconds = -1;
            let isValidEdge = false;
            let currentTripInfo = null;

            if (edge.type === 'transfer') {
                nextArrivalTimeSeconds = currentState.arrivalTimeSeconds + edge.walkDurationSeconds;
                isValidEdge = true;

            } else if (edge.type === 'travel') {
                const tripInfo = loadedTrips.get(edge.tripId);
                if (!tripInfo) {
                     return;
                }
                currentTripInfo = tripInfo;

                if (!isServiceActive(tripInfo.serviceId, departureDate)) {
                    return;
                }

                const trainDepartureTimeSeconds = parseGTFSTime(edge.departureTime);
                const trainArrivalTimeSeconds = parseGTFSTime(edge.arrivalTime);

                if (trainDepartureTimeSeconds !== null && trainArrivalTimeSeconds !== null && currentState.arrivalTimeSeconds <= trainDepartureTimeSeconds) {
                    nextArrivalTimeSeconds = trainArrivalTimeSeconds;
                    isValidEdge = true;
                }
            }

            if (isValidEdge) {
                const nextStopId = edge.destinationStopId;

                if (nextArrivalTimeSeconds < (earliestArrival.get(nextStopId) ?? Infinity)) {
                    earliestArrival.set(nextStopId, nextArrivalTimeSeconds);

                    const nextStateKey = getStateKey(nextStopId, nextArrivalTimeSeconds);
                    const departureTimeFromPrevious = edge.type === 'travel' ? parseGTFSTime(edge.departureTime) : null;
                    const waitTime = (edge.type === 'travel' && departureTimeFromPrevious !== null)
                                        ? departureTimeFromPrevious - currentState.arrivalTimeSeconds
                                        : null;

                    cameFrom.set(nextStateKey, {
                        previousStateKey: currentStateKey,
                        edgeTaken: edge,
                        arrivalTimeAtCurrent: nextArrivalTimeSeconds,
                        stopId: nextStopId,
                        departureTimeFromPrevious: departureTimeFromPrevious,
                        arrivalTimeAtPrevious: currentState.arrivalTimeSeconds,
                        waitDuration: waitTime,
                        travelDuration: edge.type === 'travel' ? edge.travelDurationSeconds : null,
                        walkDuration: edge.type === 'transfer' ? edge.walkDurationSeconds : null,
                        tripId: edge.tripId || null
                    });

                    const nextState = {
                        stopId: nextStopId,
                        arrivalTimeSeconds: nextArrivalTimeSeconds
                    };
                    minQueue.enqueue(nextState, nextArrivalTimeSeconds);
                }
            }
        });
    }

    console.log("No path found after exhausting queue.");
    return null;
};


const reconstructPath = (cameFrom, finalStateKey, startState) => {
    const detailedSteps = [];
    let currentKey = finalStateKey;
    let pathInfo = cameFrom.get(currentKey);
    let finalArrivalTimeSeconds = parseInt(finalStateKey.split('_')[1], 10);

    while (pathInfo) {
        const currentStopInfo = loadedStops.get(pathInfo.stopId);
        let routeInfo = null;
        let tripInfo = null;

        if (pathInfo.tripId && loadedTrips.has(pathInfo.tripId)) {
            tripInfo = loadedTrips.get(pathInfo.tripId);
            if (tripInfo && loadedRoutes.has(tripInfo.routeId)) {
                routeInfo = loadedRoutes.get(tripInfo.routeId);
            }
        }

        detailedSteps.push({
            stopId: pathInfo.stopId,
            stopName: currentStopInfo?.name || 'Unknown Stop',
            edgeType: pathInfo.edgeTaken.type,
            arrivalTime: formatSecondsToHHMMSS(pathInfo.arrivalTimeAtCurrent),
            departureTime: formatSecondsToHHMMSS(pathInfo.departureTimeFromPrevious),
            tripId: pathInfo.tripId,
            routeShortName: routeInfo?.shortName || null,
            routeColor: routeInfo?.color || null,
            walkDurationSeconds: pathInfo.walkDuration,
            travelDurationSeconds: pathInfo.travelDuration,
            waitDurationSeconds: pathInfo.waitDuration
        });
        currentKey = pathInfo.previousStateKey;
        pathInfo = cameFrom.get(currentKey);
    }

    detailedSteps.reverse();

    const startStopInfo = loadedStops.get(startState.stopId);
    const departureTimeSeconds = startState.arrivalTimeSeconds;

     detailedSteps.unshift({
         stopId: startState.stopId,
         stopName: startStopInfo?.name || 'Unknown Start',
         edgeType: 'start',
         arrivalTime: null,
         departureTime: formatSecondsToHHMMSS(departureTimeSeconds),
         tripId: null,
         routeShortName: null,
         routeColor: null,
         walkDurationSeconds: null,
         travelDurationSeconds: null,
         waitDurationSeconds: null
     });

    const totalTimeSeconds = finalArrivalTimeSeconds - departureTimeSeconds;

    return {
        totalTimeSeconds: totalTimeSeconds,
        departureTime: formatSecondsToHHMMSS(departureTimeSeconds),
        arrivalTime: formatSecondsToHHMMSS(finalArrivalTimeSeconds),
        steps: detailedSteps
    };
};