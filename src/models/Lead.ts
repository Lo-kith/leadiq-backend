import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { LEAD_PRIORITIES, LEAD_STATUSES } from '../types/lead.js';

const scoringFactorSchema = new Schema(
  {
    label: { type: String, required: true },
    points: { type: Number, required: true },
    detail: { type: String, required: true },
    kind: { type: String, enum: ['positive', 'negative', 'neutral'], required: true },
  },
  { _id: false },
);

const leadSchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true },
    normalizedCompanyName: { type: String, required: true, index: true },
    website: { type: String, default: null },
    websiteDomain: { type: String, default: null, index: true },
    industry: { type: String, default: null, index: true },
    location: { type: String, default: null, index: true },
    employeeCount: { type: Number, default: null },
    revenue: { type: Number, default: null },
    contactName: { type: String, default: null },
    jobTitle: { type: String, default: null },
    email: { type: String, default: null, index: true },
    linkedinUrl: { type: String, default: null },
    leadSource: { type: String, default: null },
    status: { type: String, enum: LEAD_STATUSES, default: 'New', index: true },
    priority: { type: String, enum: LEAD_PRIORITIES, default: 'Low', index: true },
    score: { type: Number, default: 0, index: true },
    completeness: { type: Number, default: 0 },
    nextAction: { type: String, default: null },
    notes: { type: String, default: null },
    breakdown: {
      factors: { type: [scoringFactorSchema], default: [] },
      missing: { type: [String], default: [] },
      reasons: { type: [String], default: [] },
      nextAction: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

leadSchema.index({ companyName: 'text', contactName: 'text' });
leadSchema.index({ score: -1, createdAt: -1 });

export type LeadDocument = HydratedDocument<InferSchemaType<typeof leadSchema>>;

export const Lead = model('Lead', leadSchema);
