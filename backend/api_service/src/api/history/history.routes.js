import { Router } from 'express';
import { getMyHistory, addRouteToHistory, clearMyHistory } from './history.controller.js';
import { checkAuth } from '../../middleware/checkAuth.js';

const router = Router();

router.get('/', checkAuth, getMyHistory);
router.post('/', checkAuth, addRouteToHistory);
router.delete('/', checkAuth, clearMyHistory);

export default router;