import { supabase } from '../../config/supabaseClient.js';


export const getMySavedRoutes = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('saved_routes')
      .select(`
        saved_at,
        route:routes (
          id,
          route_name,
          created_at,
          start_station:stations!start_station_id (name, line_name),
          end_station:stations!end_station_id (name, line_name),
          shortest_path
        )
      `)
      .eq('user_id', userId) 
      .order('saved_at', { ascending: false }); 

    if (error) {
      console.error('Supabase getMySavedRoutes error:', error);
      return res.status(500).json({ error: 'Failed to retrieve saved routes.' });
    }

    return res.status(200).json(data || []); 

  } catch (err) {
    console.error('Server error getting saved routes:', err);
    res.status(500).json({ error: 'Server error retrieving saved routes.' });
  }
};


export const saveRoute = async (req, res) => {
  const userId = req.user.id; 
  const { route_id } = req.body; 

  // --- Basic Validation ---
  if (!route_id) {
    return res.status(400).json({ error: 'route_id is required in the request body.' });
  }
  // --- End Validation ---

  try {
    const { data, error } = await supabase
      .from('saved_routes')
      .insert({
        user_id: userId,
        route_id: route_id
      })
      .select() 
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Route already saved.' });
      }
      if (error.code === '23503') {
         return res.status(404).json({ error: 'Route not found. Cannot save a non-existent route.'}); 
      }
      console.error('Supabase saveRoute error:', error);
      return res.status(500).json({ error: 'Failed to save route.' });
    }

     if (!data) {
        return res.status(500).json({ error: 'Failed to save route for an unknown reason.' });
    }

    return res.status(201).json({ message: 'Route saved successfully!', saved_record: data }); 

  } catch (err) {
    console.error('Server error saving route:', err);
    res.status(500).json({ error: 'Server error saving route.' });
  }
};


export const unsaveRoute = async (req, res) => {
  const userId = req.user.id; 
  const { route_id } = req.params; 

   // --- Basic Validation ---
  if (!route_id) {
    return res.status(400).json({ error: 'route_id parameter is required in the URL.' });
  }
  // --- End Validation ---

  try {
    const { error, count } = await supabase
      .from('saved_routes')
      .delete()
      .eq('user_id', userId)
      .eq('route_id', route_id);

    if (error) {
      console.error('Supabase unsaveRoute error:', error);
      return res.status(500).json({ error: 'Failed to unsave route.' });
    }

    if (count === 0) {
        return res.status(404).json({ error: 'Saved route not found or you do not have permission to unsave it.' });
    }

    return res.status(200).json({ message: 'Route unsaved successfully.' }); 

  } catch (err) {
    console.error('Server error unsaving route:', err);
    res.status(500).json({ error: 'Server error unsaving route.' });
  }
};