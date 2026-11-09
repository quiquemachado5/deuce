import type { Match, Surface, Tour } from './types';
import type { PlayerRecord } from './season-analytics';
import { archiveSummary, gamesInMatch, isDeciding, lostOpening, tiebreakCount } from './archive-insights';
import { chronological, roundPosition, winnerName } from './editorial';
import { playerIdentity } from './explore';
import { eligibleMatch, normalizeText } from './quality';
import { publishedMatchMinutes } from './duration';
import { tournamentDirectory } from './tournament-directory';

export const ARCHIVE_PRODUCTS_SCHEMA = 1;
export const DEUCE_ELO_MODEL_VERSION = '1.2.0';

export type EditionTacticalMetric = { value: number; sample: number };
export type EditionTacticalProfile = {
  acesPerMatch?: EditionTacticalMetric;
  holdRate?: EditionTacticalMetric;
  breakRate?: EditionTacticalMetric;
  firstServeWon?: EditionTacticalMetric;
  secondServeWon?: EditionTacticalMetric;
  returnPointsWon?: EditionTacticalMetric;
  longRallyShare?: EditionTacticalMetric;
};

export type EditionProduct = {
  key: string;
  tour: Tour;
  slug: string;
  tournament: string;
  category: string;
  year: number;
  matchIds: string[];
  measured: number;
  statistics: number;
  points: number;
  players: number;
  rounds: number;
  sets: number;
  games: number;
  deciding: number;
  comebacks: number;
  tiebreakMatches: number;
  tiebreaks: number;
  straightSets: number;
  bagels: number;
  averageMinutes: number | null;
  champion: string | null;
  championMatchIds: string[];
  championSetsLost: number;
  championGameBalance: number;
  closestMatchId?: string;
  longestMatchId?: string;
  widestMatchId?: string;
  longestTimedMatchId?: string;
  tactical?: EditionTacticalProfile;
  observations: Array<{ key: string; value: number; sample: number; numerator?: number; denominator?: number; matchId?: string }>;
};

export type EditionProducts = { schema: number; editions: Record<string, EditionProduct> };

export type PlayerDirectoryProducts = {
  schema: number;
  circuits: Record<Tour, {
    records: PlayerRecord[];
    byName: string[];
    byWins: string[];
    byRelevance: string[];
  }>;
};

export type SearchProducts = {
  schema: number;
  players: Array<{ name: string; tour: Tour; search: string; played: number }>;
  tournaments: Array<{ name: string; slug: string; tour: Tour; search: string; years: number[]; matches: number }>;
  indexedMatches?: Record<string, {
    id: string;
    tour: Tour;
    players: [string, string];
    tournament: string;
    year: number;
    round: string;
    score: string;
  }>;
  recentMatchIdsByPlayer?: Record<string, string[]>;
  recentMatchIdsByTournament?: Record<string, string[]>;
};

export type EloYear = [year: number, rating: number, matches: number];
export type EloPlayer = {
  name: string;
  tour: Tour;
  rating: number;
  matches: number;
  peak: number;
  peakYear: number;
  surfaces: Record<Surface, number>;
  years: EloYear[];
  expectedWins?: number;
  winsAboveExpected?: number;
  averageOpponentRating?: number;
};
export type EloCalibration = {
  matches: number;
  hitRate: number;
  brier: number;
  logLoss: number;
};
export type EloProducts = {
  schema: number;
  method: string;
  modelVersion?: string;
  configuration?: {
    baseRating: number;
    scale: number;
    initialK: number;
    minimumK: number;
    experienceStep: number;
    categoryWeight: { grandSlam: number; masters1000: number; other: number };
  };
  calibration?: { all: EloCalibration; atp: EloCalibration; wta: EloCalibration };
  surfaceCalibration?: Record<Surface, { all: EloCalibration; atp: EloCalibration; wta: EloCalibration }>;
  players: Record<string, EloPlayer>;
};

