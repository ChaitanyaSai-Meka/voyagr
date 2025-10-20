import {supabase} from '../../config/supabaseClient.js';

/* Signup */

export const signUp = async (req, res) => {
  const { email, password, username } = req.body;
  /* Validation */
  if(!email || !password|| !username) {
    return res.status(400).json({ error: 'Email, password, and username are required' });
  }
  if(password.length < 6){
    return res.status(400).json({error:"password length should be more than 6 characters"})
  }
  /* Validation - End*/

  try{
    const {data,error}=await supabase.auth.signUp({
        email:email,
        password:password,
        options:{
            data:{
                username:username
            }
        }
    });
    if(error){
        if(error.message && error.message.includes===("user already registered")){
            return res.status(409).json({error:"User already exists with this email."})
        }
        console.error('Supabase signup error:', error.message);
        return res.status(500).json({ error: error.message || 'Failed to sign up user.' });
    }
    if(data.user && !data.session){
        return res.status(200).json({
            message:"Signup is successful. Please verify your email for the verification OTP.",
            userId: data.user.id
        });
    }
    if (data.user && data.session) {
      return res.status(200).json({
        message: 'Signup successful and user logged in!',
        user: data.user,
        session: data.session
      });
    }
    console.error('Unexpected Supabase signup response:', data);
    return res.status(500).json({ error: 'An unexpected error occurred during signup.' });

  }catch(err){
    console.error('Server error during signup:', err);
    res.status(500).json({ error: 'Server error during signup.'});
  }
};


/* Otp-Verification */

// export const verifyOtp = async (req, res) => {
//     const { email, token } = req.body;

    /* Validation */
    // if (!email || !token) {
    //     return res.status(400).json({ error: 'Email and OTP token are required.' });
    // }
    
    // if (!/^\d{6}$/.test(token)) {
    //   return res.status(400).json({ error: 'Invalid OTP format. Must be 6 digits.' });
    // }

    /* Validation - End */

//     try{
//         const {data,error} = await supabase.auth.verifyOtp({
//             email:email,
//             token:token,
//             type:'signup'
//         })
//         if (error) {
//             console.error('Supabase OTP verification error:', error);
//             return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
//         }
//         return res.status(200).json({
//             message: 'Email verified successfully! User is now logged in.',
//             user: data.user,
//             session: data.session 
//         });

//     }catch(err){
//         console.error('Server error during OTP verification:', err);
//         res.status(500).json({ error: 'Server error during OTP verification.' });
//     }
// }

/* Login */

export const logIn = async (req,res)=>{
    const {email,password} = req.body;

    /* Validation */
    if(!email || !password){
        return res.status(400).json({ error: 'Email and password are required.'})
    }
    /* Validation - End */

    try{
        const {data,error} = await supabase.auth.signInWithPassword({
            email:email,
            password:password 
        });
        if(error){
            console.error('Supabase login error:', error);
            return res.status(401).json({ error: 'Invalid login credentials.'});
        }

        return res.status(200).json({
            message:"Login successful!",
            user:data.user,
            session:data.session
        });

    }catch(err){
        console.error('Server error during login:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
}

/* Logout */

export const logOut = async (req,res)=>{
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        console.error('Logout attempted without token, even after checkAuth.');
        return res.status(401).json({ error: 'Authorization token missing.' });
    }
    try {
        const { error } = await supabase.auth.signOut(token);

        if (error) {
        console.error('Supabase signOut error:', error);
        return res.status(200).json({ message: "Logout processed (client should clear token)." });
        }

        return res.status(200).json({
        message: "Logout successful!"
        });

    } catch (err) {
        console.error('Server error during logout:', err);
        res.status(500).json({ message: 'Server error during logout, but client should clear token.' });
    }
}   
