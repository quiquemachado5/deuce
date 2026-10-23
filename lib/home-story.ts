import type { Match, Surface } from "./types";
import { roundPosition } from "./editorial";

export function homeTotals(matches: readonly Match[], year: number) {
  const surfaces: Record<Surface, number> = { hard: 0, clay: 0, grass: 0, carpet: 0, unknown: 0 };
  const season = { matches: 0, finals: 0, hard: 0, clay: 0, grass: 0, other: 0 };
  for (const match of matches) {
    surfaces[match.surface]++;
    if (match.year !== year) continue;
    season.matches++;
    if (roundPosition(match.round) === 7) season.finals++;
    if (match.surface === "hard" || match.surface === "clay" || match.surface === "grass") season[match.surface]++;
    else season.other++;
  }
  return { surfaces, season };
}

// Editorial selection verified against the published archive, 23 October 2026.
// Local snapshots may precede this final; never substitute a different match.
export function featuredFinal(matches: readonly Match[]): string {
  return matches.find(match => match.year === 2026 && /shang|shái/i.test(match.tournament)
    && roundPosition(match.round) === 7
    && [match.player1.name, match.player2.name].includes("Alejandro Davidovich Fokina")
    && [match.player1.name, match.player2.name].some(name => /Rafael J[oó]dar/.test(name)))?.match_id || "live-205270";
}
