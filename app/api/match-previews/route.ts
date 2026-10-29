import { notebook } from '@/lib/cuaderno/data';
import { matchingMatches } from '@/lib/cuaderno/search';
import { toMatchRecord } from '@/data/map-match';

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get('q')?.trim().slice(0, 180) || '';
    if (!q) return Response.json({ items: [] });
    const data = await notebook();
    const items = matchingMatches(q, data.matches, 12).map(match => {
      const record = toMatchRecord(match);
      return {
        href: record.href,
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
    return Response.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    return Response.json({ error: 'No se pudieron cargar los partidos.' }, { status: 503 });
  }
}
