import { rateLimit } from '@/lib/rate-limit';
import { observeClientTelemetry, observeSearchClick } from '@/lib/runtime-metrics';
import { logEvent, requestId } from '@/lib/structured-log';

const allowedKinds = new Set(['web-vital', 'client-error', 'unhandled-rejection', 'navigation', 'search-click']);
const allowedMetrics = new Set(['TTFB', 'FCP', 'LCP', 'INP', 'CLS']);

export async function POST(request: Request) {
  const id = requestId(request), budget = rateLimit(request, 'telemetry', 120, 60_000);
  if (!budget.allowed) return new Response(null, { status: 429, headers: { 'Retry-After': String(budget.retryAfter), 'X-Request-Id': id } });
  if (Number(request.headers.get('content-length') || 0) > 4_096) return new Response(null, { status: 413, headers: { 'X-Request-Id': id } });
  try {
    const body = await request.json() as Record<string, unknown>;
    const kind = typeof body.kind === 'string' && allowedKinds.has(body.kind) ? body.kind : null;
    if (!kind) return new Response(null, { status: 400, headers: { 'X-Request-Id': id } });
    if(kind==='search-click'){
      const group=typeof body.group==='string'&&['players','matches','tournaments','all'].includes(body.group)?body.group as 'players'|'matches'|'tournaments'|'all':null;
      const position=typeof body.position==='number'&&Number.isFinite(body.position)?Math.max(1,Math.min(24,Math.floor(body.position))):null;
      const queryLength=typeof body.queryLength==='number'&&Number.isFinite(body.queryLength)?Math.max(0,Math.min(80,Math.floor(body.queryLength))):null;
      if(!group||position===null||queryLength===null)return new Response(null,{status:400,headers:{'X-Request-Id':id}});
      observeSearchClick({group,position,queryLength});
      return new Response(null,{status:204,headers:{'Cache-Control':'no-store','X-Request-Id':id}});
    }
    const metric = typeof body.name === 'string' && allowedMetrics.has(body.name) ? body.name : undefined;
    if (kind === 'web-vital' && !metric) return new Response(null, { status: 400, headers: { 'X-Request-Id': id } });
    const expectsValue = kind === 'web-vital' || kind === 'navigation';
    const rawValue = typeof body.value === 'number' && Number.isFinite(body.value) ? body.value : null;
    if (expectsValue && rawValue === null) {
      return new Response(null, { status: 400, headers: { 'X-Request-Id': id } });
    }
    const maximumValue = metric === 'CLS' ? 10 : 300_000;
    const value = expectsValue && rawValue !== null
      ? Math.min(maximumValue, Math.max(0, rawValue))
      : undefined;
    const path = typeof body.path === 'string' ? body.path.slice(0, 180) : undefined;
    const rating = typeof body.rating === 'string' ? body.rating.slice(0, 24) : undefined;
    const navigationType = typeof body.navigationType === 'string' ? body.navigationType.slice(0, 24) : undefined;
    const device = typeof body.device === 'string' && ['mobile','tablet','desktop'].includes(body.device) ? body.device : undefined;
    observeClientTelemetry({ kind, name: metric, value, rating, path, navigationType, device });
    logEvent(kind.includes('error') || kind.includes('rejection') ? 'warn' : 'info', `client.${kind}`, {
      requestId: id, metric, value: value === undefined ? undefined : Math.round(value * 100) / 100,
      rating, path,
      error: typeof body.error === 'string' ? body.error.slice(0, 80) : undefined,
      navigationType, device,
    });
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } });
  } catch {
    return new Response(null, { status: 400, headers: { 'X-Request-Id': id } });
  }
}
