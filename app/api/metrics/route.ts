import { authorizedCronRequest } from '@/lib/cron-auth';
import { preparedDataCacheDiagnostics } from '@/lib/revista/read-records';
import { renderPrometheusMetrics } from '@/lib/runtime-metrics';
import { rateLimitDiagnostics } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!authorizedCronRequest(request, process.env.METRICS_SECRET)) return new Response('Unauthorized', { status: 401 });
  return new Response(renderPrometheusMetrics({ ...preparedDataCacheDiagnostics(), rateLimits: rateLimitDiagnostics() }), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });
}
