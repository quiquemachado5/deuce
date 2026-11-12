import { chronological, roundPosition } from './editorial';
import { browserCategory, browserRound } from './match-browser';
import { tournamentName } from './labels';
import { normalizeText } from './quality';
import { canonicalSearchText, searchTermsMatch } from './search-text';
import { matchSearchIntent } from './search-intent';
import { tournamentDirectory } from './tournament-directory';
import { matchTypeFromScore } from './match-presentation';
import { sentence } from './cuaderno/model';
import { playerIdentity } from './explore';
import matchBrowserContract from './match-browser-contract.json';
import type { Match, Surface, Tour } from './types';

export const MATCH_BROWSER_SCHEMA = matchBrowserContract.schema;
export const MATCH_BROWSER_ROW_LENGTH = matchBrowserContract.rowLength;
export const MATCH_BROWSER_DICTIONARIES = matchBrowserContract.dictionaries;

type Dictionaries = {
  players: string[];
  tournaments: string[];
  categories: string[];
  rounds: string[];
  statuses: string[];
  dateLabels: string[];
  formats: string[];
  rankLabels: string[];
  resultSources: string[];
  metadataSources: string[];
  dataSources: string[];
  coverages: string[];
  qualityResults: string[];
  qualityReasons: string[];
  tapeIssues: string[];
  tapeStates: string[];
  highlights: string[];
};

// A tuple keeps repeated JSON field names out of the published navigation rows.
// Full statistics and point tapes remain in the immutable match snapshot and
// are opened only by detail/analytics routes.
export type MatchBrowserRow = [
  id: string,
  year: number,
  tournament: number,
  category: number,
  surface: number,
  round: number,
  player1: number,
  seed1: number | null,
  player2: number,
  seed2: number | null,
  winner: number,
  status: number,
  date: string,
  dateLabel: number,
  format: number,
  indoor: number,
  age1: number | null,
  age2: number | null,
  timestamp: string,
  finalScore: string,
  games: number[][],
  capabilities: number,
  rank1: number | null,
  rank2: number | null,
  rankLabel: number,
  minutes: number | null,
  endDate: string,
  resultSource: number,
  metadataSources: number,
  dataSource: number,
  coverage: number,
  qualityResult: number,
  qualityReason: number,
  tapeIssue: number,
  tapeState: number,
  editorialHighlight: number,
  sets: number[],
  points: string[],
  server: number,
  isTiebreak: number,
  winProbabilityP1: number | null,
  originalCategory: number,
  originalRound: number,
];

export type MatchBrowserPartition = {
  schema: number;
  id: string;
  tour: Tour;
  fromYear: number;
  toYear: number;
  count: number;
  dictionaries: Dictionaries;
  search?: Pick<Dictionaries, 'players' | 'tournaments' | 'categories' | 'rounds'>;
  rows: MatchBrowserRow[];
};

export type MatchBrowserEvent = {
  name: string;
  search?: string;
  slug: string;
  years: number[];
  count: number;
};

export type MatchBrowserCircuit = {
  years: number[];
  surfaces: Surface[];
  categories: string[];
  rounds: string[];
  events: MatchBrowserEvent[];
  players: Array<{ name: string; played: number; search?: string }>;
  capabilities: { statistics: boolean; points: boolean; fiveSets: boolean };
};

export type MatchBrowserIndex = {
  schema: number;
  count: number;
  partitions: Array<Pick<MatchBrowserPartition, 'id' | 'tour' | 'fromYear' | 'toYear' | 'count'>>;
  circuits: Record<Tour, MatchBrowserCircuit>;
};

const surfaces: Surface[] = ['hard', 'clay', 'grass', 'carpet', 'unknown'];
const surfaceIndex = new Map(surfaces.map((surface, index) => [surface, index]));

function dictionary() {
  const values: string[] = [], indexes = new Map<string, number>();
  return {
    values,
    add(value: string | null | undefined) {
      if (!value) return -1;
      const saved = indexes.get(value);
      if (saved !== undefined) return saved;
      const index = values.length;
      values.push(value);
      indexes.set(value, index);
      return index;
    },
  };
}

