import type { Request, Response } from 'express';
import mongoose from 'mongoose';

export function health(_req: Request, res: Response): void {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const dbState = states[mongoose.connection.readyState] ?? 'unknown';
  res.json({
    status: 'ok',
    service: 'leadiq-backend',
    db: dbState,
    timestamp: new Date().toISOString(),
  });
}
