import 'server-only';
import type { Match } from '@/lib/types';
import { eligibleMatch } from '@/lib/quality';
import { chronological, winnerName, durationLabel, scoreFor } from '@/lib/editorial';
import { gamesInMatch, lostOpening, matchStat, statNumber } from '@/lib/archive-insights';
import { publishedMatchMinutes } from '@/lib/duration';
import { number, surfaceLabel } from '@/lib/cuaderno/model';
import { tournamentName } from '@/lib/labels';
import type { PlayerDiscoveryItem } from './PlayerDiscovery';

/** All observations use completed, eligible results; only compact copy reaches the client. */
export function playerDiscoveries(name: string, input: Match[], tournamentSlugs: Map<string, string>): PlayerDiscoveryItem[] {
  const matches = input.filter(eligibleMatch).sort(chronological);
  if (!matches.length) return [];
  const wins = matches.filter(match => winnerName(match) === name);
  const opponent = (match: Match) => match.player1.name === name ? match.player2.name : match.player1.name;
  const proofText = (match: Match) => `${tournamentName(match.tournament)} ${match.year} · ante ${opponent(match)} · ${scoreFor(match, name)}`;
  const search = (query: Record<string, string> = {}) => '/buscar?' + new URLSearchParams({ player: name, ...query });
  const items: PlayerDiscoveryItem[] = [];
  const comebacks = wins.filter(match => lostOpening(match, 2));
  if (comebacks.length) {
    const last = comebacks.at(-1)!;
    items.push({
      id: 'two-sets', title: 'Volver desde dos sets abajo', value: number(comebacks.length),
      unit: comebacks.length === 1 ? 'remontada' : 'remontadas',
      detail: `Victorias tras perder las dos primeras mangas. La más reciente: ${tournamentName(last.tournament)} ${last.year}, ante ${opponent(last)}.`,
      sample: `${number(matches.length)} partidos registrados · solo este archivo`,
      href: `/match/${last.match_id}`, linkLabel: 'Ver la última remontada', surface: last.surface,
    });
  }
  const seasons = new Map<number, Match[]>();
  for (const match of matches) seasons.set(match.year, [...(seasons.get(match.year) || []), match]);
  const bestSeason = [...seasons].map(([year, rows]) => ({ year, rows, won: rows.filter(match => winnerName(match) === name).length }))
    .sort((a, b) => b.won - a.won || b.year - a.year)[0];
  if (bestSeason.won) items.push({
    id: 'season', title: `Su mayor cosecha de victorias: ${bestSeason.year}`, value: number(bestSeason.won), unit: 'victorias',
    detail: `El máximo de victorias en una temporada dentro del archivo. Balance de ${number(bestSeason.won)}–${number(bestSeason.rows.length - bestSeason.won)}.`,
    sample: `${number(bestSeason.rows.length)} partidos en ${bestSeason.year} · ${number(seasons.size)} temporadas registradas`,
    href: search({ year: String(bestSeason.year) }), linkLabel: `Explorar ${bestSeason.year}`,
  });
  const surfaces = new Map<Match['surface'], Match[]>();
  for (const match of matches) if (match.surface !== 'unknown') surfaces.set(match.surface, [...(surfaces.get(match.surface) || []), match]);
  const bestSurface = [...surfaces].map(([surface, rows]) => ({ surface, rows, won: rows.filter(match => winnerName(match) === name).length }))
    .sort((a, b) => b.won - a.won || b.rows.length - a.rows.length)[0];
  if (bestSurface?.won) items.push({
    id: 'surface', title: `Más victorias en ${surfaceLabel[bestSurface.surface].toLowerCase()}`, value: number(bestSurface.won), unit: 'victorias',
    detail: 'La superficie que más victorias aporta a su registro.',
    sample: `${number(bestSurface.won)} de ${number(bestSurface.rows.length)} partidos · ${number(bestSurface.won / bestSurface.rows.length * 100, 1)} %${bestSurface.rows.length < 50 ? ' · muestra pequeña' : ''}`,
    href: search({ surface: bestSurface.surface }), linkLabel: 'Ver los partidos', surface: bestSurface.surface,
  });
  const finals = matches.filter(match => /^final$/i.test(match.round));
  const tournaments = new Map<string, Match[]>();
  for (const match of finals) tournaments.set(match.tournament, [...(tournaments.get(match.tournament) || []), match]);
  const bestTournament = [...tournaments].map(([tournament, rows]) => ({ tournament, rows, won: rows.filter(match => winnerName(match) === name).length }))
    .sort((a, b) => b.won - a.won || b.rows.length - a.rows.length)[0];
  if (bestTournament?.won) items.push({
    id: 'tournament', title: `Su torneo más ganado: ${tournamentName(bestTournament.tournament)}`, value: number(bestTournament.won), unit: bestTournament.won === 1 ? 'final ganada' : 'finales ganadas',
    detail: 'El campeonato con más finales ganadas entre sus resultados registrados.',
    sample: `${number(bestTournament.won)} de ${number(bestTournament.rows.length)} finales · solo este archivo`,
    href: search({ tournament: tournamentSlugs.get(bestTournament.tournament) || 'all' }), linkLabel: 'Explorar el campeonato', surface: bestTournament.rows[0].surface,
  });
  const longest = [...matches].sort((a, b) => gamesInMatch(b) - gamesInMatch(a))[0];
  if (gamesInMatch(longest) > 0) items.push({
    id: 'games', title: 'El partido con más juegos de su registro', value: number(gamesInMatch(longest)), unit: 'juegos',
    detail: proofText(longest), sample: `Mayor suma del marcador entre ${number(matches.length)} partidos registrados`,
    href: `/match/${longest.match_id}`, linkLabel: 'Abrir el partido', surface: longest.surface,
  });
  const timed = matches.flatMap(match => { const minutes = publishedMatchMinutes(match); return minutes === null ? [] : [{ match, minutes }]; }).sort((a, b) => b.minutes - a.minutes);
  if (timed.length) items.push({
    id: 'duration', title: 'Su partido más largo con duración publicada', value: durationLabel(timed[0].minutes), unit: '',
    detail: proofText(timed[0].match), sample: `Duración disponible en ${number(timed.length)} de ${number(matches.length)} partidos`,
    href: `/match/${timed[0].match.match_id}`, linkLabel: 'Abrir el partido', surface: timed[0].match.surface,
  });
  const aces = matches.flatMap(match => { const value = statNumber(matchStat(match, match.player1.name === name ? 1 : 2, 'Aces')); return value === null ? [] : [{ match, value }]; }).sort((a, b) => b.value - a.value);
  if (aces[0]?.value) items.push({
    id: 'aces', title: 'Su mayor número de aces en un partido', value: number(aces[0].value), unit: 'aces',
    detail: proofText(aces[0].match), sample: `Aces publicados en ${number(aces.length)} de ${number(matches.length)} partidos`,
    href: `/match/${aces[0].match.match_id}`, linkLabel: 'Abrir el partido', surface: aces[0].match.surface,
  });
  return items;
}