function createPartition(id: string, tour: Tour, fromYear: number, rows: Match[]): MatchBrowserPartition {
  const players = dictionary(), tournaments = dictionary(), categories = dictionary(), rounds = dictionary();
  const statuses = dictionary(), dateLabels = dictionary(), formats = dictionary();
  const rankLabels = dictionary(), resultSources = dictionary(), metadataSources = dictionary();
  const dataSources = dictionary(), coverages = dictionary(), qualityResults = dictionary();
  const qualityReasons = dictionary(), tapeIssues = dictionary(), tapeStates = dictionary(), highlights = dictionary();
  const encoded = [...rows].sort((a, b) => chronological(b, a)).map((match): MatchBrowserRow => [
    match.match_id,
    match.year,
    tournaments.add(match.tournament),
    categories.add(browserCategory(match) || ''),
    surfaceIndex.get(match.surface) ?? surfaceIndex.get('unknown')!,
    rounds.add(browserRound(match)),
    players.add(match.player1.name),
    match.player1.seed,
    players.add(match.player2.name),
    match.player2.seed,
    match.winner || 0,
    statuses.add(match.status),
    match.context?.date?.slice(0, 10) || '',
    dateLabels.add(match.context?.dateLabel),
    formats.add(match.context?.format),
    match.context?.indoor === true ? 1 : match.context?.indoor === false ? 0 : -1,
    match.context?.age1 ?? null,
    match.context?.age2 ?? null,
    match.score_summary.timestamp,
    match.final_score,
    match.score_summary.games,
    (match.statistics.length ? 1 : 0) | (match.point_tape.length ? 2 : 0),
    match.context?.rank1 ?? null,
    match.context?.rank2 ?? null,
    rankLabels.add(match.context?.rankLabel),
    match.context?.minutes ?? null,
    match.context?.endDate || '',
    resultSources.add(match.context?.resultSource),
    metadataSources.add(match.context?.metadataSources?.length ? JSON.stringify(match.context.metadataSources) : undefined),
    dataSources.add(match.data_source),
    coverages.add(match.coverage),
    qualityResults.add(match.quality?.result),
    qualityReasons.add(match.quality?.reason),
    tapeIssues.add(match.quality?.tapeIssue),
    tapeStates.add(match.quality?.tape),
    highlights.add(sentence(match)),
    match.score_summary.sets,
    match.score_summary.points,
    match.score_summary.server ?? 0,
    match.score_summary.is_tiebreak ? 1 : 0,
    match.score_summary.win_probability_p1,
    categories.add(match.category),
    rounds.add(match.round),
  ]);
  return {
    schema: MATCH_BROWSER_SCHEMA,
    id,
    tour,
    fromYear,
    toYear: fromYear + 9,
    count: encoded.length,
    dictionaries: {
      players: players.values,
      tournaments: tournaments.values,
      categories: categories.values,
      rounds: rounds.values,
      statuses: statuses.values,
      dateLabels: dateLabels.values,
      formats: formats.values,
      rankLabels: rankLabels.values,
      resultSources: resultSources.values,
      metadataSources: metadataSources.values,
      dataSources: dataSources.values,
      coverages: coverages.values,
      qualityResults: qualityResults.values,
      qualityReasons: qualityReasons.values,
      tapeIssues: tapeIssues.values,
      tapeStates: tapeStates.values,
      highlights: highlights.values,
    },
    search: {
      players: players.values.map(canonicalSearchText),
      tournaments: tournaments.values.map(name => canonicalSearchText(`${name} ${tournamentName(name)}`)),
      categories: categories.values.map(canonicalSearchText),
      rounds: rounds.values.map(canonicalSearchText),
    },
    rows: encoded,
  };
}