export type TimeMachineItem = {
  id: string;
  date: string;
  tour: Tour;
  year: number;
  tournament: string;
  category: string;
  round: string;
  surface: Surface;
  players: [string, string];
  winner: string;
  score: string;
};
export type TimeMachineProducts = { schema: number; days: Record<string, TimeMachineItem[]> };

export type ArchiveProducts = {
  editions: EditionProducts;
  players: PlayerDirectoryProducts;
  search: SearchProducts;
  elo: EloProducts;
  timeMachine: TimeMachineProducts;
};

export function editionProductKey(tour: Tour, slug: string, year: number, category: string) {
  return `${tour}|${slug}|${year}|${normalizeText(category)}`;
}

function winningMargin(match: Match) {
  if (!match.winner) return 0;
  return match.score_summary.games.reduce((margin, set) => margin + set[match.winner! - 1] - set[2 - match.winner!], 0);
}

const statNumber = (match: Match, side: 1 | 2, names: string[]) => {
  const lookup = new Set(names.map(name => name.toLowerCase()));
  const stat = match.statistics.find(row => row.player === side && row.period === 'match' && lookup.has(row.name.toLowerCase()));
  if (!stat) return null;
  if (stat.won !== null) return stat.won;
  const value = Number.parseFloat(stat.value.replace(',', '.').replace('%', ''));
  return Number.isFinite(value) ? value : null;
};

const rateParts = (match: Match, side: 1 | 2, numeratorNames: string[], denominatorNames: string[] = []) => {
  const lookup = new Set(numeratorNames.map(name => name.toLowerCase()));
  const stat = match.statistics.find(row => row.player === side && row.period === 'match' && lookup.has(row.name.toLowerCase()));
  if (stat && stat.won !== null && stat.total !== null && stat.total > 0) return [stat.won, stat.total] as const;
  const won = statNumber(match, side, numeratorNames);
  const total = statNumber(match, side, denominatorNames);
  return won !== null && total !== null && total > 0 && won <= total ? [won, total] as const : null;
};

export function editionTacticalProfile(matches: Match[]): EditionTacticalProfile {
  const measured = matches.filter(eligibleMatch);
  const rate = (numerators: string[], denominators: string[] = []): EditionTacticalMetric | undefined => {
    let won = 0, total = 0, sample = 0;
    for (const match of measured) {
      let documented = false;
      for (const side of [1, 2] as const) {
        const parts = rateParts(match, side, numerators, denominators);
        if (!parts) continue;
        won += parts[0]; total += parts[1]; documented = true;
      }
      if (documented) sample++;
    }
    return total ? { value: rounded(won / total * 100), sample } : undefined;
  };

  let aces = 0, aceMatches = 0;
  for (const match of measured) {
    const values = ([1, 2] as const).map(side => statNumber(match, side, ['Aces', 'Saques directos']));
    if (values.every(value => value !== null)) {
      aces += values[0]! + values[1]!;
      aceMatches++;
    }
  }

  const rallies = measured
    .filter(match => match.quality?.tape === 'reliable')
    .flatMap(match => match.point_tape.filter(point => point.winner && point.rally_length !== null && point.rally_length > 0));
  const rallyMatches = new Set(measured.filter(match => match.quality?.tape === 'reliable' && match.point_tape.some(point => point.rally_length !== null)).map(match => match.match_id)).size;

  return {
    ...(aceMatches ? { acesPerMatch: { value: rounded(aces / aceMatches), sample: aceMatches } } : {}),
    ...(rate(['Service games won', 'Service Games Won'], ['Service games played']) ? { holdRate: rate(['Service games won', 'Service Games Won'], ['Service games played'])! } : {}),
    ...(rate(['Break points converted', 'Break Points Won']) ? { breakRate: rate(['Break points converted', 'Break Points Won'])! } : {}),
    ...(rate(['1st serve points won', '1st Serve Points Won']) ? { firstServeWon: rate(['1st serve points won', '1st Serve Points Won'])! } : {}),
    ...(rate(['2nd serve points won', '2nd Serve Points Won']) ? { secondServeWon: rate(['2nd serve points won', '2nd Serve Points Won'])! } : {}),
    ...(rate(['Return points won'], ['Return points played']) ? { returnPointsWon: rate(['Return points won'], ['Return points played'])! } : {}),
    ...(rallies.length ? { longRallyShare: { value: rounded(rallies.filter(point => point.rally_length! >= 9).length / rallies.length * 100), sample: rallyMatches } } : {}),
  };
}

