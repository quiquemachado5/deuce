import type { Match } from "./types";

export type MatchDiscipline = "singles" | "doubles";

type DisciplineMatch = Pick<Match, "player1" | "player2" | "raw_fixture">;

const TEAM_SEPARATOR = /\s+\/\s+/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function fixtureDiscipline(value: unknown): MatchDiscipline | null {
  const root = record(value);
  if (!root) return null;
  const candidates = [root, record(root.match)].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));

  for (const candidate of candidates) {
    if (typeof candidate.is_doubles === "boolean") return candidate.is_doubles ? "doubles" : "singles";
    if (typeof candidate.draw === "string") {
      const draw = candidate.draw.toLowerCase();
      if (draw.includes("double")) return "doubles";
      if (draw.includes("single")) return "singles";
    }
    const players = record(candidate.players);
    const first = record(players?.p1);
    const second = record(players?.p2);
    if (first?.is_doubles_team === true || second?.is_doubles_team === true) return "doubles";
    if (first?.is_doubles_team === false && second?.is_doubles_team === false) return "singles";
  }

  return null;
}

/**
 * Provider metadata is authoritative while ingesting. Published snapshots omit
 * raw fixtures, so the provider's stable "Player / Player" team label remains
 * the fallback needed to keep doubles out of singles views.
 */
export function matchDiscipline(match: DisciplineMatch): MatchDiscipline {
  return fixtureDiscipline(match.raw_fixture)
    || (TEAM_SEPARATOR.test(match.player1.name) || TEAM_SEPARATOR.test(match.player2.name) ? "doubles" : "singles");
}

export function matchesByDiscipline<T extends DisciplineMatch>(matches: readonly T[], discipline: MatchDiscipline): T[] {
  return matches.filter((match) => matchDiscipline(match) === discipline);
}

export function singlesMatches<T extends DisciplineMatch>(matches: readonly T[]): T[] {
  return matchesByDiscipline(matches, "singles");
}
