import { supabase } from '../config/supabaseClient.js';


export const checkAuth = async (req, res, next) => {

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing.' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Malformed Authorization header. Format is "Bearer <token>".' });
  }

  const token = tokenParts[1];
  if (!token) {
    return res.status(401).json({ error: 'Token missing from Authorization header.' });
  }

  try {

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.warn('Supabase token verification error:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    if (!user) {
      console.warn('Token valid but no user found.');
      return res.status(401).json({ error: 'Unauthorized: User not found for this token.' });
    }
    req.user = user;
    next();

  } catch (err) {
    console.error('Server error during authentication middleware:', err);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
};