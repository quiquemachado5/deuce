type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

function clientAddress(request: Request) {
  return (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim().slice(0, 80);
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
  if (buckets.size > 2_000) {
    for (const [candidate, value] of buckets) if (value.resetAt <= now) buckets.delete(candidate);
  }
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)) };
}
