import { PriorityQueue } from './priorityQueue.js';
import { parseGTFSTime } from './graphBuilder.js';
import { calculateHaversineDistance } from './heuristic.js'; 

const MAX_METRO_SPEED_MPS = 11
const SECONDS_IN_DAY = 24 * 60 * 60;

export const findFastestPath = (
    startStopId,
    endStopId,
    departureTimeSeconds,
    departureDate,
    graph,
    stopsMap,
    tripsMap,
    calendarMap
) => {
    console.log(`Starting A* from ${startStopId} to ${endStopId} at ${departureTimeSeconds}s on ${departureDate.toDateString()}`);

    const openSet = new PriorityQueue(); 
    const cameFrom = new Map(); 
    const gCostMap = new Map(); 
    const calculateHCost = (currentStopId) => {
        const startStop = stopsMap.get(currentStopId);
        const endStop = stopsMap.get(endStopId);
        if (!startStop || !endStop) return Infinity;
        const distance = calculateHaversineDistance(
            startStop.lat, startStop.lon,
            endStop.lat, endStop.lon
        );
        return Math.floor(distance / MAX_METRO_SPEED_MPS);
    };

    const getStateKey = (stopId, arrivalTimeSeconds) => `${stopId}_${arrivalTimeSeconds}`;
    const isServiceActive = (serviceId, date) => {
        const calendarEntry = calendarMap.get(serviceId);
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
            return true;
        }
        return false;
    };

    const initialHCost = calculateHCost(startStopId);
    const startState = {
        stopId: startStopId,
        arrivalTimeSeconds: departureTimeSeconds, 
        gCost: 0,
        // previousNodeKey: null, 
        edgeTaken: null
    };
    const startStateKey = getStateKey(startStopId, departureTimeSeconds);

    gCostMap.set(startStateKey, 0);
    openSet.enqueue(startState, initialHCost); 

    let iterationCount = 0; 

    //  main A* loop 
    while (!openSet.isEmpty()) {
        iterationCount++;
        if (iterationCount > 500000) { 
             console.error("A* exceeded maximum iterations. Aborting.");
             return null;
        }

        const currentState = openSet.dequeue();
        const currentStateKey = getStateKey(currentState.stopId, currentState.arrivalTimeSeconds);

        if (currentState.stopId === endStopId) {
            console.log(`Goal reached at ${endStopId} at ${currentState.arrivalTimeSeconds}s after ${iterationCount} iterations.`);
            return reconstructPath(cameFrom, currentState, startStateKey);
        }
        const edges = graph.get(currentState.stopId) || [];

        edges.forEach(edge => {
            let nextArrivalTimeSeconds = -1;
            let tentativeGCost = Infinity;
            let isValidEdge = false; 

            if (edge.type === 'transfer') {
                const walkDuration = edge.walkDurationSeconds;
                nextArrivalTimeSeconds = currentState.arrivalTimeSeconds + walkDuration;
                tentativeGCost = currentState.gCost + walkDuration;
                isValidEdge = true; 
            } else if (edge.type === 'travel') {
                const tripInfo = tripsMap.get(edge.tripId);
                if (!tripInfo) {
                    return;
                }

                if (!isServiceActive(tripInfo.serviceId, departureDate)) {
                    return; 
                }

                const trainDepartureTimeSeconds = parseGTFSTime(edge.departureTime);
                const trainArrivalTimeSeconds = parseGTFSTime(edge.arrivalTime);

                if (trainDepartureTimeSeconds !== null && trainArrivalTimeSeconds !== null && currentState.arrivalTimeSeconds <= trainDepartureTimeSeconds) {
                    const waitTime = trainDepartureTimeSeconds - currentState.arrivalTimeSeconds;
                    tentativeGCost = currentState.gCost + waitTime + edge.travelDurationSeconds;
                    nextArrivalTimeSeconds = trainArrivalTimeSeconds;
                    isValidEdge = true;
                }
            }

        
            if (isValidEdge) {
                const nextStopId = edge.destinationStopId;
                const nextStateKey = getStateKey(nextStopId, nextArrivalTimeSeconds);
                const costSoFar = gCostMap.get(nextStateKey) ?? Infinity;

                if (tentativeGCost < costSoFar) { 
                    gCostMap.set(nextStateKey, tentativeGCost);
                    cameFrom.set(nextStateKey, {
                        previousStateKey: currentStateKey,
                        edgeTaken: edge,
                        arrivalTimeAtPrevious: currentState.arrivalTimeSeconds,
                        departureTimeFromPrevious: edge.type === 'travel' ? parseGTFSTime(edge.departureTime) : null,
                        arrivalTimeAtCurrent: nextArrivalTimeSeconds,
                        stopId: nextStopId
                    });

                    const hCost = calculateHCost(nextStopId);
                    const fCost = tentativeGCost + hCost;
                    const nextState = {
                        stopId: nextStopId,
                        arrivalTimeSeconds: nextArrivalTimeSeconds,
                        gCost: tentativeGCost,
                        // previousNodeKey: currentStateKey,
                        edgeTaken: edge
                    };

                    openSet.enqueue(nextState, fCost);
                }
            }
        });
    }

    console.log("No path found after exhausting openSet.");
    return null;
};

const reconstructPath = (cameFrom, finalState, startStateKey) => {
    const steps = [];
    let currentKey = getStateKey(finalState.stopId, finalState.arrivalTimeSeconds);
    let pathInfo = cameFrom.get(currentKey);


    while (pathInfo) {
        steps.push({
            stopId: pathInfo.stopId,
            edgeType: pathInfo.edgeTaken.type,
            arrivalTime: pathInfo.arrivalTimeAtCurrent,
            departureTime: pathInfo.departureTimeFromPrevious,
            tripId: pathInfo.edgeTaken.tripId || null,
            walkDuration: pathInfo.edgeTaken.type === 'transfer' ? pathInfo.edgeTaken.walkDurationSeconds : null,
            travelDuration: pathInfo.edgeTaken.type === 'travel' ? pathInfo.edgeTaken.travelDurationSeconds : null,
            waitDuration: (pathInfo.edgeTaken.type === 'travel' && pathInfo.departureTimeFromPrevious !== null)
                            ? pathInfo.departureTimeFromPrevious - pathInfo.arrivalTimeAtPrevious
                            : null
        });
        currentKey = pathInfo.previousStateKey;
        pathInfo = cameFrom.get(currentKey);
    }

    steps.reverse();
    const startTimeSeconds = parseGTFSTime(cameFrom.get(steps[0]?.previousStateKey)?.arrivalTimeAtCurrent) ?? parseGTFSTime(startStateKey.split('_')[1]); // Find actual start time
    const totalTimeSeconds = finalState.arrivalTimeSeconds - startTimeSeconds;


    return {
        totalTimeSeconds: totalTimeSeconds,
        departureTimeSeconds: startTimeSeconds,
        arrivalTimeSeconds: finalState.arrivalTimeSeconds,
        steps: steps
    };
};