export function buildEditionProducts(matches: Match[]): EditionProducts {
  const editions: Record<string, EditionProduct> = {};
  for (const tournament of tournamentDirectory(matches)) {
    const groups = new Map<string, Match[]>();
    for (const match of tournament.matches) {
      const tour = match.tour || 'atp';
      const key = editionProductKey(tour, tournament.slug, match.year, match.category);
      groups.set(key, [...(groups.get(key) || []), match]);
    }
    for (const [key, rows] of groups) {
      const measured = rows.filter(eligibleMatch);
      const timed = measured.filter(match => publishedMatchMinutes(match) !== null)
        .sort((a, b) => publishedMatchMinutes(b)! - publishedMatchMinutes(a)!);
      const final = rows.find(match => roundPosition(match.round) === 7);
      const champion = final ? winnerName(final) : null;
      const championMatches = champion ? measured.filter(match => match.player1.name === champion || match.player2.name === champion) : [];
      const closest = [...measured].sort((a, b) => {
        const spread = (match: Match) => Math.abs(winningMargin(match));
        return spread(a) - spread(b) || gamesInMatch(b) - gamesInMatch(a);
      })[0];
      const longest = [...measured].sort((a, b) => gamesInMatch(b) - gamesInMatch(a))[0];
      const widest = [...measured].sort((a, b) => winningMargin(b) - winningMargin(a))[0];
      const summary = archiveSummary(measured);
      const tactical = editionTacticalProfile(measured);
      const tour = (rows[0].tour || 'atp') as Tour;
      const totalSets = measured.reduce((total, match) => total + match.score_summary.games.length, 0);
      editions[key] = {
        key, tour, slug: tournament.slug, tournament: tournament.name, category: rows[0].category, year: rows[0].year,
        matchIds: rows.map(match => match.match_id), measured: measured.length,
        statistics: measured.filter(match => match.statistics.length > 0).length,
        points: measured.filter(match => match.point_tape.length > 0).length,
        players: new Set(measured.flatMap(match => [match.player1.name, match.player2.name])).size,
        rounds: new Set(rows.map(match => roundPosition(match.round)).filter(Boolean)).size,
        sets: totalSets, games: measured.reduce((total, match) => total + gamesInMatch(match), 0),
        deciding: measured.filter(isDeciding).length,
        comebacks: measured.filter(match => lostOpening(match)).length,
        tiebreakMatches: measured.filter(match => tiebreakCount(match) > 0).length,
        tiebreaks: measured.reduce((total, match) => total + tiebreakCount(match), 0),
        straightSets: measured.filter(match => match.winner && match.score_summary.games.every(set => set[match.winner! - 1] > set[2 - match.winner!])).length,
        bagels: measured.filter(match => match.score_summary.games.some(set => Math.max(...set) === 6 && Math.min(...set) === 0)).length,
        averageMinutes: timed.length ? Math.round(timed.reduce((sum, match) => sum + publishedMatchMinutes(match)!, 0) / timed.length) : null,
        champion,
        championMatchIds: championMatches.map(match => match.match_id),
        championSetsLost: championMatches.reduce((total, match) => {
          const side = match.player1.name === champion ? 0 : 1;
          return total + match.score_summary.games.filter(set => set[side] < set[1 - side]).length;
        }, 0),
        championGameBalance: championMatches.reduce((balance, match) => {
          const side = match.player1.name === champion ? 0 : 1;
          return balance + match.score_summary.games.reduce((sum, set) => sum + set[side] - set[1 - side], 0);
        }, 0),
        closestMatchId: closest?.match_id,
        longestMatchId: longest?.match_id,
        widestMatchId: widest?.match_id,
        longestTimedMatchId: timed[0]?.match_id,
        tactical: Object.keys(tactical).length ? tactical : undefined,
        observations: summary.observations.map(({ metric, value, sample, numerator, denominator, matchId }) => ({ key: metric.key, value, sample, numerator, denominator, matchId })),
      };
    }
  }
  return { schema: ARCHIVE_PRODUCTS_SCHEMA, editions };
}

