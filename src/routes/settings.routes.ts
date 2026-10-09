import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { scoringConfigSchema } from '../validators/lead.schema.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';

const router = Router();

router.get('/', asyncHandler(getSettings));
router.put('/', validateBody(scoringConfigSchema), asyncHandler(updateSettings));

export default router;
