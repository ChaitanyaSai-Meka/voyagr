import { Router } from 'express';
import { createFeedback } from './feedback.controller.js';

const router = Router();

router.post('/', createFeedback);

export default router;