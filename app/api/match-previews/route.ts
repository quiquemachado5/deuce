import { toMatchRecord } from '@/data/map-match';
import { queryMatchBrowserPage } from '@/lib/match-browser-snapshot';
import { preparedMatchBrowser } from '@/lib/revista/read-records';
import { requestCacheScope, versionedJson } from '@/lib/http-cache';

export async function GET(request: Request) {
  const started=performance.now();
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
    return versionedJson(request,{items},{version:data.manifest.version,scope:requestCacheScope(request,'match-previews'),route:'match-previews',started});
  } catch {
    return Response.json({ error: 'No se pudieron cargar los partidos.' }, { status: 503 });
  }
}
