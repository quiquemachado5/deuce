import { toMatchRecord } from '@/data/map-match';
import { queryMatchBrowserPage } from '@/lib/match-browser-snapshot';
import { preparedMatchBrowser } from '@/lib/revista/read-records';
import { requestCacheScope, versionedJson } from '@/lib/http-cache';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const started=performance.now();
  const budget=rateLimit(request,'match-previews',90,60_000);
  if(!budget.allowed)return Response.json({error:'Demasiadas consultas. Inténtalo de nuevo en un momento.'},{status:429,headers:{'Cache-Control':'private, no-store','Retry-After':String(budget.retryAfter)}});
  try {
    const q = new URL(request.url).searchParams.get('q')?.trim().slice(0, 180) || '';
    if (!q) return Response.json({ items: [] });
    const tour=new URL(request.url).searchParams.get('tour')==='wta'?'wta':'atp';
    const data = await preparedMatchBrowser(tour);
    const items = queryMatchBrowserPage(data.partitions, { q }, 1, 12).matches.map(match => {
      const record = toMatchRecord(match);
      return {
        href: record.href,tour,
        tournament: record.tournament,
        round: record.round,
        date: record.date,
        players: record.players.map(player => ({ name: player.name, countryCode: player.countryCode })),
        scores: [
          record.sets.map(set => `${set.games[0]}${set.tieBreak?.[0] != null ? `⁽${set.tieBreak[0]}⁾` : ''}`),
          record.sets.map(set => `${set.games[1]}${set.tieBreak?.[1] != null ? `⁽${set.tieBreak[1]}⁾` : ''}`),
        ],
        setWinners: record.sets.map(set => !set.completed || set.games[0] === set.games[1] ? null : set.games[0] > set.games[1] ? 0 : 1),
        winnerIndex: record.winnerIndex,
      };
    });
    return versionedJson(request,{items},{version:data.manifest.version,scope:requestCacheScope(request,'match-previews'),route:'match-previews',started,headers:{'X-RateLimit-Remaining':String(budget.remaining)}});
  } catch {
    return Response.json({ error: 'No se pudieron cargar los partidos.' }, { status: 503 });
  }
}
