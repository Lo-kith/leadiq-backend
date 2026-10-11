import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { uploadCsv } from '../middleware/upload.js';
import { createLeadSchema, listLeadsQuerySchema, updateLeadSchema } from '../validators/lead.schema.js';
import {
  createLead,
  deleteLead,
  getLead,
  listLeads,
  rescoreAllLeads,
  updateLead,
} from '../controllers/lead.controller.js';
import { exportLeads } from '../controllers/export.controller.js';
import { importCsv } from '../controllers/import.controller.js';

const router = Router();

router.get('/export', validateQuery(listLeadsQuerySchema), asyncHandler(exportLeads));
router.post('/import', uploadCsv, asyncHandler(importCsv));
router.post('/rescore', asyncHandler(rescoreAllLeads));

import { enrichLeadsSchema } from '../validators/lead.schema.js';
import { enrichLeadsBatch, enrichLeadById } from '../controllers/lead.controller.js';

router.post('/enrich', validateBody(enrichLeadsSchema), asyncHandler(enrichLeadsBatch));
router.get('/', validateQuery(listLeadsQuerySchema), asyncHandler(listLeads));
router.post('/', validateBody(createLeadSchema), asyncHandler(createLead));

router.get('/:id', asyncHandler(getLead));
router.post('/:id/enrich', asyncHandler(enrichLeadById));
router.patch('/:id', validateBody(updateLeadSchema), asyncHandler(updateLead));
router.delete('/:id', asyncHandler(deleteLead));

export default router;
