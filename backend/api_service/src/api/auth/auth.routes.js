import {Router} from 'express';
import {logIn, signUp, verifyOtp,logOut} from './auth.controller.js';

const router = Router();

router.post('/login',logIn)
router.post('/signup',signUp)
router.post('/verify-otp',verifyOtp)
router.post('/logout',logOut)

export default router;