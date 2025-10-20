import fs from 'fs'; 
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const dataDir = path.join(__dirname, '..', '..', 'data'); 

export const loadStops = () => {
  return new Promise((resolve, reject) => {
    const stops = new Map();
    const filePath = path.join(dataDir, 'stops.txt');

    console.log(`Attempting to load stops from: ${filePath}`);

    fs.createReadStream(filePath)
      .on('error', (error) => {
        console.error(`Error reading stops.txt: ${error.message}`);
        reject(`Failed to read stops.txt. Make sure it exists in the 'data' directory. Error: ${error.message}`);
      })
      .pipe(csv()) 
      .on('data', (row) => {
        if (row.stop_id) {
          stops.set(row.stop_id, {
              id: row.stop_id,
              name: row.stop_name,
              lat: parseFloat(row.stop_lat),
              lon: parseFloat(row.stop_lon), 
              locationType: parseInt(row.location_type, 10),
              parentStation: row.parent_station || null 
          });
        } else {
            console.warn("Skipping row in stops.txt due to missing stop_id:", row);
        }
      })
      .on('end', () => {
        if (stops.size === 0) {
            console.error('No stops were loaded. Is stops.txt empty or incorrectly formatted?');
            reject('No stops loaded from stops.txt. Check the file format and content.');
        } else {
            console.log(`Successfully loaded ${stops.size} stops.`);
            resolve(stops); 
        }
      })
      .on('error', (error) => {
        console.error(`Error parsing stops.txt: ${error.message}`);
        reject(`Failed to parse stops.txt. Check CSV format. Error: ${error.message}`);
      });
  });
};


export const loadRoutes = () => {
    return new Promise((resolve, reject) => {
        const routes = new Map();
        const filePath = path.join(dataDir, 'routes.txt');

        console.log(`Attempting to load routes from: ${filePath}`);

        fs.createReadStream(filePath)
          .on('error', (error) => {
            console.error(`Error reading routes.txt: ${error.message}`);
            reject(`Failed to read routes.txt. Make sure it exists. Error: ${error.message}`);
          })
          .pipe(csv())
          .on('data', (row) => {
            if (row.route_id) {
                routes.set(row.route_id, {
                    id: row.route_id,
                    shortName: row.route_short_name,
                    longName: row.route_long_name,
                    color: row.route_color ? `#${row.route_color}` : null, 
                    textColor: row.route_text_color ? `#${row.route_text_color}` : null
                });
            } else {
                 console.warn("Skipping row in routes.txt due to missing route_id:", row);
            }
          })
          .on('end', () => {
            if (routes.size === 0) {
                console.error('No routes were loaded. Is routes.txt empty or incorrectly formatted?');
                reject('No routes loaded from routes.txt. Check the file.');
            } else {
                console.log(`Successfully loaded ${routes.size} routes.`);
                resolve(routes); 
            }
          })
          .on('error', (error) => {
             console.error(`Error parsing routes.txt: ${error.message}`);
             reject(`Failed to parse routes.txt. Check CSV format. Error: ${error.message}`);
          });
    });
};

export const loadTrips = () => {
    return new Promise((resolve, reject) => {
        const trips = new Map();
        const filePath = path.join(dataDir, 'trips.txt');

        console.log(`Attempting to load trips from: ${filePath}`);

        fs.createReadStream(filePath)
          .on('error', (error) => {
            console.error(`Error reading trips.txt: ${error.message}`);
            reject(`Failed to read trips.txt. Make sure it exists. Error: ${error.message}`);
          })
          .pipe(csv())
          .on('data', (row) => {
            if (row.trip_id) {
                trips.set(row.trip_id, {
                    id: row.trip_id,
                    routeId: row.route_id,
                    serviceId: row.service_id,
                    shapeId: row.shape_id || null, 
                    directionId: row.direction_id ? parseInt(row.direction_id, 10) : null,
                    headsign: row.trip_headsign || null
                });
            } else {
                 console.warn("Skipping row in trips.txt due to missing trip_id:", row);
            }
          })
          .on('end', () => {
            if (trips.size === 0) {
                 console.error('No trips were loaded. Is trips.txt empty or incorrectly formatted?');
                 reject('No trips loaded from trips.txt. Check the file.');
            } else {
                console.log(`Successfully loaded ${trips.size} trips.`);
                resolve(trips); 
            }
          })
          .on('error', (error) => {
            console.error(`Error parsing trips.txt: ${error.message}`);
            reject(`Failed to parse trips.txt. Check CSV format. Error: ${error.message}`);
          });
    });
};

