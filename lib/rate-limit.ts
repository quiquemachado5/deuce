import {clientAddress} from './client-address';
import {sharedRateLimit,sharedRateLimitDiagnostics,sharedRateLimitPath,closeSharedRateLimitHandles} from './shared-rate-limit';
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
const maximumBuckets = 2_048;
let evictions = 0;

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
 * Shared SQLite enforcement on the single-host deployment, with an additional
 * Caddy outer budget. In-memory mode remains explicit for isolated development.
 */
export function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const store=process.env.DEUCE_RATE_LIMIT_STORE||(process.env.DEUCE_ARCHIVE_DIR?'sqlite':'memory');
  const path=sharedRateLimitPath();
  if(store==='sqlite')return path?sharedRateLimit(path,`${scope}:${clientAddress(request)}`,limit,windowMs,now):{allowed:false,remaining:0,retryAfter:1};
  if(store!=='memory')return {allowed:false,remaining:0,retryAfter:1};
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
  if((process.env.DEUCE_RATE_LIMIT_STORE||(process.env.DEUCE_ARCHIVE_DIR?'sqlite':'memory'))==='sqlite')return sharedRateLimitDiagnostics(sharedRateLimitPath());
  return { entries: buckets.size, capacity: maximumBuckets, evictions };
}

export function resetRateLimitState() {
  closeSharedRateLimitHandles();
  buckets.clear();
  evictions = 0;
}
