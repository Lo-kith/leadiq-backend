import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { askSchema } from '../validators/ask.schema.js';
import { ask, askStatus } from '../controllers/ask.controller.js';

const router = Router();

router.get('/status', asyncHandler(askStatus));
router.post('/', validateBody(askSchema), asyncHandler(ask));

export default router;
