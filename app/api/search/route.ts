import { quickSearchArchive, searchArchive } from '@/lib/cuaderno/search';
import { notebook } from '@/lib/cuaderno/data';
import { rateLimit } from '@/lib/rate-limit';
import { generationMetadata } from '@/lib/revista/generation';
import { preparedPlayerRecords } from '@/lib/revista/read-records';
import { exactPlayerSearch } from '@/lib/search-text';
import { logEvent, requestId } from '@/lib/structured-log';

export async function GET(request: Request) {
  const id = requestId(request);
  const parameters = new URL(request.url).searchParams;
  const quickMode = parameters.get('mode') === 'quick';
  let budget = rateLimit(request, quickMode ? 'search-quick' : 'search', quickMode ? 90 : 45, 60_000);
  if (!budget.allowed) return Response.json({ error: 'Demasiadas búsquedas. Inténtalo de nuevo en un momento.' }, { status: 429, headers: { 'Retry-After': String(budget.retryAfter), 'X-Request-Id': id } });
  const query = parameters.get('q')?.trim().slice(0, 100) || '';
  if (query.length < 2) return Response.json({ items: [], minimumQueryLength: 2 }, { headers: { 'X-Request-Id': id } });
  const started = performance.now();
  try {
    const tour = parameters.get('tour') === 'wta' ? 'wta' : 'atp';
    if (quickMode) {
      // Typeahead only needs prepared player rows and record names. Keeping the
      // match artifact closed removes the dominant cold-start cost.
      const data = await preparedPlayerRecords();
      const players = data.records.filter(player => (player.tour || 'atp') === tour);
      const pieces = tour === 'wta' ? data.manifest.circuitPieces?.wta || [] : data.manifest.pieces;
      const selectedExactPlayer=players.some(player=>exactPlayerSearch(query,player.name));
      const foreignExactPlayer=!selectedExactPlayer&&data.records.some(player=>(player.tour||'atp')!==tour&&exactPlayerSearch(query,player.name));
      const items = foreignExactPlayer ? [] : quickSearchArchive(query, players, { pieces, tour });
      const elapsedMs = Math.round(performance.now() - started);
      if (items.length) {
        if (elapsedMs > 250) logEvent('warn', 'search.slow', { requestId: id, elapsedMs, queryLength: query.length, mode: 'quick' });
        return Response.json({ items, ...generationMetadata(data) }, { headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-DEUCE-Dataset-Version': data.manifest.version, 'X-DEUCE-Search-Mode': 'quick', 'X-Request-Id': id,
          'X-RateLimit-Remaining': String(budget.remaining), 'Server-Timing': `search;dur=${elapsedMs}`,
        } });
      }
      // A miss falls back to the full archive and therefore also consumes the
      // stricter full-search budget.
      budget = rateLimit(request, 'search', 45, 60_000);
      if (!budget.allowed) return Response.json({ error: 'Demasiadas búsquedas. Inténtalo de nuevo en un momento.' }, { status: 429, headers: { 'Retry-After': String(budget.retryAfter), 'X-Request-Id': id } });
    }
    // The prepared notebook inflates the archive once per validated generation.
    // Subsequent queries reuse both the data and the bounded text index.
    const data = await notebook();
    const items = await searchArchive(query, { data,tour });
    const elapsedMs = Math.round(performance.now() - started);
    if (elapsedMs > 250) logEvent('warn', 'search.slow', { requestId: id, elapsedMs, queryLength: query.length });
    return Response.json({ items, ...generationMetadata(data) }, { headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'X-DEUCE-Dataset-Version': data.manifest.version, 'X-DEUCE-Search-Mode': quickMode ? 'full-fallback' : 'full', 'X-Request-Id': id,
      'X-RateLimit-Remaining': String(budget.remaining), 'Server-Timing': `search;dur=${elapsedMs}`,
    } });
  } catch (error) {
    logEvent('error', 'search.failed', { requestId: id, error: error instanceof Error ? error.name : 'unknown' });
    return Response.json({ error: 'No se pudo abrir el archivo.' }, { status: 503, headers: { 'X-Request-Id': id } });
  }
}
