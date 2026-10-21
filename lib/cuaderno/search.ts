import "server-only";
import { notebook } from "./data";
import type { Match } from "../types";
import { shelves, shelfMatches } from "./shelves";
import { recordView } from "../revista/read-records";
import { normalizeText } from "../quality";
import { playerSlug } from "../explore";
import { tournamentName } from "../labels";
import { score, round, sentence } from "./model";
import type { SearchItem } from "@/components/revista/Frame";
export async function searchArchive(query: string, options: { includeMatches?: boolean } = {}) {
  const [data, prepared] = await Promise.all([notebook(), recordView("{}")]),
    q = normalizeText(query).replace(/[–—]/g, "-"),
    terms = q.split(/\s+/).filter(Boolean);
  if (!terms.length) return [] as SearchItem[];
  const includes = (v: string) =>
    terms.every((t) => normalizeText(v).replace(/[–—]/g, "-").includes(t));
  const records = prepared.manifest.pieces,
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
  for (const p of data.players.filter((p) => includes(p.name)).slice(0, 4))
    items.push({
      href: `/players/${playerSlug(p.name)}`,
      name: p.name,
      detail: `${p.played.toLocaleString("es-ES")} partidos en el archivo`,
      group: "Jugadores",
    });
  for (const p of data.pairs
    .filter((p) => includes(p.names.join(" ")))
    .slice(0, 3))
    items.push({
      href: `/rivalries/${p.slug}`,
      name: p.names.join(" contra "),
      detail: `${p.wins.join("–")} · ${p.matches.length} partidos en este archivo`,
      group: "Parejas",
    });
  if (options.includeMatches !== false) {
    const matches = matchingMatches(query, data.matches);
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

export function matchingMatches(query: string, matches: Match[]) {
  const terms = normalizeText(query)
    .replace(/[–—]/g, "-")
    .split(/\s+/)
    .filter(Boolean);
  const includes = (v: string) =>
    terms.every((t) => normalizeText(v).replace(/[–—]/g, "-").includes(t));
  const shelf = terms.length
    ? shelves.find((s) => includes(`${s.label} ${s.id}`))
    : undefined;
  return (
    shelf
      ? shelfMatches(shelf, matches)
      : matches.filter((m) =>
          includes(
            `${m.player1.name} ${m.player2.name} ${tournamentName(m.tournament)} ${m.tournament} ${m.year} ${round(m)}`,
          ),
        )
  ).sort((a, b) =>
    b.score_summary.timestamp.localeCompare(a.score_summary.timestamp),
  );
}
