import { Router } from 'express';
import { calculateRoute } from './routes.controller.js';

const router = Router();
router.post('/calculate', calculateRoute);

export default router;