import { Router } from 'express';
import { getMapLines } from '../controllers/map.controller.js';

const router = Router();

router.get('/map-lines', getMapLines);

export default router;