function circuitIndex(matches: Match[], tour: Tour): MatchBrowserCircuit {
  const rows = matches.filter(match => (match.tour || 'atp') === tour);
  const players = new Map<string, { name: string; played: number; search: string }>();
  for (const match of rows) for (const name of [match.player1.name, match.player2.name]) {
    const identity = playerIdentity(name, tour);
    const player = players.get(identity);
    if (player) player.played++;
    else players.set(identity, { name, played: 1, search: canonicalSearchText(name) });
  }
  return {
    years: [...new Set(rows.map(match => match.year))].sort((a, b) => b - a),
    surfaces: surfaces.filter(surface => rows.some(match => match.surface === surface)),
    categories: [...new Set(rows.map(browserCategory).filter((value): value is string => Boolean(value)))],
    rounds: [...new Set(rows.map(browserRound).filter(Boolean))],
    events: tournamentDirectory(rows).map(event => ({
      name: event.name,
      search: canonicalSearchText(`${event.name} ${tournamentName(event.name)}`),
      slug: event.slug,
      years: [...new Set(event.matches.map(match => match.year))].sort((a, b) => b - a),
      count: event.matches.length,
    })),
    players: [...players.values()].sort((a, b) => b.played - a.played || a.name.localeCompare(b.name, 'es')),
    capabilities: {
      statistics: rows.some(match => match.statistics.length > 0),
      points: rows.some(match => match.point_tape.length > 0),
      fiveSets: rows.some(match => match.score_summary.games.length === 5),
    },
  };
}

export function compileMatchBrowser(matches: Match[]) {
  const groups = new Map<string, { tour: Tour; fromYear: number; matches: Match[] }>();
  for (const match of matches) {
    const tour = match.tour === 'wta' ? 'wta' : 'atp';
    const fromYear = Math.floor(match.year / 10) * 10;
    const id = `matches-${tour}-${fromYear}s`;
    const group = groups.get(id) || { tour, fromYear, matches: [] };
    group.matches.push(match);
    groups.set(id, group);
  }
  const partitions = [...groups].map(([id, group]) => createPartition(id, group.tour, group.fromYear, group.matches))
    .sort((a, b) => b.fromYear - a.fromYear || a.tour.localeCompare(b.tour));
  const index: MatchBrowserIndex = {
    schema: MATCH_BROWSER_SCHEMA,
    count: matches.length,
    partitions: partitions.map(({ id, tour, fromYear, toYear, count }) => ({ id, tour, fromYear, toYear, count })),
    circuits: { atp: circuitIndex(matches, 'atp'), wta: circuitIndex(matches, 'wta') },
  };
  return { index, partitions };
}

export const matchBrowserArtifact = (id: string) => `browser-${id}`;

/** A detail shard is valid only when it covers the exact compact ID set. */
export function browserPartitionMatchesDetails(partition: MatchBrowserPartition, matches: readonly Match[]) {
  if (partition.rows.length !== matches.length) return false;
  const ids=new Set(partition.rows.map(row=>row[0]));
  return ids.size===matches.length&&matches.every(match=>ids.has(match.match_id));
}

function value(values: string[], index: number) { return index >= 0 ? values[index] || '' : ''; }

function metadataSourceList(values: string[], index: number): NonNullable<NonNullable<Match['context']>['metadataSources']> | undefined {
  const stored = value(values, index);
  if (!stored) return undefined;
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object'
      && typeof (item as { field?: unknown }).field === 'string'
      && typeof (item as { url?: unknown }).url === 'string')
      ? parsed as NonNullable<NonNullable<Match['context']>['metadataSources']>
      : undefined;
  } catch { return undefined; }
}

