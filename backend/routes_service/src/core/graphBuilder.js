
export const buildGraph = (stopsMap, stopTimesMap, defaultTransferTimeSeconds = 300) => {
    console.log("Building graph...");
    const adjacencyList = new Map();

    stopsMap.forEach((stop, stopId) => {
        if (stop.locationType === 0 || stop.locationType === undefined || stop.locationType === null) {
            if (!adjacencyList.has(stopId)) {
                adjacencyList.set(stopId, []);
            }
        }
    });
    console.log(`Initialized graph with ${adjacencyList.size} platform nodes.`);

    const platformsByParent = new Map();
    stopsMap.forEach((stop, stopId) => {
        if ((stop.locationType === 0 || stop.locationType === undefined || stop.locationType === null) && stop.parentStation) {
            if (!platformsByParent.has(stop.parentStation)) {
                platformsByParent.set(stop.parentStation, []);
            }
            platformsByParent.get(stop.parentStation).push(stopId);
        }
    });

    console.log(`Found ${platformsByParent.size} stations with multiple platforms for potential transfers.`);

    let transferEdgeCount = 0;
    platformsByParent.forEach((platforms) => {
        if (platforms.length > 1) {
            for (let i = 0; i < platforms.length; i++) {
                for (let j = i + 1; j < platforms.length; j++) {
                    const platformA = platforms[i];
                    const platformB = platforms[j];

                    if (adjacencyList.has(platformA) && adjacencyList.has(platformB)) {
                        adjacencyList.get(platformA).push({
                            type: 'transfer',
                            destinationStopId: platformB,
                            walkDurationSeconds: defaultTransferTimeSeconds
                        });
                        adjacencyList.get(platformB).push({
                            type: 'transfer',
                            destinationStopId: platformA,
                            walkDurationSeconds: defaultTransferTimeSeconds
                        });
                        transferEdgeCount += 2;
                    }
                }
            }
        }
    });
    console.log(`Added ${transferEdgeCount} transfer edges.`);

    let travelEdgeCount = 0;
    stopTimesMap.forEach((stopTimes, tripId) => {

        for (let i = 0; i < stopTimes.length - 1; i++) {
            const currentStopTime = stopTimes[i];
            const nextStopTime = stopTimes[i + 1];

            const originStopId = currentStopTime.stopId;
            const destinationStopId = nextStopTime.stopId;


            if (adjacencyList.has(originStopId) && adjacencyList.has(destinationStopId)) {
                const travelDurationSeconds = calculateTravelDuration(nextStopTime.arrivalTime, currentStopTime.departureTime);

                if (travelDurationSeconds !== null) {
                    adjacencyList.get(originStopId).push({
                        type: 'travel',
                        destinationStopId: destinationStopId,
                        tripId: tripId,
                        departureTime: currentStopTime.departureTime,
                        arrivalTime: nextStopTime.arrivalTime,     
                        travelDurationSeconds: travelDurationSeconds
                    });
                    travelEdgeCount++;
                } else {
                    console.warn(`Could not calculate travel duration for trip ${tripId}, seq ${currentStopTime.stopSequence} -> ${nextStopTime.stopSequence}. Skipping edge.`);
                }
            } else {
            
            }
        }
    });
    console.log(`Added ${travelEdgeCount} travel edges.`);


    console.log("Graph build complete.");
    return adjacencyList;
};

export const parseGTFSTime = (timeString) => {
    if (!timeString) return null;
    try {
        const parts = timeString.split(':');
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
        return hours * 3600 + minutes * 60 + seconds;
    } catch (e) {
        console.error(`Error parsing GTFS time string: ${timeString}`, e);
        return null
    }
};

export const calculateTravelDuration = (arrivalTimeStr, departureTimeStr) => {
    const arrivalSeconds = parseGTFSTime(arrivalTimeStr);
    const departureSeconds = parseGTFSTime(departureTimeStr);

    if (arrivalSeconds === null || departureSeconds === null || arrivalSeconds < departureSeconds) {
         if (arrivalSeconds !== null && departureSeconds !== null && arrivalSeconds < departureSeconds) {
             console.warn(`Arrival time ${arrivalTimeStr} is before departure time ${departureTimeStr}. Using 0 duration.`);
             return 0;
         }
        return null;
    }
    return arrivalSeconds - departureSeconds;
};