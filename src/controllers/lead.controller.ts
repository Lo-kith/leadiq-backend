import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { Lead } from '../models/Lead.js';
import { AppError } from '../middleware/errors.js';
import { getScoringConfig } from '../services/settings.service.js';
import { buildScoredPayload, serializeLead, type LeadInput } from '../services/lead.service.js';
import { computeScore, computeCompleteness } from '../services/scoring.service.js';
import type { ListLeadsQuery } from '../validators/lead.schema.js';
import type { Paginated, LeadRecord } from '../types/lead.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildFilter(query: Partial<ListLeadsQuery>): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.ids) {
    const ids = query.ids
      .split(',')
      .map((id) => id.trim())
      .filter((id) => isValidObjectId(id));
    filter._id = { $in: ids };
  }
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ companyName: rx }, { contactName: rx }, { email: rx }, { websiteDomain: rx }];
  }
  if (query.industry) filter.industry = new RegExp(escapeRegex(query.industry), 'i');
  if (query.location) filter.location = new RegExp(escapeRegex(query.location), 'i');
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;

  const score: Record<string, number> = {};
  if (query.minScore !== undefined) score.$gte = query.minScore;
  if (query.maxScore !== undefined) score.$lte = query.maxScore;
  if (Object.keys(score).length) filter.score = score;

  const completeness: Record<string, number> = {};
  if (query.minCompleteness !== undefined) completeness.$gte = query.minCompleteness;
  if (query.maxCompleteness !== undefined) completeness.$lte = query.maxCompleteness;
  if (Object.keys(completeness).length) filter.completeness = completeness;

  return filter;
}

function buildSort(query: Partial<ListLeadsQuery>): Record<string, 1 | -1> {
  const field = query.sort ?? 'score';
  const order = query.order === 'asc' ? 1 : -1;
  return { [field]: order, _id: 1 };
}

export async function listLeads(_req: Request, res: Response): Promise<void> {
  const query = (res.locals.query ?? {}) as ListLeadsQuery;
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const filter = buildFilter(query);

  const [total, docs, industryValues, locationValues] = await Promise.all([
    Lead.countDocuments(filter),
    Lead.find(filter)
      .sort(buildSort(query))
      .skip((page - 1) * limit)
      .limit(limit),
    Lead.distinct('industry'),
    Lead.distinct('location'),
  ]);

  const body: Paginated<LeadRecord> & { facets: { industries: string[]; locations: string[] } } = {
    data: docs.map(serializeLead),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    facets: {
      industries: industryValues.filter(Boolean).sort(),
      locations: locationValues.filter(Boolean).sort(),
    },
  };
  res.json(body);
}

export async function getLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw AppError.badRequest('Invalid lead id');
  const lead = await Lead.findById(id);
  if (!lead) throw AppError.notFound('Lead not found');
  res.json({ data: serializeLead(lead) });
}

export async function createLead(req: Request, res: Response): Promise<void> {
  const config = await getScoringConfig();
  const payload = buildScoredPayload(req.body as LeadInput, config);
  const lead = await Lead.create(payload);
  res.status(201).json({ data: serializeLead(lead) });
}

export async function updateLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw AppError.badRequest('Invalid lead id');
  const existing = await Lead.findById(id);
  if (!existing) throw AppError.notFound('Lead not found');

  const config = await getScoringConfig();
  const merged: LeadInput = {
    companyName: req.body.companyName ?? existing.companyName,
    website: req.body.website !== undefined ? req.body.website : existing.website,
    industry: req.body.industry !== undefined ? req.body.industry : existing.industry,
    location: req.body.location !== undefined ? req.body.location : existing.location,
    employeeCount: req.body.employeeCount !== undefined ? req.body.employeeCount : existing.employeeCount,
    revenue: req.body.revenue !== undefined ? req.body.revenue : existing.revenue,
    contactName: req.body.contactName !== undefined ? req.body.contactName : existing.contactName,
    email: req.body.email !== undefined ? req.body.email : existing.email,
    linkedinUrl: req.body.linkedinUrl !== undefined ? req.body.linkedinUrl : existing.linkedinUrl,
    leadSource: req.body.leadSource !== undefined ? req.body.leadSource : existing.leadSource,
    status: req.body.status ?? existing.status,
    nextAction: req.body.nextAction !== undefined ? req.body.nextAction : existing.nextAction,
    notes: req.body.notes !== undefined ? req.body.notes : existing.notes,
  };

  const payload = buildScoredPayload(merged, config);
  Object.assign(existing, payload);
  const saved = await existing.save();
  res.json({ data: serializeLead(saved) });
}

export async function deleteLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) throw AppError.badRequest('Invalid lead id');
  const deleted = await Lead.findByIdAndDelete(id);
  if (!deleted) throw AppError.notFound('Lead not found');
  res.json({ data: { id } });
}

export async function rescoreAllLeads(_req: Request, res: Response): Promise<void> {
  const config = await getScoringConfig();
  const leads = await Lead.find({});
  const result = { updated: 0 };
  for (const lead of leads) {
    const scored = computeScore(
      {
        ...lead.toObject(),
      },
      config,
    );
    lead.set({
      score: scored.score,
      priority: scored.priority,
      completeness: computeCompleteness(lead.toObject()),
      breakdown: scored.breakdown,
    });
    await lead.save();
    result.updated += 1;
  }
  res.json({ data: result });
}
