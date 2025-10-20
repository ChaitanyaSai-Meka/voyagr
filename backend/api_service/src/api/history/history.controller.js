import { supabase } from '../../config/supabaseClient.js';

export const getMyHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('history')
      .select(`
        viewed_at,
        route:routes (
          id,
          route_name,
          created_at,
          start_station:stations!start_station_id (name, line_name),
          end_station:stations!end_station_id (name, line_name)
        )
      `)
      .eq('user_id', userId) 
      .order('viewed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase getMyHistory error:', error);
      return res.status(500).json({ error: 'Failed to retrieve view history.' });
    }


    return res.status(200).json(data || []);

  } catch (err) {
    console.error('Server error getting history:', err);
    res.status(500).json({ error: 'Server error retrieving history.' });
  }
};


export const addRouteToHistory = async (req, res) => {
  const userId = req.user.id; 
  const { route_id } = req.body; 

  // --- Basic Validation ---
  if (!route_id) {
    return res.status(400).json({ error: 'route_id is required in the request body.' });
  }
  // --- End Validation ---

  try {
    const { data, error } = await supabase
      .from('history')
      .insert({
        user_id: userId,
        route_id: route_id
      })
      .select('id')
      .single();

    if (error) {
       if (error.code === '23503') {
         return res.status(404).json({ error: 'Route not found. Cannot add non-existent route to history.'});
      }
      console.error('Supabase addRouteToHistory error:', error);
      return res.status(500).json({ error: 'Failed to add route to history.' });
    }

    return res.status(201).json({ message: 'Route added to history successfully.' }); 

  } catch (err) {
    console.error('Server error adding to history:', err);
    res.status(500).json({ error: 'Server error adding to history.' });
  }
};


export const clearMyHistory = async (req, res) => {
    const userId = req.user.id;

    try {
        const { error, count } = await supabase
            .from('history')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Supabase clearMyHistory error:', error);
            return res.status(500).json({ error: 'Failed to clear history.' });
        }

        console.log(`Cleared ${count} history entries for user ${userId}`);
        return res.status(200).json({ message: `Successfully cleared ${count} history entries.` });

    } catch (err) {
        console.error('Server error clearing history:', err);
        res.status(500).json({ error: 'Server error clearing history.' });
    }
};