export function buildPlayerDirectoryProducts(records: PlayerRecord[]): PlayerDirectoryProducts {
  const circuits = {} as PlayerDirectoryProducts['circuits'];
  for (const tour of ['atp', 'wta'] as const) {
    const selected = records.filter(record => (record.tour || 'atp') === tour);
    const relevance = [...selected].sort((a, b) => b.grandSlamFinalsWon - a.grandSlamFinalsWon || b.wins - a.wins || b.played - a.played || a.name.localeCompare(b.name, 'es'));
    circuits[tour] = {
      records: relevance,
      byRelevance: relevance.map(record => record.name),
      byName: [...selected].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(record => record.name),
      byWins: [...selected].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name, 'es')).map(record => record.name),
    };
  }
  return { schema: ARCHIVE_PRODUCTS_SCHEMA, circuits };
}

export function buildSearchProducts(matches: Match[], records: PlayerRecord[]): SearchProducts {
  const directory = tournamentDirectory(matches);
  const tournaments = directory.flatMap(entry => (['atp', 'wta'] as const).flatMap(tour => {
    const rows = entry.matches.filter(match => (match.tour || 'atp') === tour);
    return rows.length ? [{ name: entry.name, slug: entry.slug, tour, search: normalizeText(entry.name), years: [...new Set(rows.map(row => row.year))].sort((a, b) => b - a), matches: rows.length }] : [];
  }));
  const slugs = new Map(directory.map(entry => [entry.name, entry.slug]));
  const indexedMatches: NonNullable<SearchProducts['indexedMatches']> = {};
  const recentMatchIdsByPlayer: NonNullable<SearchProducts['recentMatchIdsByPlayer']> = {};
  const recentMatchIdsByTournament: NonNullable<SearchProducts['recentMatchIdsByTournament']> = {};
  for (const match of [...matches].filter(eligibleMatch).sort((a, b) => b.score_summary.timestamp.localeCompare(a.score_summary.timestamp))) {
    const tour = match.tour || 'atp';
    const playerKeys = [playerIdentity(match.player1.name, tour), playerIdentity(match.player2.name, tour)];
    const tournamentKey = `${tour}|${slugs.get(match.tournament) || normalizeText(match.tournament).replace(/\s+/g, '-')}`;
    let referenced = false;
    for (const playerKey of playerKeys) {
      const ids = recentMatchIdsByPlayer[playerKey] ||= [];
      if (ids.length < 3) { ids.push(match.match_id); referenced = true; }
    }
    const tournamentIds = recentMatchIdsByTournament[tournamentKey] ||= [];
    if (tournamentIds.length < 6) { tournamentIds.push(match.match_id); referenced = true; }
    if (referenced) indexedMatches[match.match_id] = {
      id: match.match_id,
      tour,
      players: [match.player1.name, match.player2.name],
      tournament: match.tournament,
      year: match.year,
      round: match.round,
      score: match.final_score,
    };
  }
  return {
    schema: ARCHIVE_PRODUCTS_SCHEMA,
    players: records.map(record => ({ name: record.name, tour: record.tour || 'atp', search: normalizeText(record.name), played: record.played })),
    tournaments,
    indexedMatches,
    recentMatchIdsByPlayer,
    recentMatchIdsByTournament,
  };
}

