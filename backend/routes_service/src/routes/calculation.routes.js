import { Router } from 'express';
import { handleCalculation } from '../controllers/calculation.controller.js';

const router = Router();

router.post('/calculate', handleCalculation);

export default router;