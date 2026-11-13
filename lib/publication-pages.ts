import { createHash } from 'node:crypto';
import type { Match } from './types';
import { playerSlug } from './explore';
import { tournamentDirectory } from './tournament-directory';
import { tournamentEditionCanonicalPath } from './tournament-url';
import { recordsCanonical } from './records-url';
import type { RecordPages } from './revista/snapshot';

export type Correction = {
  identity: string;
  at: string;
  before: ReturnType<typeof publicMatchFacts>;
  after: ReturnType<typeof publicMatchFacts>;
  sources: string[];
};
export type PageRevisions = {
  schema: 1;
  pages: Record<string, { hash: string; modifiedAt?: string }>;
  corrections: Correction[];
};

/** Publish facts and references, never raw downloads or credentials. */
export function publicMatchFacts(match: Match) {
  return {
    tournament: match.tournament,
    year: match.year,
    round: match.round,
    players: [match.player1.name, match.player2.name],
    winner: match.winner === 1 ? match.player1.name : match.winner === 2 ? match.player2.name : null,
    score: match.final_score,
    status: match.status,
    surface: match.surface,
    category: match.category,
    playedOn: match.context?.dateLabel === 'Fecha del partido' ? match.context.date : null,
  };
}

export function matchCorrections(before: Match[], after: Match[], at: string): Correction[] {
  const old = new Map(before.map(match => [`${match.tour || 'atp'}:${match.match_id}`, match]));
  return after.flatMap(match => {
    const identity = `${match.tour || 'atp'}:${match.match_id}`, prior = old.get(identity);
    if (!prior) return [];
    const previous = publicMatchFacts(prior), current = publicMatchFacts(match);
    if (JSON.stringify(previous) === JSON.stringify(current)) return [];
    const sources = [match.context?.resultSource, ...(match.context?.metadataSources || []).map(source => source.url)]
      .filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url) && !new URL(url).search);
    return [{ identity, at, before: previous, after: current, sources: [...new Set(sources)] }];
  });
}

export function validCorrection(value: unknown): value is Correction {
  if (!value || typeof value !== 'object') return false;
  const row = value as Correction;
  return /^(atp|wta):[^\s/\\?#]+$/.test(row.identity)
    && Number.isFinite(Date.parse(row.at))
    && [row.before, row.after].every(facts => facts && Array.isArray(facts.players) && facts.players.length === 2
      && typeof facts.tournament === 'string' && typeof facts.score === 'string' && typeof facts.round === 'string')
    && Array.isArray(row.sources) && row.sources.every(url => typeof url === 'string' && /^https:\/\//.test(url));
}

export function validPageRevisions(value: unknown): value is PageRevisions {
  if (!value || typeof value !== 'object') return false;
  const revision = value as PageRevisions;
  return revision.schema === 1 && !!revision.pages && typeof revision.pages === 'object' && !Array.isArray(revision.pages)
    && Array.isArray(revision.corrections) && revision.corrections.every(validCorrection)
    && Object.entries(revision.pages).every(([path, row]) => path.startsWith('/') && !/^\/en(?:\/|$)/.test(path)
      && !!row && /^[a-f0-9]{24}$/.test(row.hash) && (!row.modifiedAt || Number.isFinite(Date.parse(row.modifiedAt))));
}

// A retrieval/publication timestamp or changed object-key order is not a content edit.
const transient = new Set(['provider_revision', 'raw_fixture', 'raw_point_tape', 'generatedAt', 'retrieved_at', 'resultReviewedAt']);
function stableContent(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableContent);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => !transient.has(key) && item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableContent(item)]));
}
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(stableContent(value))).digest('hex').slice(0, 24);

/** On first observation omit lastmod: the historical date of a page edit is unknown. */
export function buildPageRevisions(matches: Match[], records: Record<string, RecordPages>, previous: PageRevisions | undefined,
  at: string, corrections: Correction[] = []): PageRevisions {
  const groups = new Map<string, ReturnType<typeof createHash>>();
  const add = (path: string, content: string) => {
    let hash = groups.get(path);
    if (!hash) { hash = createHash('sha256'); groups.set(path, hash); }
    hash.update(content).update('\n');
  };
  const events = new Map(tournamentDirectory(matches).map(event => [event.name, event]));
  const editionPaths = new Map<string,string>();
  for (const event of events.values()) for (const match of event.matches) {
    const tour = match.tour === 'wta' ? 'wta' : 'atp', key = `${event.name}:${match.year}:${tour}:${match.category}`;
    if (!editionPaths.has(key)) editionPaths.set(key,tournamentEditionCanonicalPath({slug:event.slug,year:match.year,tour,category:match.category,matches:event.matches}));
  }
  for (const match of [...matches].sort((a, b) => a.match_id.localeCompare(b.match_id))) {
    const content = fingerprint({ ...match, editorial_highlight: undefined }), tour = match.tour === 'wta' ? 'wta' : 'atp';
    const playerQuery = tour === 'wta' ? '?tour=wta' : '', eventQuery = tour === 'wta' ? '?cuadro=wta' : '';
    for (const path of [`/match/${match.match_id}`, `/jugadores/${playerSlug(match.player1.name)}${playerQuery}`,
      `/jugadores/${playerSlug(match.player2.name)}${playerQuery}`, '/partidos' + (tour === 'wta' ? '?tour=wta' : '')]) add(path, content);
    const event = events.get(match.tournament);
    if (event) {
      add(`/torneos/${event.slug}${eventQuery}`, content);
      add(editionPaths.get(`${event.name}:${match.year}:${tour}:${match.category}`)!, content);
    }
  }
  for (const [id, piece] of Object.entries(records)) {
    const wta = id.startsWith('wta-'), dato = wta ? id.slice(4) : id;
    const content = fingerprint(piece);
    add(recordsCanonical({ dato, tour: wta ? 'wta' : 'atp' }), content);
    add(wta ? '/records?tour=wta' : '/records', content);
  }
  const pages: PageRevisions['pages'] = {};
  for (const [path, value] of groups) {
    const hash = value.digest('hex').slice(0, 24), old = previous?.pages[path];
    pages[path] = { hash, ...(old?.hash === hash ? (old.modifiedAt ? { modifiedAt: old.modifiedAt } : {}) : previous ? { modifiedAt: at } : {}) };
  }
  const seen = new Set<string>();
  const history = [...corrections, ...(previous?.corrections || [])].filter(row => {
    const key = `${row.identity}:${row.at}:${fingerprint(row.after)}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 1000);
  return { schema: 1, pages, corrections: history };
}