type EloState = { name: string; rating: number; matches: number; peak: number; peakYear: number; surfaces: Record<Surface, number>; years: EloYear[]; wins: number; expectedWins: number; opponentRatingSum: number };
type EloCalibrationState = { matches: number; hits: number; brier: number; logLoss: number };
const startingSurfaces = (): Record<Surface, number> => ({ hard: 1500, clay: 1500, grass: 1500, carpet: 1500, unknown: 1500 });
const rounded = (value: number) => Math.round(value * 10) / 10;
const roundedCalibration = (value: number) => Math.round(value * 10_000) / 10_000;
const emptyCalibration = (): EloCalibrationState => ({ matches: 0, hits: 0, brier: 0, logLoss: 0 });
const recordCalibration = (state: EloCalibrationState, probability: number, outcome: number) => {
  const bounded = Math.min(.999_999, Math.max(.000_001, probability));
  state.matches++;
  state.hits += bounded === .5 ? .5 : (bounded > .5) === Boolean(outcome) ? 1 : 0;
  state.brier += (bounded - outcome) ** 2;
  state.logLoss += -(outcome * Math.log(bounded) + (1 - outcome) * Math.log(1 - bounded));
};
const summarizeCalibration = (state: EloCalibrationState): EloCalibration => ({
  matches: state.matches,
  hitRate: state.matches ? roundedCalibration(state.hits / state.matches) : 0,
  brier: state.matches ? roundedCalibration(state.brier / state.matches) : 0,
  logLoss: state.matches ? roundedCalibration(state.logLoss / state.matches) : 0,
});

export function buildEloProducts(matches: Match[]): EloProducts {
  const players = new Map<string, EloState & { tour: Tour; lastYear: number }>();
  const calibration = { all: emptyCalibration(), atp: emptyCalibration(), wta: emptyCalibration() };
  const surfaceCalibration = Object.fromEntries(Object.keys(startingSurfaces()).map(surface => [surface, {
    all: emptyCalibration(), atp: emptyCalibration(), wta: emptyCalibration(),
  }])) as Record<Surface, { all: EloCalibrationState; atp: EloCalibrationState; wta: EloCalibrationState }>;
  const get = (name: string, tour: Tour, year: number) => {
    const key = playerIdentity(name, tour);
    const saved = players.get(key) || { name, tour, rating: 1500, matches: 0, peak: 1500, peakYear: year, surfaces: startingSurfaces(), years: [], lastYear: year, wins: 0, expectedWins: 0, opponentRatingSum: 0 };
    players.set(key, saved);
    return saved;
  };
  const snapshot = (state: EloState & { lastYear: number }, year: number) => {
    const previous = state.years.at(-1);
    if (previous?.[0] === year) {
      previous[1] = rounded(state.rating);
      previous[2] = state.matches;
    }
    else state.years.push([year, rounded(state.rating), state.matches]);
    state.lastYear = year;
  };
  for (const match of [...matches].filter(eligibleMatch).sort(chronological)) {
    if (!match.winner) continue;
    const tour = match.tour || 'atp';
    const first = get(match.player1.name, tour, match.year), second = get(match.player2.name, tour, match.year);
    const expectedFirst = 1 / (1 + 10 ** ((second.rating - first.rating) / 400));
    const scoreFirst = match.winner === 1 ? 1 : 0;
    first.expectedWins += expectedFirst;
    second.expectedWins += 1 - expectedFirst;
    first.wins += scoreFirst;
    second.wins += 1 - scoreFirst;
    first.opponentRatingSum += second.rating;
    second.opponentRatingSum += first.rating;
    const surface = match.surface;
    const expectedSurface = 1 / (1 + 10 ** ((second.surfaces[surface] - first.surfaces[surface]) / 400));
    for (const bucket of [calibration.all, calibration[tour]]) recordCalibration(bucket, expectedFirst, scoreFirst);
    for (const bucket of [surfaceCalibration[surface].all, surfaceCalibration[surface][tour]]) recordCalibration(bucket, expectedSurface, scoreFirst);
    const importance = match.category === 'Grand Slam' ? 1.2 : /1000/.test(match.category) ? 1.1 : 1;
    const k = Math.max(16, 32 - Math.floor(Math.min(first.matches, second.matches) / 40)) * importance;
    first.rating += k * (scoreFirst - expectedFirst);
    second.rating += k * ((1 - scoreFirst) - (1 - expectedFirst));
    first.surfaces[surface] += k * (scoreFirst - expectedSurface);
    second.surfaces[surface] += k * ((1 - scoreFirst) - (1 - expectedSurface));
    first.matches++; second.matches++;
    for (const state of [first, second]) {
      if (state.rating > state.peak) { state.peak = state.rating; state.peakYear = match.year; }
      snapshot(state, match.year);
    }
  }
  return {
    schema: ARCHIVE_PRODUCTS_SCHEMA,
    modelVersion: DEUCE_ELO_MODEL_VERSION,
    configuration: { baseRating: 1500, scale: 400, initialK: 32, minimumK: 16, experienceStep: 40, categoryWeight: { grandSlam: 1.2, masters1000: 1.1, other: 1 } },
    calibration: { all: summarizeCalibration(calibration.all), atp: summarizeCalibration(calibration.atp), wta: summarizeCalibration(calibration.wta) },
    surfaceCalibration: Object.fromEntries(Object.entries(surfaceCalibration).map(([surface, result]) => [surface, {
      all: summarizeCalibration(result.all), atp: summarizeCalibration(result.atp), wta: summarizeCalibration(result.wta),
    }])) as EloProducts['surfaceCalibration'],
    method: 'Elo DEUCE: base 1500, actualización cronológica, K decreciente por experiencia y ajuste de importancia por categoría. No es el ranking oficial ATP/WTA.',
    players: Object.fromEntries([...players].map(([key, state]) => [key, {
      name: state.name, tour: state.tour, rating: rounded(state.rating), matches: state.matches,
      peak: rounded(state.peak), peakYear: state.peakYear,
      surfaces: Object.fromEntries(Object.entries(state.surfaces).map(([surface, value]) => [surface, rounded(value)])) as Record<Surface, number>,
      years: state.years,
      expectedWins: rounded(state.expectedWins),
      winsAboveExpected: rounded(state.wins - state.expectedWins),
      averageOpponentRating: state.matches ? rounded(state.opponentRatingSum / state.matches) : undefined,
    }])),
  };
}

