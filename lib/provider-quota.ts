type ProviderQuota = Record<string, unknown> & { today?: Record<string, unknown> };

export function isProviderFreeHistoryLimit(status: number, payload: unknown) {
  if (status !== 403 || !payload || typeof payload !== 'object') return false;
  const row = payload as Record<string, unknown>;
  const detail = String(row.detail || row.message || '');
  return /history plan|free history calls/i.test(detail);
}

function dateValue(value: unknown): number | undefined {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value < 10_000_000_000 ? value * 1_000 : value;
  return undefined;
}

/** Prefer the provider reset timestamp; fall back to the next UTC quota day. */
export function providerQuotaRetryAt(quota: ProviderQuota | undefined, now = Date.now()) {
  const candidates = [
    quota?.today?.reset_at, quota?.today?.resetAt, quota?.today?.resets_at,
    quota?.reset_at, quota?.resetAt, quota?.resets_at, quota?.retry_at_epoch,
  ].map(dateValue).filter((value): value is number => value !== undefined && value > now);
  if (candidates.length) return new Date(Math.min(...candidates)).toISOString();
  const next = new Date(now);
  next.setUTCHours(24, 5, 0, 0);
  return next.toISOString();
}

export function providerRemainingCalls(quota: ProviderQuota | undefined) {
  const value=quota?.today?.remaining_day;
  if(value===null)return Number.POSITIVE_INFINITY;
  const remaining = Number(value);
  return Number.isFinite(remaining) && remaining >= 0 ? remaining : 0;
}

/** The usage probe itself consumes one request before provider work starts. */
export function providerHasRequestAfterUsage(quota: ProviderQuota | undefined) {
  return providerRemainingCalls(quota) > 1;
}
