import { rateLimit } from '@/lib/rate-limit';
import { logEvent, requestId } from '@/lib/structured-log';

const allowedKinds = new Set(['web-vital', 'client-error', 'unhandled-rejection', 'navigation']);
const allowedMetrics = new Set(['TTFB', 'FCP', 'LCP', 'INP', 'CLS']);

export async function POST(request: Request) {
  const id = requestId(request), budget = rateLimit(request, 'telemetry', 120, 60_000);
  if (!budget.allowed) return new Response(null, { status: 429, headers: { 'Retry-After': String(budget.retryAfter), 'X-Request-Id': id } });
  if (Number(request.headers.get('content-length') || 0) > 4_096) return new Response(null, { status: 413, headers: { 'X-Request-Id': id } });
  try {
    const body = await request.json() as Record<string, unknown>;
    const kind = typeof body.kind === 'string' && allowedKinds.has(body.kind) ? body.kind : null;
    if (!kind) return new Response(null, { status: 400, headers: { 'X-Request-Id': id } });
    const metric = typeof body.name === 'string' && allowedMetrics.has(body.name) ? body.name : undefined;
    logEvent(kind.includes('error') || kind.includes('rejection') ? 'warn' : 'info', `client.${kind}`, {
      requestId: id, metric, value: typeof body.value === 'number' && Number.isFinite(body.value) ? Math.round(body.value * 100) / 100 : undefined,
      rating: typeof body.rating === 'string' ? body.rating.slice(0, 24) : undefined,
      path: typeof body.path === 'string' ? body.path.slice(0, 180) : undefined,
      error: typeof body.error === 'string' ? body.error.slice(0, 80) : undefined,
      navigationType: typeof body.navigationType === 'string' ? body.navigationType.slice(0, 24) : undefined,
    });
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': id } });
  } catch {
    return new Response(null, { status: 400, headers: { 'X-Request-Id': id } });
  }
}
