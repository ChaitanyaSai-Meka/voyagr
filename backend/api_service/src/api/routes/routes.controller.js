import { supabase } from '../../config/supabaseClient.js';
import fetch from 'node-fetch';

export const calculateRoute = async (req, res) => {
    const { start_station_id, end_station_id, route_name, departure_time, departure_date } = req.body;

    if (!start_station_id || !end_station_id) {
        return res.status(400).json({ error: 'Start and end station IDs (start_station_id, end_station_id) are required.' });
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                userId = user.id;
            }
        }
    }

    try {
        const routeServiceUrl = process.env.ROUTE_SERVICE_URL ;

        const routeResponse = await fetch(routeServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_station_id: start_station_id,
                end_station_id: end_station_id,
                departure_time: departure_time || null,
                departure_date: departure_date || null
            })
        });

        if (!routeResponse.ok) {
            const errorBody = await routeResponse.text();
            console.error(`Error from route-service (${routeResponse.status}):`, errorBody);
            throw new Error(`Route calculation service failed.`);
        }

        const shortestPathData = await routeResponse.json();

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

        return res.status(200).json(savedRoute);

    } catch (error) {
        console.error("Error during route calculation or saving:", error);
        return res.status(500).json({ error: error.message || 'An internal error occurred.' });
    }
};