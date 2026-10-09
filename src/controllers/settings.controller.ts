import type { Request, Response } from 'express';
import { getScoringConfig, updateScoringConfig } from '../services/settings.service.js';
import type { ScoringConfig } from '../types/lead.js';

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const scoringConfig = await getScoringConfig();
  res.json({ data: { scoringConfig } });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const scoringConfig = await updateScoringConfig(req.body as ScoringConfig);
  res.json({ data: { scoringConfig } });
}
