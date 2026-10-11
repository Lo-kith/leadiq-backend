import { z } from 'zod';
import { listLeadsQuerySchema } from './lead.schema.js';

export const askFiltersSchema = listLeadsQuerySchema.pick({
  q: true,
  industry: true,
  location: true,
  status: true,
  priority: true,
  minScore: true,
  maxScore: true,
  minCompleteness: true,
  maxCompleteness: true,
});

export const askMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
});

export const askSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(2000),
  leadId: z.string().trim().optional(),
  history: z.array(askMessageSchema).max(10).optional(),
  filters: askFiltersSchema.optional(),
});

export type AskInput = z.infer<typeof askSchema>;
export type AskFilters = z.infer<typeof askFiltersSchema>;
export type AskHistoryMessage = z.infer<typeof askMessageSchema>;
