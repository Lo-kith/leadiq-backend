import type { Request, Response } from 'express';
import { askLeads } from '../services/ask.service.js';
import { getOllamaStatus } from '../services/ollama.service.js';
import { env } from '../config/env.js';
import type { AskInput } from '../validators/ask.schema.js';

export async function ask(req: Request, res: Response): Promise<void> {
  const input = req.body as AskInput;
  const { answer, context } = await askLeads(input);

  res.json({
    data: {
      answer,
      model: env.ollamaModel,
      context: {
        mode: context.mode,
        leadCount: context.leads.length,
        totalMatched: context.totalMatched,
        truncated: context.truncated,
        notes: context.notes,
        leads: context.leads.map((lead) => ({ id: lead.id, companyName: lead.companyName })),
      },
    },
  });
}

export async function askStatus(_req: Request, res: Response): Promise<void> {
  const status = await getOllamaStatus();
  res.json({
    data: {
      provider: 'ollama',
      url: env.ollamaUrl,
      model: status.model,
      available: status.available,
      modelAvailable: status.modelAvailable,
    },
  });
}