export function decodeMatchBrowserRow(partition: MatchBrowserPartition, row: MatchBrowserRow): Match {
  const d = partition.dictionaries;
  const games = row[20];
  const metadataSources = metadataSourceList(d.metadataSources, row[28]);
  const qualityResult = value(d.qualityResults, row[31]);
  const qualityTape = value(d.tapeStates, row[34]);
  const context = {
    ...(row[12] ? { date: row[12] } : {}),
    ...(value(d.dateLabels, row[13]) ? { dateLabel: value(d.dateLabels, row[13]) } : {}),
    ...(value(d.formats, row[14]) ? { format: value(d.formats, row[14]) } : {}),
    ...(row[15] >= 0 ? { indoor: row[15] === 1 } : {}),
    ...(row[16] !== null ? { age1: row[16] } : {}),
    ...(row[17] !== null ? { age2: row[17] } : {}),
    ...(row[22] !== null ? { rank1: row[22] } : {}),
    ...(row[23] !== null ? { rank2: row[23] } : {}),
    ...(value(d.rankLabels, row[24]) ? { rankLabel: value(d.rankLabels, row[24]) } : {}),
    ...(row[25] !== null ? { minutes: row[25] } : {}),
    ...(row[26] ? { endDate: row[26] } : {}),
    ...(value(d.resultSources, row[27]) ? { resultSource: value(d.resultSources, row[27]) } : {}),
    ...(metadataSources ? { metadataSources } : {}),
  };
  return {
    match_id: row[0],
    tour: partition.tour,
    year: row[1],
    tournament: value(d.tournaments, row[2]),
    category: value(d.categories, row[41]) || value(d.categories, row[3]),
    surface: surfaces[row[4]] || 'unknown',
    round: value(d.rounds, row[42]) || value(d.rounds, row[5]),
    player1: { name: value(d.players, row[6]), seed: row[7] },
    player2: { name: value(d.players, row[8]), seed: row[9] },
    winner: row[10] === 1 || row[10] === 2 ? row[10] : null,
    status: value(d.statuses, row[11]),
    context,
    score_summary: {
      sets: row[36],
      games,
      points: row[37],
      server: row[38] === 1 || row[38] === 2 ? row[38] : null,
      is_tiebreak: row[39] === 1,
      win_probability_p1: row[40],
      timestamp: row[18],
    },
    final_score: row[19],
    point_tape: [],
    statistics: [],
    listingCapabilities: { statistics: Boolean(row[21] & 1), points: Boolean(row[21] & 2) },
    data_source: (value(d.dataSources, row[29]) || 'reference') as Match['data_source'],
    ...(value(d.coverages, row[30]) ? { coverage: value(d.coverages, row[30]) } : {}),
    ...(qualityResult === 'consistent' || qualityResult === 'review' ? { quality: {
      result: qualityResult,
      ...(value(d.qualityReasons, row[32]) ? { reason: value(d.qualityReasons, row[32]) } : {}),
      ...(value(d.tapeIssues, row[33]) ? { tapeIssue: value(d.tapeIssues, row[33]) } : {}),
      ...(qualityTape === 'none' || qualityTape === 'partial' || qualityTape === 'reliable' ? { tape: qualityTape } : {}),
    } } : {}),
    editorial_highlight: value(d.highlights, row[35]),
  };
}

export function matchHasStatistics(match: Match) {
  return match.listingCapabilities?.statistics ?? match.statistics.length > 0;
}

export function matchHasPoints(match: Match) {
  return match.listingCapabilities?.points ?? match.point_tape.length > 0;
}

export type BrowserFilter = {
  q?: string;
  player?: string;
  year?: number | null;
  fromYear?: number;
  toYear?: number;
  surface?: string;
  tournament?: string;
  category?: string;
  round?: string;
  age?: number;
  fiveSets?: boolean;
  data?: 'measures' | 'points';
  kind?: string;
};

export type BrowserEdition = { key: string; hrefName: string; totalMatches: number; matches: Match[] };
export type MatchBrowserResult = {
  total: number;
  matchDates: string[];
  editionYears: number[];
  dailyMatches: Match[];
  editions: BrowserEdition[];
};

type RowRef = { partition: MatchBrowserPartition; row: MatchBrowserRow };
const normalizedDictionaries = new WeakMap<MatchBrowserPartition, { players: string[]; tournaments: string[]; categories: string[]; rounds: string[] }>();
function normalized(partition: MatchBrowserPartition) {
  let saved = normalizedDictionaries.get(partition);
  if (!saved) {
    saved = partition.search || {
      players: partition.dictionaries.players.map(canonicalSearchText),
      tournaments: partition.dictionaries.tournaments.map(name => canonicalSearchText(`${name} ${tournamentName(name)}`)),
      categories: partition.dictionaries.categories.map(canonicalSearchText),
      rounds: partition.dictionaries.rounds.map(canonicalSearchText),
    };
    normalizedDictionaries.set(partition, saved);
  }
  return saved;
}

