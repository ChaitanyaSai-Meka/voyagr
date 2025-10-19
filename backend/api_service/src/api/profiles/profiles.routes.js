import { Router } from 'express';
import { getMyProfile, updateMyProfile } from './profiles.controller.js';
import { checkAuth } from '../../middleware/checkAuth.js';

const router = Router();

router.get('/me', checkAuth, getMyProfile);
router.put('/me', checkAuth, updateMyProfile);


export default router;