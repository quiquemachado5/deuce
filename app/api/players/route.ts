import { normalizeText } from '@/lib/quality';
import { rateLimit } from '@/lib/rate-limit';
import { generationMetadata } from '@/lib/revista/generation';
import { preparedPlayerRecords } from '@/lib/revista/read-records';

export async function GET(request: Request) {
  const budget = rateLimit(request, 'players', 60, 60_000);
  if (!budget.allowed) return Response.json({ error: 'Demasiadas búsquedas. Inténtalo de nuevo en un momento.' }, { status: 429, headers: { 'Retry-After': String(budget.retryAfter) } });
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100) || '';
  if (query.length === 1) return Response.json({ items: [], minimumQueryLength: 2 });
  const generation = await preparedPlayerRecords();
  const needle = normalizeText(query);
  const names = [...new Set(generation.records.map(player => player.name))].sort((a, b) => a.localeCompare(b, 'es'));
  const items = (needle ? names.filter(name => normalizeText(name).includes(needle)) : names).slice(0, query ? 30 : 80);
  return Response.json({ items, total: needle ? items.length : names.length, ...generationMetadata(generation) }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900', 'X-DEUCE-Dataset-Version': generation.manifest.version, 'X-RateLimit-Remaining': String(budget.remaining) },
  });
}
