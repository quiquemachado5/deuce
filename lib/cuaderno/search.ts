import "server-only";
import { notebook } from "./data";
import type { Match } from "../types";
import { shelves, shelfMatches } from "./shelves";
import { normalizeText } from "../quality";
import { playerSlug } from "../explore";
import { tournamentName } from "../labels";
import { score, round, sentence } from "./model";
import { tournamentDirectory } from '../tournament-directory';
import { approximateName, searchText } from '../search-text';
import type { SearchItem } from "@/components/revista/Frame";
export async function searchArchive(query: string, options: { includeMatches?: boolean; data?: Awaited<ReturnType<typeof notebook>> } = {}) {
  query = query.trim().slice(0, 180);
  if (!query) return [] as SearchItem[];
  const data = options.data || await notebook(),
    q = normalizeText(query).replace(/[–—]/g, "-"),
    terms = q.split(/\s+/).filter(Boolean);
  if (!terms.length) return [] as SearchItem[];
  const includes = (v: string) =>
    terms.every((t) => normalizeText(v).replace(/[–—]/g, "-").includes(t));
  const records = data.manifest.pieces,
    items: SearchItem[] = [];
  for (const s of records
    .filter((s) => includes(`${s.title} ${s.id}`))
    .slice(0, 4))
    items.push({
      href: `/records?dato=${s.id}`,
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
      href: `/players/${playerSlug(p.name)}`,
      name: p.name,
      detail: `${exactPlayers.length ? '' : 'Coincidencia aproximada · '}${p.played.toLocaleString("es-ES")} partidos en el archivo`,
      group: "Jugadores",
    });
  const requestedYear = terms.find(term => /^\d{4}$/.test(term));
  const eventTerms = terms.filter(term => term !== requestedYear);
  let foundEvent = false;
  if (eventTerms.length) {
    const events = tournamentDirectory(data.matches).filter(event => eventTerms.every(term => searchText(`${event.name} ${tournamentName(event.name)}`).includes(searchText(term)))).slice(0, 3);
    foundEvent = events.length > 0;
    for (const event of events) {
      if (!requestedYear) items.push({ href: `/torneos/${event.slug}`, name: tournamentName(event.name), group: 'Torneos', detail: `${event.matches.length.toLocaleString('es-ES')} partidos en el archivo` });
      const years = [...new Set(event.matches.map(match => match.year))].sort((a, b) => b - a).filter(year => !requestedYear || year === Number(requestedYear)).slice(0, requestedYear ? 1 : 2);
      for (const year of years) items.push({ href: `/${event.slug}/${year}`, name: `${tournamentName(event.name)} ${year}`, group: 'Ediciones', detail: 'Resultados y camino del campeón' });
    }
  }
  if (!foundEvent && !playerResults.length && terms.length > 1 && !requestedYear) {
    for (const p of data.pairs
      .filter((p) => includes(p.names.join(" ")))
      .slice(0, 3))
      items.push({
        href: `/rivalries/${p.slug}`,
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
        detail: `${tournamentName(m.tournament)} · ${m.year} · ${round(m)} · ${score(m)}${sentence(m) ? ` · ${sentence(m)}` : ""}`,
        group: "Partidos",
      });
  }
  return items;
}

const matchIndexes = new WeakMap<Match[], { match: Match; text: string }[]>();
export function matchingMatches(query: string, matches: Match[], limit = Infinity) {
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
  if (shelf) return shelfMatches(shelf, matches).sort((a,b) => b.score_summary.timestamp.localeCompare(a.score_summary.timestamp)).slice(0, limit);
  let index = matchIndexes.get(matches);
  if (!index) {
    index = matches.map(match => ({match, text: normalizeText(`${match.player1.name} ${match.player2.name} ${tournamentName(match.tournament)} ${match.tournament} ${match.year} ${round(match)}`).replace(/[–—]/g, '-')}));
    matchIndexes.set(matches, index);
  }
  const result: Match[] = [];
  for (const entry of index) {
    if (!terms.every(term => entry.text.includes(term))) continue;
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
}
