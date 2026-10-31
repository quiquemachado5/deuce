import { searchArchive } from '@/lib/cuaderno/search';
import { notebook } from '@/lib/cuaderno/data';
import { rateLimit } from '@/lib/rate-limit';
import { generationMetadata } from '@/lib/revista/generation';
import { logEvent, requestId } from '@/lib/structured-log';

export async function GET(request: Request) {
  const id = requestId(request), budget = rateLimit(request, 'search', 45, 60_000);
  if (!budget.allowed) return Response.json({ error: 'Demasiadas búsquedas. Inténtalo de nuevo en un momento.' }, { status: 429, headers: { 'Retry-After': String(budget.retryAfter), 'X-Request-Id': id } });
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100) || '';
  if (query.length < 2) return Response.json({ items: [], minimumQueryLength: 2 }, { headers: { 'X-Request-Id': id } });
  const started = performance.now();
  try {
    // The prepared notebook inflates the archive once per validated generation.
    // Subsequent queries reuse both the data and the bounded text index.
    const data = await notebook();
    const items = await searchArchive(query, { data });
    const elapsedMs = Math.round(performance.now() - started);
    if (elapsedMs > 250) logEvent('warn', 'search.slow', { requestId: id, elapsedMs, queryLength: query.length });
    return Response.json({ items, ...generationMetadata(data) }, { headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'X-DEUCE-Dataset-Version': data.manifest.version, 'X-Request-Id': id,
      'X-RateLimit-Remaining': String(budget.remaining), 'Server-Timing': `search;dur=${elapsedMs}`,
    } });
  } catch (error) {
    logEvent('error', 'search.failed', { requestId: id, error: error instanceof Error ? error.name : 'unknown' });
    return Response.json({ error: 'No se pudo abrir el archivo.' }, { status: 503, headers: { 'X-Request-Id': id } });
  }
}
