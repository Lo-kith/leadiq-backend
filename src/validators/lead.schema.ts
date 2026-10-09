import { z } from 'zod';
import { LEAD_PRIORITIES, LEAD_STATUSES } from '../types/lead.js';

const emptyToNull = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
};

const nullableString = z.preprocess(emptyToNull, z.string().nullable()).optional();

const nullableNumber = z
  .preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : value;
  }, z.number().nullable())
  .optional();

const nullableEmail = z
  .preprocess(emptyToNull, z.string().email().nullable())
  .optional();

const baseFields = {
  companyName: z.string().trim().min(1, 'Company name is required'),
  website: nullableString,
  industry: nullableString,
  location: nullableString,
  employeeCount: nullableNumber,
  revenue: nullableNumber,
  contactName: nullableString,
  email: nullableEmail,
  linkedinUrl: nullableString,
  leadSource: nullableString,
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  nextAction: nullableString,
  notes: nullableString,
};

export const createLeadSchema = z.object(baseFields);
export const updateLeadSchema = z.object(baseFields).partial();

export const listLeadsQuerySchema = z.object({
  q: z.string().trim().optional(),
  ids: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  location: z.string().trim().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  minCompleteness: z.coerce.number().min(0).max(100).optional(),
  maxCompleteness: z.coerce.number().min(0).max(100).optional(),
  sort: z.enum(['score', 'companyName', 'employeeCount', 'createdAt', 'completeness']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const scoringConfigSchema = z.object({
  targetIndustries: z.array(z.string().trim().min(1)).max(50),
  minEmployees: z.number().int().min(0),
  maxEmployees: z.number().int().min(0),
  minRevenue: z.number().min(0),
  weights: z.object({
    industry: z.number().min(0).max(100),
    companySize: z.number().min(0).max(100),
    revenue: z.number().min(0).max(100),
    website: z.number().min(0).max(100),
    contact: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
  }),
  priorityThresholds: z.object({
    high: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
  }),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