export function buildTimeMachineProducts(matches: Match[]): TimeMachineProducts {
  const candidates: Record<string, Array<{ item: TimeMachineItem; priority: number }>> = {};
  const score = (match: Match) => roundPosition(match.round) * 100 + (match.category === 'Grand Slam' ? 90 : /1000/.test(match.category) ? 50 : /500/.test(match.category) ? 25 : 10);
  for (const match of matches.filter(eligibleMatch)) {
    const date = match.context?.dateLabel === 'Fecha del partido' ? match.context.date?.slice(0, 10) : null;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !match.winner) continue;
    const day = date.slice(5), winner = winnerName(match);
    if (!winner) continue;
    const item: TimeMachineItem = {
      id: match.match_id, date, tour: match.tour || 'atp', year: match.year, tournament: match.tournament,
      category: match.category, round: match.round, surface: match.surface,
      players: [match.player1.name, match.player2.name], winner, score: match.final_score,
    };
    (candidates[day] ||= []).push({ item, priority: score(match) });
  }
  const days = Object.fromEntries(Object.entries(candidates).map(([day, rows]) => [day,
    rows.sort((a, b) => b.priority - a.priority || b.item.date.localeCompare(a.item.date)).slice(0, 24).map(row => row.item),
  ]));
  return { schema: ARCHIVE_PRODUCTS_SCHEMA, days };
}

export function buildArchiveProducts(matches: Match[], records: PlayerRecord[]): ArchiveProducts {
  return {
    editions: buildEditionProducts(matches),
    players: buildPlayerDirectoryProducts(records),
    search: buildSearchProducts(matches, records),
    elo: buildEloProducts(matches),
    timeMachine: buildTimeMachineProducts(matches),
  };
}

export function eloPlayer(products: EloProducts, name: string, tour: Tour) {
  return products.players[playerIdentity(name, tour)];
}
