import "server-only";
import { notebook } from "./data";
import type { Match } from "../types";
import { shelves, shelfMatches } from "./shelves";
import { normalizeText } from "../quality";
import { comparisonHref, playerSlug } from "../explore";
import { tournamentName } from "../labels";
import { score, round, sentence } from "./model";
import { tournamentDirectory } from '../tournament-directory';
import { matchSearchIntent, matchesIntent } from '../search-intent';
import { approximateName, canonicalSearchText, searchTermsMatch } from '../search-text';
import type { SearchItem } from "@/components/revista/Frame";
import type { PlayerRecord } from '../season-analytics';
import type { RecordManifest } from '../revista/snapshot';

/** Compact suggestions for typeahead: never opens the 176k-match artifact. */
export function quickSearchArchive(query: string, records: PlayerRecord[], manifest: Pick<RecordManifest, 'pieces'>) {
  const raw = query.trim().slice(0, 100);
  const terms = canonicalSearchText(raw).split(/\s+/).filter(Boolean);
  if (terms.join('').length < 2) return [] as SearchItem[];
  const includes = (value: string) => terms.every(term => canonicalSearchText(value).includes(term));
  const items: SearchItem[] = [];
  for (const piece of manifest.pieces.filter(piece => includes(`${piece.title} ${piece.id}`)).slice(0, 4)) {
    items.push({ href: `/records?dato=${piece.id}`, name: piece.title, group: 'Récords', detail: piece.group });
  }
  const exact = records.filter(player => includes(player.name));
  const players = exact.length ? exact : records.filter(player => approximateName(raw, player.name));
  for (const player of players.slice(0, 12)) {
    items.push({
      href: `/jugadores/${playerSlug(player.name)}${player.tour === 'wta' ? '?tour=wta' : ''}`,
      name: player.name,
      group: 'Jugadores',
      detail: `${player.tour === 'wta' ? 'WTA' : 'ATP'} · ${exact.length ? '' : 'Coincidencia aproximada · '}${player.played.toLocaleString('es-ES')} partidos en el archivo`,
    });
  }
  return items;
}
export async function searchArchive(query: string, options: { includeMatches?: boolean; data?: Awaited<ReturnType<typeof notebook>> } = {}) {
  query = query.trim().slice(0, 180);
  if (!query) return [] as SearchItem[];
  const data = options.data || await notebook(),
    q = canonicalSearchText(query).replace(/[–—]/g, "-"),
    terms = q.split(/\s+/).filter(Boolean);
  if (!terms.length) return [] as SearchItem[];
  const includes = (v: string) =>
    terms.every((t) => canonicalSearchText(v).replace(/[–—]/g, "-").includes(t));
  const records = data.manifest.pieces,
    items: SearchItem[] = [];
  for (const s of records
    .filter((s) => includes(`${s.title} ${s.id}`))
    .slice(0, 4))
    items.push({
      href: `/records?dato=${s.id}&tour=atp`,
      name: s.title,
      group: "Récords",
      detail: s.group,
    });
  // The prepared player rows already carry these counts. Building the full
  // player directory here makes the first keystroke scan the entire archive.
  const exactPlayers = data.records.filter(p => includes(p.name));
  const playerResults = exactPlayers.length ? exactPlayers : data.records.filter(p => approximateName(query, p.name));
  for (const p of playerResults.slice(0, 4))
    items.push({
      href: `/jugadores/${playerSlug(p.name)}${p.tour==='wta'?'?tour=wta':''}`,
      name: p.name,
      detail: `${p.tour==='wta'?'WTA':'ATP'} · ${exactPlayers.length ? '' : 'Coincidencia aproximada · '}${p.played.toLocaleString("es-ES")} partidos en el archivo`,
      group: "Jugadores",
    });
  const requestedYear = terms.find(term => /^\d{4}$/.test(term));
  const eventTerms = terms.filter(term => term !== requestedYear);
  let foundEvent = false;
  if (eventTerms.length) {
    const eventQuery = eventTerms.join(' ');
    const events = tournamentDirectory(data.matches).filter(event => eventTerms.every(term => canonicalSearchText(`${event.name} ${tournamentName(event.name)}`).includes(canonicalSearchText(term))) || searchTermsMatch(eventTerms, `${event.name} ${tournamentName(event.name)}`) || approximateName(eventQuery, tournamentName(event.name))).slice(0, 3);
    foundEvent = events.length > 0;
    for (const event of events) {
      for (const tour of ['atp','wta'] as const) {
        const circuitMatches=event.matches.filter(match=>(match.tour||'atp')===tour);
        if (!circuitMatches.length) continue;
        const circuit=tour==='wta'?'WTA':'ATP', suffix=tour==='wta'?'?cuadro=wta':'';
        if (!requestedYear) items.push({ href: `/torneos/${event.slug}${suffix}`, name: tournamentName(event.name), group: 'Torneos', detail: `${circuit} · ${circuitMatches.length.toLocaleString('es-ES')} partidos en el archivo` });
        const years = [...new Set(circuitMatches.map(match => match.year))].sort((a, b) => b - a).filter(year => !requestedYear || year === Number(requestedYear)).slice(0, requestedYear ? 1 : 2);
        for (const year of years) items.push({ href: `/torneos/${event.slug}/${year}${suffix}`, name: `${tournamentName(event.name)} ${year}`, group: 'Ediciones', detail: `${circuit} · Resultados y camino ${tour==='wta'?'de la campeona':'del campeón'}` });
      }
    }
  }
  if (!foundEvent && !playerResults.length && terms.length > 1 && !requestedYear) {
    for (const p of data.pairs
      .filter((p) => includes(p.names.join(" ")))
      .slice(0, 3))
      items.push({
        href: comparisonHref(p.names[0], p.names[1]),
        name: p.names.join(" contra "),
        detail: `${p.wins.join("–")} · ${p.matches.length} partidos en este archivo`,
        group: "Parejas",
      });
  }
  if (options.includeMatches !== false) {
    const matches = matchingMatches(query, data.matches, Math.max(0, 25 - items.length));
    for (const m of matches.slice(0, 25 - items.length))
      items.push({
        href: `/match/${m.match_id}`,
        name: `${m.player1.name} contra ${m.player2.name}`,
        detail: `${m.tour==='wta'?'WTA':'ATP'} · ${tournamentName(m.tournament)} · ${m.year} · ${round(m)} · ${score(m)}${sentence(m) ? ` · ${sentence(m)}` : ""}`,
        group: "Partidos",
      });
  }
  return items;
}

