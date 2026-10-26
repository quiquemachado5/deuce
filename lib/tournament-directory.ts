import type { Match, Surface } from "./types";
import { TOURNAMENTS } from "./types";
import { chronological, roundPosition, winnerName } from "./editorial";
import { playerSlug } from "./explore";
import { buildSeasonAnalytics } from "./season-analytics";
import type { RecordRow } from "./revista/records";

export type TournamentEntry = {
  name: string;
  slug: string;
  canonical: boolean;
  matches: Match[];
  categories: string[];
  latestYear: number;
};

const canonicalByName = new Map<string, (typeof TOURNAMENTS)[number]>(
  TOURNAMENTS.map((entry) => [entry.name, entry]),
);
const directoryCache = new WeakMap<Match[], TournamentEntry[]>();

function slugify(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "torneo";
}

function suffix(name: string) {
  let value = 5381;
  for (const char of name) value = ((value << 5) + value + char.charCodeAt(0)) >>> 0;
  return value.toString(36).slice(0, 5);
}

export function tournamentDirectory(matches: Match[]): TournamentEntry[] {
  const cached = directoryCache.get(matches);
  if (cached) return cached;
  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    if (!match.tournament) continue;
    const group = grouped.get(match.tournament) || [];
    group.push(match);
    grouped.set(match.tournament, group);
  }
  const reserved = new Set<string>(TOURNAMENTS.map((entry) => entry.slug));
  const used = new Set<string>(reserved);
  const directory = [...grouped].sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([name, rows]) => {
      const canonical = canonicalByName.get(name);
      const base = slugify(name);
      const slug = canonical?.slug || (used.has(base) ? `${base}-${suffix(name)}` : base);
      used.add(slug);
      const categories = [...new Set(rows.map((row) => row.category))];
      return {
        name,
        slug,
        canonical: Boolean(canonical),
        matches: rows,
        categories,
        latestYear: Math.max(...rows.map((row) => row.year)),
      };
    });
  directoryCache.set(matches, directory);
  return directory;
}

export function categoryYears(entry: TournamentEntry, category: string) {
  return [...new Set(entry.matches.filter((match) => match.category === category).map((match) => match.year))]
    .sort((a, b) => b - a);
}

export function tournamentCategory(entry: TournamentEntry) {
  const latest = entry.matches.filter((match) => match.year === entry.latestYear);
  if (entry.canonical) {
    const preferred = canonicalByName.get(entry.name)?.category;
    if (preferred && entry.categories.includes(preferred)) return preferred;
  }
  return latest[0]?.category || entry.categories[0] || "Torneo";
}

export function categoryLabel(category: string) {
  if (category === "Precursores de Masters") return "Precursores · antes de 1990";
  if (category === "ATP Tour histórico") return "ATP Tour histórico";
  if (category === "ATP Tour · nivel no especificado") return "Otros torneos ATP";
  return category;
}

export function categorySurfaces(entry: TournamentEntry, category: string): Surface[] {
  return [...new Set(entry.matches.filter((match) => match.category === category).map((match) => match.surface))];
}

export function tournamentRows(matches: Match[]) {
  const finals = matches.filter((match) => roundPosition(match.round) === 7);
  const players = buildSeasonAnalytics(matches).players;
  const record = (name: string, value: number, sample: number, detail: string, proof?: Match): RecordRow => ({
    name, value, sample, detail, href: `/jugadores/${playerSlug(name)}`, photoName: name, proof,
  });
  return {
    champion: [...finals].sort(chronological).at(-1),
    titles: players.filter((player) => player.finalsWon)
      .sort((a, b) => b.finalsWon - a.finalsWon)
      .map((player) => record(player.name, player.finalsWon, player.finalsPlayed,
        `${player.finalsWon}–${player.finalsPlayed - player.finalsWon} en finales`,
        finals.find((match) => winnerName(match) === player.name))),
    played: players.filter((player) => player.finalsPlayed)
      .sort((a, b) => b.finalsPlayed - a.finalsPlayed)
      .map((player) => record(player.name, player.finalsPlayed, player.finalsPlayed,
        `${player.finalsWon} ${player.finalsWon === 1 ? "final ganada" : "finales ganadas"}`,
        finals.find((match) => match.player1.name === player.name || match.player2.name === player.name))),
    rate: players.filter((player) => player.played >= 10)
      .sort((a, b) => b.wins / b.played - a.wins / a.played)
      .map((player) => record(player.name, player.wins / player.played * 100, player.played,
        `${player.wins} de ${player.played} partidos`,
        matches.find((match) => match.player1.name === player.name || match.player2.name === player.name))),
  };
}
