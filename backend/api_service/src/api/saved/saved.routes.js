import { Router } from 'express';
import { getMySavedRoutes, saveRoute, unsaveRoute } from './saved.controller.js';
import { checkAuth } from '../../middleware/checkAuth.js';

const router = Router();

router.get('/', checkAuth, getMySavedRoutes);
router.post('/', checkAuth, saveRoute);
router.delete('/:route_id', checkAuth, unsaveRoute);

export default router;