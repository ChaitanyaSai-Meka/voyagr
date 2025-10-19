import { supabase } from '../../config/supabaseClient.js';

/* Profile */
export const getMyProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, created_at') 
      .eq('id', userId)
      .single();

    if (error) {
        if (error.code === 'PGRST116') {
             console.error(`Profile not found in DB for authenticated user ID: ${userId}`);
            return res.status(404).json({ error: 'Your profile data could not be found.' });
        }
      console.error('Supabase getMyProfile error:', error);
      return res.status(500).json({ error: error.message || 'Failed to retrieve your profile.' });
    }

     if (!data) {
        return res.status(404).json({ error: 'Your profile data could not be found.' });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Server error getting own profile:', err);
    res.status(500).json({ error: 'Server error getting your profile.' });
  }
};

/* Profile Update */
export const updateMyProfile = async (req, res) => {
  const userId = req.user.id; 
  const { username } = req.body; 

  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: username })
      .eq('id', userId)
      .select('id, username, created_at') 
      .single();

    if (error) {
      if (error.code === '23505') { 
         return res.status(409).json({ error: 'Username is already taken.' });
      }
      console.error('Supabase updateMyProfile error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update profile.' });
    }

     if (!data) {
        return res.status(404).json({ error: 'Profile not found or update failed.' });
    }

    return res.status(200).json({ message: 'Profile updated successfully!', profile: data });

  } catch (err)
 {
    console.error('Server error updating profile:', err);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
};