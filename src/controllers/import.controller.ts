import type { Request, Response } from 'express';
import { Lead } from '../models/Lead.js';
import { AppError } from '../middleware/errors.js';
import { getScoringConfig } from '../services/settings.service.js';
import { buildScoredPayload, serializeLead, type LeadInput } from '../services/lead.service.js';
import {
  classifyRow,
  markInFileDuplicates,
  parseCsv,
  type ClassifiedRow,
  type ExistingKey,
} from '../services/import.service.js';
import { recordImportStats } from '../services/analytics.service.js';

export async function importCsv(req: Request, res: Response): Promise<void> {
  if (!req.file) throw AppError.badRequest('No CSV file uploaded (expected field "file")');

  const commit = String(req.body.commit ?? 'true') !== 'false';
  const skipDuplicates = String(req.body.skipDuplicates ?? 'true') !== 'false';

  let rows;
  try {
    rows = parseCsv(req.file.buffer);
  } catch (err) {
    throw AppError.badRequest(err instanceof Error ? err.message : 'Unable to parse CSV');
  }

  if (rows.length === 0) {
    throw AppError.badRequest('CSV contained no data rows');
  }

  const existingDocs = await Lead.find({}, { companyName: 1, websiteDomain: 1 }).lean();
  const existing: ExistingKey[] = existingDocs.map((doc) => ({
    id: String(doc._id),
    companyName: String(doc.companyName ?? ''),
    websiteDomain: (doc.websiteDomain as string) ?? null,
  }));

  const classified: ClassifiedRow[] = rows.map((row) => classifyRow(row, existing));
  markInFileDuplicates(classified);

  const duplicates = classified.filter((row) => row.status === 'duplicate').length;
  const invalid = classified.filter((row) => row.status === 'invalid').length;
  const valid = classified.filter((row) => row.status === 'valid').length;

  const savedIds: string[] = [];
  if (commit) {
    const config = await getScoringConfig();
    const toSave = classified.filter(
      (row) => row.status === 'valid' || (row.status === 'duplicate' && !skipDuplicates),
    );
    for (const row of toSave) {
      const payload = buildScoredPayload(
        { ...(row.input as LeadInput), companyName: row.input.companyName ?? row.companyName },
        config,
      );
      const created = await Lead.create(payload);
      savedIds.push(serializeLead(created).id);
    }
    await recordImportStats(duplicates);
  }

  res.status(commit ? 201 : 200).json({
    data: {
      committed: commit,
      summary: {
        total: rows.length,
        valid,
        invalid,
        duplicates,
        skippedDuplicates: commit && skipDuplicates ? duplicates : 0,
        saved: savedIds.length,
      },
      records: classified.map((row) => ({
        rowNumber: row.rowNumber,
        companyName: row.companyName,
        status: row.status,
        issues: row.issues,
        duplicateOf: row.duplicateOf,
        lead: {
          companyName: row.input.companyName ?? null,
          website: row.input.website ?? null,
          industry: row.input.industry ?? null,
          location: row.input.location ?? null,
          employeeCount: row.input.employeeCount ?? null,
          revenue: row.input.revenue ?? null,
          contactName: row.input.contactName ?? null,
          email: row.input.email ?? null,
          linkedinUrl: row.input.linkedinUrl ?? null,
          leadSource: row.input.leadSource ?? null,
        },
      })),
    },
  });
}
