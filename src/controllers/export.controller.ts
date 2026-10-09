import type { Request, Response } from 'express';
import { Lead } from '../models/Lead.js';
import { serializeLead } from '../services/lead.service.js';
import { leadsToCsv } from '../services/export.service.js';
import { buildFilter } from './lead.controller.js';
import type { ListLeadsQuery } from '../validators/lead.schema.js';

export async function exportLeads(_req: Request, res: Response): Promise<void> {
  const query = (res.locals.query ?? {}) as ListLeadsQuery;
  const filter = buildFilter(query);
  const docs = await Lead.find(filter).sort({ score: -1 }).limit(10_000);
  const csv = leadsToCsv(docs.map(serializeLead));

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leadiq-export-${stamp}.csv"`);
  res.send(csv);
}
