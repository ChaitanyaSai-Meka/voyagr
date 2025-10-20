import { supabase } from '../../config/supabaseClient.js';
import fetch from 'node-fetch'; 

export const calculateRoute = async (req, res) => {
    const { start_station_id, end_station_id, route_name, departure_time } = req.body;

    // --- Validation ---
    if (!start_station_id || !end_station_id) {
        return res.status(400).json({ error: 'Start and end station IDs (start_station_id, end_station_id) are required.' });
    }
    // --- End Validation ---

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                userId = user.id;
                console.log(`Route calculation requested by user: ${userId}`);
            } else {
                console.log("Route calculation requested by anonymous user (invalid token found).");
            }
        }
    } else {
        console.log("Route calculation requested by anonymous user (no token found).");
    }

    try {
        const routeServiceUrl = process.env.ROUTE_SERVICE_URL || 'http://localhost:3002/calculate';
        console.log(`Calling route-service at ${routeServiceUrl} with:`, { start_station_id, end_station_id, departure_time });

        const routeResponse = await fetch(routeServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_station_id, end_station_id, departure_time: departure_time || null })
        });

        if (!routeResponse.ok) {
            const errorBody = await routeResponse.text();
            console.error(`Error from route-service (${routeResponse.status}):`, errorBody);
            throw new Error(`Route calculation service failed.`); 
        }

        const shortestPathData = await routeResponse.json();
        console.log("Received shortest path data:", shortestPathData);


        // --- Saving ---
        const { data: savedRoute, error: insertError } = await supabase
            .from('routes')
            .insert({
                user_id: userId, 
                start_station_id: start_station_id,
                end_station_id: end_station_id,
                shortest_path: shortestPathData,
                route_name: route_name || null
            })
            .select() 
            .single();

        if (insertError) {
            console.error("Error saving calculated route to DB:", insertError);
            throw new Error('Failed to record the calculated route.'); 
        }

        console.log("Route calculated and saved with ID:", savedRoute.id);
        return res.status(200).json(savedRoute);

    } catch (error) {
        console.error("Error during route calculation or saving:", error);
        return res.status(500).json({ error: error.message || 'An internal error occurred.' });
    }
};
