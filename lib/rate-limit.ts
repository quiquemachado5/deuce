type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
const maximumBuckets = 2_048;
let evictions = 0;

function clientAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').at(-1);
  return (request.headers.get('x-real-ip') || forwarded || 'unknown').trim().slice(0, 80);
}

function pruneBuckets(now: number) {
  for (const [candidate, value] of buckets) {
    if (value.resetAt <= now) buckets.delete(candidate);
  }
  while (buckets.size > maximumBuckets) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
    evictions++;
  }
}

/**
 * Per-instance safety valve. The public API also sets explicit query and CPU
 * budgets; production edge rate limiting remains the distributed outer layer.
 */
export function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count++;
  if (buckets.size > maximumBuckets) pruneBuckets(now);
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)) };
}

export function rateLimitDiagnostics() {
  return { entries: buckets.size, capacity: maximumBuckets, evictions };
}

export function resetRateLimitState() {
  buckets.clear();
  evictions = 0;
}
