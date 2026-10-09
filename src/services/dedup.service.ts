import { normalizeCompanyName } from '../utils/normalize.js';

export interface DedupCandidate {
  companyName?: string | null;
  websiteDomain?: string | null;
}

export function duplicateKeyFor(lead: DedupCandidate): { companyKey: string; domainKey: string | null } {
  return {
    companyKey: normalizeCompanyName(lead.companyName),
    domainKey: lead.websiteDomain ? lead.websiteDomain.trim().toLowerCase() : null,
  };
}

/**
 * Duplicates are detected by a normalized company name OR a normalized website
 * domain. Both keys must be non-empty to match on that dimension.
 */
export function isDuplicate(
  a: DedupCandidate,
  b: DedupCandidate,
): boolean {
  const left = duplicateKeyFor(a);
  const right = duplicateKeyFor(b);
  if (left.domainKey && right.domainKey && left.domainKey === right.domainKey) return true;
  if (left.companyKey && right.companyKey && left.companyKey === right.companyKey) return true;
  return false;
}
