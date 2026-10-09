import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { analytics } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/', asyncHandler(analytics));

export default router;
