type ProviderQuota = Record<string, unknown> & { today?: Record<string, unknown> };
export type ProviderOperation = 'detail-download'|'atp-refresh'|'wta-refresh'|'wta-history'|'enrichment';

const operationDefaults:Record<ProviderOperation,number>={
  'detail-download':2,
  'atp-refresh':35,
  'wta-refresh':30,
  'wta-history':90,
  enrichment:90,
};

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

const quotaNumber=(quota:ProviderQuota|undefined,...names:string[])=>{
  for(const name of names){
    const value=Number(quota?.today?.[name]??quota?.[name]);
    if(Number.isFinite(value)&&value>=0)return value;
  }
  return undefined;
};

/** Keep a production safety margin so scheduled work cannot exhaust paid quota. */
export function providerMinimumReserve() {
  const configured = Number(process.env.DEUCE_PROVIDER_MIN_REMAINING ?? 200);
  return Number.isSafeInteger(configured) && configured >= 1 ? configured : 200;
}

/** Hard ceiling for all provider traffic in one quota day, including probes. */
export function providerDailyCallCap() {
  const configured=Number(process.env.DEUCE_PROVIDER_DAILY_MAX_CALLS??400);
  return Number.isSafeInteger(configured)&&configured>0?configured:400;
}

/** Calls that can still be made before reaching DEUCE's own daily ceiling. */
export function providerCallsBelowDailyCap(quota:ProviderQuota|undefined,cap=providerDailyCallCap()) {
  const used=quotaNumber(quota,'used_day','daily_used','used');
  return used===undefined?Number.POSITIVE_INFINITY:Math.max(0,cap-used);
}

/** Calls still available without crossing the configured reserve. */
export function providerCallsAboveReserve(quota: ProviderQuota | undefined, reserve = providerMinimumReserve()) {
  const remaining = providerRemainingCalls(quota);
  return remaining === Number.POSITIVE_INFINITY ? remaining : Math.max(0, remaining - reserve);
}

/** The usage probe itself consumes one request before provider work starts. */
export function providerHasRequestAfterUsage(quota: ProviderQuota | undefined, reserve = providerMinimumReserve(), cap = providerDailyCallCap()) {
  return providerCallsAboveReserve(quota, reserve) > 0 && providerCallsBelowDailyCap(quota,cap)>0;
}

/** Total operation budget, including the usage probe already counted by callers. */
export function providerOperationCallLimit(quota: ProviderQuota | undefined, maximum: number, reserve = providerMinimumReserve(), cap = providerDailyCallCap()) {
  const available = providerCallsAboveReserve(quota, reserve);
  const belowCap=providerCallsBelowDailyCap(quota,cap);
  const afterProbe=Math.min(available,belowCap);
  return afterProbe === Number.POSITIVE_INFINITY ? maximum : Math.min(maximum, 1 + afterProbe);
}

/** One central budget policy for every provider-consuming operation. */
export function providerOperationBudget(quota:ProviderQuota|undefined,operation:ProviderOperation,requested=operationDefaults[operation]) {
  const envName=`DEUCE_PROVIDER_${operation.replaceAll('-','_').toUpperCase()}_MAX_CALLS`;
  const configured=Number(process.env[envName]);
  const maximum=Number.isSafeInteger(configured)&&configured>0?Math.min(configured,requested):requested;
  return providerOperationCallLimit(quota,maximum);
}

/** Safe, credential-free snapshot suitable for the operational ledger. */
export function providerQuotaSnapshot(quota:ProviderQuota|undefined,operation:ProviderOperation,requested?:number,now=new Date()) {
  const remaining=providerRemainingCalls(quota),reserve=providerMinimumReserve(),dailyCallCap=providerDailyCallCap();
  const used=quotaNumber(quota,'used_day','daily_used','used');
  const dailyCapAvailable=providerCallsBelowDailyCap(quota,dailyCallCap);
  return {
    at:now.toISOString(),operation,
    remaining:remaining===Number.POSITIVE_INFINITY?null:remaining,
    dailyLimit:quotaNumber(quota,'limit_day','daily_limit','limit'),
    used,
    reserve,
    safeAvailable:remaining===Number.POSITIVE_INFINITY?null:Math.max(0,remaining-reserve),
    dailyCallCap,
    dailyCapAvailable:dailyCapAvailable===Number.POSITIVE_INFINITY?null:dailyCapAvailable,
    dailyCapUtilization:used===undefined?null:Math.min(1,used/dailyCallCap),
    operationLimit:providerOperationBudget(quota,operation,requested),
    retryAt:providerQuotaRetryAt(quota,now.getTime()),
  };
}
