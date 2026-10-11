import dns from 'dns/promises';

const USER_AGENT = 'LeadIQ-Enricher/1.0';
const TIMEOUT_MS = 5000;
const MAX_READ = 200 * 1024; // 200KB

const PRIVATE_IPV4_BLOCKS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
];

const isPrivateIp = (ip: string): boolean => {
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower.startsWith('::ffff:')) {
      return true;
    }
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      return true;
    }
    if (lower.startsWith('::') && lower !== '::') {
      // treat mapped/others conservatively - check for local
    }
    if (lower === '::1') return true;
    return false;
  }
  return PRIVATE_IPV4_BLOCKS.some((re) => re.test(ip));
};

export interface EnrichmentResult {
  checkedAt: string;
  mxValid: boolean | null;
  websiteStatus: number | null;
  siteTitle: string | null;
  siteDescription: string | null;
}

export function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  return new Promise((resolve, reject) => {
    if (items.length === 0) {
      resolve([]);
      return;
    }
    let index = 0;
    let completed = 0;
    const results: R[] = Array(items.length).fill(null as unknown as R);
    const workers = Math.min(limit, items.length);

    const next = (workerIndex: number) => {
      if (index >= items.length) {
        completed += 1;
        if (completed >= workers) {
          resolve(results);
        }
        return;
      }
      const current = index++;
      fn(items[current], current)
        .then((res) => {
          results[current] = res;
          next(workerIndex);
        })
        .catch((err) => {
          reject(err);
        });
    };

    for (let i = 0; i < workers; i += 1) {
      next(i);
    }
  });
}

const extractTitle = (body: string): string | null => {
  const m = body.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!m) return null;
  return m[1].replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim() || null;
};

const extractDescription = (body: string): string | null => {
  const m = body.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || body.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  if (!m) return null;
  const v = m[1].replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
  return v || null;
};

const safeFetch = async (url: string): Promise<{ status: number; body: string } | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html',
      },
      signal: controller.signal,
    } as RequestInit);
    const reader = res.body?.getReader();
    let chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.length;
          if (total > MAX_READ) {
            break;
          }
          chunks.push(value);
        }
      }
      const buf = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        buf.set(c, offset);
        offset += c.length;
      }
      const body = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      clearTimeout(timer);
      return { status: res.status, body };
    }
    const text = await res.text();
    clearTimeout(timer);
    const truncated = text.slice(0, MAX_READ);
    return { status: res.status, body: truncated };
  } catch {
    clearTimeout(timer);
    return null;
  }
};

const checkMx = async (domain: string): Promise<boolean | null> => {
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return null;
  }
};

const isDomainSafe = async (domain: string): Promise<boolean> => {
  try {
    const addresses = await dns.lookup(domain, { all: true });
    for (const a of addresses) {
      if (isPrivateIp(a.address)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
};

export async function enrichLead(input: { email?: string | null; websiteDomain?: string | null }): Promise<EnrichmentResult> {
  const checkedAt = new Date().toISOString();
  let mxValid: boolean | null = null;
  let websiteStatus: number | null = null;
  let siteTitle: string | null = null;
  let siteDescription: string | null = null;

  try {
    if (input.email) {
      const email = String(input.email).toLowerCase().trim();
      const d = email.split('@')[1];
      if (d) {
        mxValid = await checkMx(d);
      }
    }
  } catch {
    mxValid = null;
  }

  try {
    const domain = input.websiteDomain ? String(input.websiteDomain).toLowerCase().trim() : null;
    if (domain && (await isDomainSafe(domain))) {
      const res = await safeFetch(`https://${domain}`);
      if (res) {
        websiteStatus = res.status;
        siteTitle = extractTitle(res.body);
        siteDescription = extractDescription(res.body);
      }
    }
  } catch {
    websiteStatus = null;
    siteTitle = null;
    siteDescription = null;
  }

  return {
    checkedAt,
    mxValid,
    websiteStatus,
    siteTitle,
    siteDescription,
  };
}