export const loadStopTimes = () => {
    return new Promise((resolve, reject) => {
        const stopTimesByTrip = {};
        const filePath = path.join(dataDir, 'stop_times.txt');
        let rowCount = 0;

        console.log(`Attempting to load stop_times from: ${filePath}`);

        fs.createReadStream(filePath)
          .on('error', (error) => {
            console.error(`Error reading stop_times.txt: ${error.message}`);
            reject(`Failed to read stop_times.txt. Error: ${error.message}`);
          })
          .pipe(csv())
          .on('data', (row) => {
            rowCount++;
            if (row.trip_id && row.stop_id && row.stop_sequence !== undefined) {
                const tripId = row.trip_id;
                const stopTime = {
                    stopId: row.stop_id,
                    arrivalTime: row.arrival_time,
                    departureTime: row.departure_time,
                    stopSequence: parseInt(row.stop_sequence, 10),
                };

                if (!stopTimesByTrip[tripId]) {
                    stopTimesByTrip[tripId] = [];
                }
                stopTimesByTrip[tripId].push(stopTime);

            } else {
                console.warn(`Skipping row in stop_times.txt due to missing required fields (trip_id, stop_id, stop_sequence):`, row);
            }
          })
          .on('end', () => {
            console.log(`Read ${rowCount} rows from stop_times.txt.`);
            if (Object.keys(stopTimesByTrip).length === 0 && rowCount > 0) {
                 console.error('stop_times.txt was read, but no valid trip data found. Check file format/content.');
                 reject('No valid stop times loaded. Check stop_times.txt format.');
                 return;
            }
            if (Object.keys(stopTimesByTrip).length === 0 && rowCount === 0) {
                console.error('stop_times.txt appears to be empty.');
                reject('No stop times loaded because stop_times.txt is empty.');
                return;
            }

            const finalStopTimes = new Map();
            let processedTripCount = 0;
            for (const tripId in stopTimesByTrip) {
                const sortedStopTimes = stopTimesByTrip[tripId].sort((a, b) => a.stopSequence - b.stopSequence);
                finalStopTimes.set(tripId, sortedStopTimes);
                processedTripCount++;
            }

            console.log(`Successfully processed stop times for ${processedTripCount} trips.`);
            resolve(finalStopTimes); 
          })
          .on('error', (error) => {
            console.error(`Error parsing stop_times.txt: ${error.message}`);
            reject(`Failed to parse stop_times.txt. Error: ${error.message}`);
          });
    });
};

export const loadCalendar = () => {
    return new Promise((resolve, reject) => {
        const calendar = new Map();
        const filePath = path.join(dataDir, 'calendar.txt');

        if (!fs.existsSync(filePath)) {
            console.warn('calendar.txt not found. Assuming service dates are defined in calendar_dates.txt (if present).');
            resolve(calendar);
            return;
        }

        console.log(`Attempting to load calendar from: ${filePath}`);

        fs.createReadStream(filePath)
          .on('error', (error) => {
            console.error(`Error reading calendar.txt: ${error.message}`);
             reject(`Failed to read calendar.txt. Error: ${error.message}`);
          })
          .pipe(csv())
          .on('data', (row) => {
            if (row.service_id) {
                calendar.set(row.service_id, {
                    serviceId: row.service_id,
                    monday: !!parseInt(row.monday, 10),
                    tuesday: !!parseInt(row.tuesday, 10),
                    wednesday: !!parseInt(row.wednesday, 10),
                    thursday: !!parseInt(row.thursday, 10),
                    friday: !!parseInt(row.friday, 10),
                    saturday: !!parseInt(row.saturday, 10),
                    sunday: !!parseInt(row.sunday, 10),
                    startDate: row.start_date,
                    endDate: row.end_date,
                });
            } else {
                 console.warn("Skipping row in calendar.txt due to missing service_id:", row);
            }
          })
          .on('end', () => {
            console.log(`Successfully loaded ${calendar.size} service schedules from calendar.txt.`);
            resolve(calendar);
          })
          .on('error', (error) => {
             console.error(`Error parsing calendar.txt: ${error.message}`);
             reject(`Failed to parse calendar.txt. Error: ${error.message}`);
          });
    });
};

export const loadShapes = () => {
    return new Promise((resolve, reject) => {
        const shapesById = {};
        const filePath = path.join(dataDir, 'shapes.txt');
        let rowCount = 0;

        console.log(`Attempting to load shapes from: ${filePath}`);

        fs.createReadStream(filePath)
          .on('error', (error) => {
            console.error(`Error reading shapes.txt: ${error.message}`);
            reject(`Failed to read shapes.txt. Error: ${error.message}`);
          })
          .pipe(csv())
          .on('data', (row) => {
            rowCount++;
            if (row.shape_id && row.shape_pt_lat && row.shape_pt_lon && row.shape_pt_sequence !== undefined) {
                const shapeId = row.shape_id;
                const point = {
                    lat: parseFloat(row.shape_pt_lat),
                    lon: parseFloat(row.shape_pt_lon),
                    sequence: parseInt(row.shape_pt_sequence, 10)
                };


                if (!shapesById[shapeId]) {
                    shapesById[shapeId] = [];
                }
                shapesById[shapeId].push(point);

            } else {
                console.warn(`Skipping row in shapes.txt due to missing required fields:`, row);
            }
          })
          .on('end', () => {
             console.log(`Read ${rowCount} rows from shapes.txt.`);
             if (Object.keys(shapesById).length === 0 && rowCount > 0) {
                 console.error('shapes.txt was read, but no valid shape data found.');
                 reject('No valid shapes loaded. Check shapes.txt format.');
                 return;
             }
             if (Object.keys(shapesById).length === 0 && rowCount === 0) {
                console.warn('shapes.txt appears to be empty or missing. Visualization will not show route lines.');
                resolve(new Map()); 
                return;
            }


            const finalShapes = new Map();
            let processedShapeCount = 0;
            for (const shapeId in shapesById) {
                const sortedPoints = shapesById[shapeId]
                    .sort((a, b) => a.sequence - b.sequence)
                    .map(p => ({ lat: p.lat, lon: p.lon }));
                finalShapes.set(shapeId, sortedPoints);
                processedShapeCount++;
            }

            console.log(`Successfully processed ${processedShapeCount} shapes.`);
            resolve(finalShapes); 
          })
          .on('error', (error) => {
             console.error(`Error parsing shapes.txt: ${error.message}`);
             reject(`Failed to parse shapes.txt. Error: ${error.message}`);
          });
    });
}
