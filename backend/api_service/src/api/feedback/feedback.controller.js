import { supabase } from '../../config/supabaseClient.js';

export const createFeedback = async (req, res) => {
  const { feedback } = req.body;

  // --- Basic Validation ---
  if (!feedback || feedback.trim() === '') {
    return res.status(400).json({ error: 'Feedback message cannot be empty.' });
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
      }
    }
  }

  try {
    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId, 
        feedback: feedback.trim() 
      });

    if (error) {
      console.error('Supabase createFeedback error:', error);
      return res.status(500).json({ error: 'Failed to submit feedback.' });
    }

    return res.status(201).json({ message: 'Feedback submitted successfully!' }); 

  } catch (err) {
    console.error('Server error submitting feedback:', err);
    res.status(500).json({ error: 'Server error submitting feedback.' });
  }
};