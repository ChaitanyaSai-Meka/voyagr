import { Router } from 'express';
import { searchStations } from './stations.controller.js';

const router = Router();

router.get('/search', searchStations);

export default router;