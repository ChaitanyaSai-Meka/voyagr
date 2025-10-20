import {Router} from 'express';
import {logIn, signUp,logOut} from './auth.controller.js';
import { checkAuth } from '../../middleware/checkAuth.js';

const router = Router();

router.post('/login',logIn)
router.post('/signup',signUp)
// router.post('/verify-otp',verifyOtp)
router.post('/logout',checkAuth,logOut)

export default router;