const matchIndexes = new WeakMap<Match[], { match: Match; text: string }[]>();
const newestMatches = new WeakMap<Match[], Match[]>();
export function matchingMatches(query: string, matches: Match[], limit = Infinity) {
  const intent = matchSearchIntent(query);
  const terms = normalizeText(query)
    .replace(/[–—]/g, "-")
    .split(/\s+/)
    .filter(Boolean);
  const includes = (v: string) =>
    terms.every((t) => normalizeText(v).replace(/[–—]/g, "-").includes(t));
  const shelf = terms.length
    ? shelves.find((s) => includes(`${s.label} ${s.id}`))
    : undefined;
  if (limit <= 0) return [];
  if (!terms.length) {
    let newest = newestMatches.get(matches);
    if (!newest) {
      newest = [...matches].sort((a, b) => b.score_summary.timestamp.localeCompare(a.score_summary.timestamp));
      newestMatches.set(matches, newest);
    }
    return Number.isFinite(limit) ? newest.slice(0, limit) : newest;
  }
  if (shelf) return shelfMatches(shelf, matches).sort((a,b) => b.score_summary.timestamp.localeCompare(a.score_summary.timestamp)).slice(0, limit);
  let index = matchIndexes.get(matches);
  if (!index) {
    index = matches.map(match => ({match, text: canonicalSearchText(`${match.player1.name} ${match.player2.name} ${tournamentName(match.tournament)} ${match.tournament} ${match.year} ${round(match)}`).replace(/[–—]/g, '-')}));
    matchIndexes.set(matches, index);
  }
  const collect = (fuzzy: boolean) => {
    const result: Match[] = [];
    for (const entry of index) {
      const termsMatch = fuzzy ? searchTermsMatch(intent.terms, entry.text) : intent.terms.every(term => entry.text.includes(term));
      if (!matchesIntent(entry.match, intent) || !termsMatch) continue;
      if (!Number.isFinite(limit)) {
        result.push(entry.match);
        continue;
      }
      const date = entry.match.score_summary.timestamp;
      if (result.length >= limit && date <= result[result.length - 1].score_summary.timestamp) continue;
      const earlier = result.findIndex(match => date > match.score_summary.timestamp);
      result.splice(earlier < 0 ? result.length : earlier, 0, entry.match);
      if (result.length > limit) result.pop();
    }
    return Number.isFinite(limit)
      ? result
      : result.sort((a,b) => b.score_summary.timestamp.localeCompare(a.score_summary.timestamp));
  };
  const exact = collect(false);
  if (exact.length) return exact;
  return collect(true);
}