function rowOrder(a: RowRef, b: RowRef) {
  const ar = a.row, br = b.row;
  if (ar[1] !== br[1]) return br[1] - ar[1];
  const ad = (ar[12] || ar[18]).slice(0, 10), bd = (br[12] || br[18]).slice(0, 10);
  if (ad !== bd) return bd.localeCompare(ad);
  const al = value(a.partition.dictionaries.dateLabels, ar[13]), bl = value(b.partition.dictionaries.dateLabels, br[13]);
  if (al === 'Fecha del partido' && bl === 'Fecha del partido' && ar[18] !== br[18]) return br[18].localeCompare(ar[18]);
  const ap = roundPosition(value(a.partition.dictionaries.rounds, ar[5]));
  const bp = roundPosition(value(b.partition.dictionaries.rounds, br[5]));
  return bp - ap || ar[0].localeCompare(br[0]);
}

/** Resolve each term against dictionaries once, rather than allocating/searching
 * the same six text fields for every match in a circuit. */
function exactRowMatcher(partition: MatchBrowserPartition, terms: string[]) {
  const d = normalized(partition);
  const lookups = terms.map(term => ({
    term,
    players: d.players.map(field => Boolean(field?.includes(term))),
    tournaments: d.tournaments.map(field => Boolean(field?.includes(term))),
    categories: d.categories.map(field => Boolean(field?.includes(term))),
    rounds: d.rounds.map(field => Boolean(field?.includes(term))),
  }));
  return (row: MatchBrowserRow) => lookups.every(fields =>
    fields.players[row[6]] || fields.players[row[8]] || fields.tournaments[row[2]]
    || fields.categories[row[3]] || fields.rounds[row[5]] || String(row[1]).includes(fields.term));
}

function fuzzyTerms(partition: MatchBrowserPartition, row: MatchBrowserRow, terms: string[]) {
  if (!terms.length) return true;
  const d = normalized(partition);
  return searchTermsMatch(terms, [d.players[row[6]], d.players[row[8]], d.tournaments[row[2]], d.categories[row[3]], d.rounds[row[5]], row[1]].join(' '));
}

function createRowMatcher(filter: BrowserFilter, fuzzy: boolean) {
  const intent = matchSearchIntent(filter.q || '');
  const exactMatchers = new WeakMap<MatchBrowserPartition, ReturnType<typeof exactRowMatcher>>();
  const normalizedRound = normalizeText(filter.round || '');
  const requestedRoundPosition = ({ f: 7, sf: 6, qf: 5, r16: 4 } as Record<string, number>)[normalizedRound]
    || (normalizedRound ? roundPosition(filter.round || '') : 0);
  const requestedPlayer = normalizeText(filter.q || '');
  return (partition: MatchBrowserPartition, row: MatchBrowserRow) => {
    const d = partition.dictionaries;
    if ((filter.year && row[1] !== filter.year) || (filter.fromYear && row[1] < filter.fromYear) || (filter.toYear && row[1] > filter.toYear)) return false;
    if ((intent.year && row[1] !== intent.year) || (filter.surface && surfaces[row[4]] !== filter.surface) || (intent.surface && surfaces[row[4]] !== intent.surface)) return false;
    const round = value(d.rounds, row[5]);
    if (normalizedRound && normalizeText(round) !== normalizedRound
      && (!requestedRoundPosition || roundPosition(round) !== requestedRoundPosition)) return false;
    if (intent.round && roundPosition(round) !== intent.round) return false;
    if ((filter.fiveSets || intent.fiveSets) && row[20].length !== 5) return false;
    if (filter.tournament && value(d.tournaments, row[2]) !== filter.tournament) return false;
    if (filter.category && (value(d.categories, row[3]) || 'Otros torneos') !== filter.category) return false;
    if (filter.player) {
      const player = normalizeText(filter.player);
      if (!normalizeText(`${value(d.players, row[6])} ${value(d.players, row[8])}`).includes(player)) return false;
    }
    if (filter.data === 'measures' && !(row[21] & 1)) return false;
    if (filter.data === 'points' && !(row[21] & 2)) return false;
    if (filter.kind && matchTypeFromScore(row[20], row[10] === 1 || row[10] === 2 ? row[10] : null) !== filter.kind) return false;
    if (filter.age !== undefined) {
      const age = normalizeText(value(d.players, row[6])) === requestedPlayer ? row[16] : normalizeText(value(d.players, row[8])) === requestedPlayer ? row[17] : null;
      if (age === null || Math.floor(age) !== filter.age) return false;
    }
    if (!intent.terms.length) return true;
    if (fuzzy) return fuzzyTerms(partition, row, intent.terms);
    let exact = exactMatchers.get(partition);
    if (!exact) { exact = exactRowMatcher(partition, intent.terms); exactMatchers.set(partition, exact); }
    return exact(row);
  };
}

