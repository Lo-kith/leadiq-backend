import type { Request, Response } from 'express';
import { getAnalytics } from '../services/analytics.service.js';

export async function analytics(_req: Request, res: Response): Promise<void> {
  const data = await getAnalytics();
  res.json({ data });
}
