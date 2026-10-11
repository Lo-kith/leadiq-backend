import { Router, type Request, type Response } from 'express';
import { health } from '../controllers/health.controller.js';
import leadsRoutes from './leads.routes.js';
import analyticsRoutes from './analytics.routes.js';
import settingsRoutes from './settings.routes.js';
import askRoutes from './ask.routes.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => health(req, res));
router.use('/leads', leadsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/ask', askRoutes);

export default router;