function orderedMatches(partitions: MatchBrowserPartition[], filter: BrowserFilter, fuzzy: boolean) {
  const matches = createRowMatcher(filter, fuzzy);
  const offsets = partitions.map(() => 0);
  const heads: Array<RowRef | undefined> = partitions.map((partition, index) => {
    while (offsets[index] < partition.rows.length && !matches(partition, partition.rows[offsets[index]])) offsets[index]++;
    const row = partition.rows[offsets[index]];
    return row ? { partition, row } : undefined;
  });
  return {
    *[Symbol.iterator]() {
      while (true) {
        let selected = -1;
        for (let index = 0; index < heads.length; index++) if (heads[index] && (selected < 0 || rowOrder(heads[index]!, heads[selected]!) < 0)) selected = index;
        if (selected < 0) return;
        yield heads[selected]!;
        const partition = partitions[selected];
        offsets[selected]++;
        while (offsets[selected] < partition.rows.length && !matches(partition, partition.rows[offsets[selected]])) offsets[selected]++;
        const row = partition.rows[offsets[selected]];
        heads[selected] = row ? { partition, row } : undefined;
      }
    },
  };
}

export function queryMatchBrowser(partitions: MatchBrowserPartition[], filter: BrowserFilter, dailyLimit = 2, seasonLimit = 3): MatchBrowserResult {
  const hasQuery = Boolean((filter.q || '').trim());
  const fuzzy = hasQuery && orderedMatches(partitions, filter, false)[Symbol.iterator]().next().done === true;
  const source = orderedMatches(partitions, filter, fuzzy);
  const dates: string[] = [], dateSet = new Set<string>(), years: number[] = [], yearSet = new Set<number>();
  const dailyMatches: Match[] = [], editions = new Map<string, { key: string; hrefName: string; totalMatches: number; refs: RowRef[] }>();
  let total = 0;
  for (const ref of source) {
    const row = ref.row, partition = ref.partition;
    total++;
    const date = row[12] || `${row[1]}-01-01`;
    if (!dateSet.has(date)) { dateSet.add(date); dates.push(date); }
    if (dates.length <= dailyLimit) dailyMatches.push(decodeMatchBrowserRow(partition, row));
    if (!yearSet.has(row[1])) { yearSet.add(row[1]); years.push(row[1]); }
    if (years.length <= seasonLimit) {
      const tournament = value(partition.dictionaries.tournaments, row[2]);
      // ATP and WTA can share both an event name and a season (Grand Slams in
      // particular). Keep their editions independent so cards never combine
      // two draws and then link every result to the circuit of the first row.
      const key = `${partition.tour}|${row[1]}|${tournament}`;
      const edition = editions.get(key) || { key, hrefName: tournament, totalMatches: 0, refs: [] };
      edition.totalMatches++;
      if (edition.refs.length < 4) edition.refs.push(ref);
      editions.set(key, edition);
    }
  }
  return {
    total,
    matchDates: dates,
    editionYears: years,
    dailyMatches,
    editions: [...editions.values()].map(edition => ({
      key: edition.key,
      hrefName: edition.hrefName,
      totalMatches: edition.totalMatches,
      matches: edition.refs.map(ref => decodeMatchBrowserRow(ref.partition, ref.row)),
    })),
  };
}

export function queryMatchBrowserPage(partitions: MatchBrowserPartition[], filter: BrowserFilter, page: number, limit: number) {
  const exact = orderedMatches(partitions, filter, false);
  const exactProbe = exact[Symbol.iterator]().next();
  const useFuzzy = Boolean(exactProbe.done) && Boolean((filter.q || '').trim());
  const source = orderedMatches(partitions, filter, useFuzzy);
  const offset = Math.max(0, page - 1) * limit;
  const matches: Match[] = [];
  let total = 0;
  for (const ref of source) {
    if (total >= offset && matches.length < limit) matches.push(decodeMatchBrowserRow(ref.partition, ref.row));
    total++;
  }
  return { matches, total, page, limit };
}
