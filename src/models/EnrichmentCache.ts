import { Schema, model } from 'mongoose';

const enrichmentCacheSchema = new Schema(
  {
    domain: { type: String, required: true, unique: true, index: true },
    data: { type: Schema.Types.Mixed, default: null },
    expireAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

enrichmentCacheSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const EnrichmentCache = model('EnrichmentCache', enrichmentCacheSchema);
