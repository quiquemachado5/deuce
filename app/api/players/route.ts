import { DATASET_CACHE_CONTROL } from '@/lib/http-cache';
import {playerBiography} from '@/lib/player-bio';
import { normalizeText } from '@/lib/quality';
import { rateLimit } from '@/lib/rate-limit';
import { generationMetadata } from '@/lib/revista/generation';
import { preparedPlayerRecords } from '@/lib/revista/read-records';
import { requestCacheScope, versionedJson } from '@/lib/http-cache';

export async function GET(request: Request) {
  const started=performance.now();
  const budget = rateLimit(request, 'players', 60, 60_000);
  if (!budget.allowed) return Response.json({ error: 'Demasiadas búsquedas. Inténtalo de nuevo en un momento.' }, { status: 429, headers: { 'Retry-After': String(budget.retryAfter) } });
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100) || '';
  if (query.length === 1) return Response.json({ items: [], minimumQueryLength: 2 });
  const generation = await preparedPlayerRecords();
  const needle = normalizeText(query);
  const tour=new URL(request.url).searchParams.get('tour')==='wta'?'wta':'atp';
  const names = [...new Set(generation.records.filter(player=>(player.tour||'atp')===tour).map(player => player.name))].sort((a, b) => a.localeCompare(b, 'es'));
  const items = (needle ? names.filter(name => normalizeText(name).includes(needle)) : names).slice(0, query ? 30 : 80);
  return versionedJson(request,{ tour,items,identities:Object.fromEntries(items.map(name=>[name,{country:playerBiography(name,tour)?.country}])), total: needle ? items.length : names.length, ...generationMetadata(generation) },{
    version:generation.manifest.version,scope:requestCacheScope(request,'players-v2'),route:'players',started,
    cacheControl:DATASET_CACHE_CONTROL,headers:{'X-RateLimit-Remaining':String(budget.remaining)},
  });
}
