import { supabase } from '../../config/supabaseClient.js';

export const searchStations = async (req, res) => {
  const { query } = req.query;

  try {
    let dbQuery = supabase
      .from('stations')
      .select('id, name, line_name')
      .limit(10);

    if (query) {
      dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Error searching stations:', error);
      return res.status(500).json({ error: 'Failed to search stations' });
    }

    return res.json(data);
  } catch (err) {
    console.error('Server error searching stations:', err);
    res.status(500).json({ error: 'Server error' });
  }
};