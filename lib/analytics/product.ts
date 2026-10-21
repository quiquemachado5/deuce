import type { Match } from "../types";
import { winnerName } from "../editorial";
export type SeasonPoint = {
  year: number;
  wins: number;
  played: number;
  finals: number;
  titles: number;
  rate: number | null;
};
/** Missing years stay null: a gap in this archive is not a zero-percent season. */
export function playerSeasons(matches: Match[], name: string): SeasonPoint[] {
  const map = new Map<number, SeasonPoint>();
  for (const m of matches) {
    if (m.player1.name !== name && m.player2.name !== name) continue;
    const r = map.get(m.year) || {
      year: m.year,
      wins: 0,
      played: 0,
      finals: 0,
      titles: 0,
      rate: null,
    };
    r.played++;
    r.wins += Number(winnerName(m) === name);
    if (m.round === "Final") {
      r.finals++;
      r.titles += Number(winnerName(m) === name);
    }
    map.set(m.year, r);
  }
  if (!map.size) return [];
  const years = [...map.keys()];
  return Array.from(
    { length: Math.max(...years) - Math.min(...years) + 1 },
    (_, i) => {
      const year = Math.min(...years) + i,
        r = map.get(year);
      return r
        ? { ...r, rate: (100 * r.wins) / r.played }
        : { year, wins: 0, played: 0, finals: 0, titles: 0, rate: null };
    },
  );
}
export function pairSeasons(matches: Match[], names: readonly string[]) {
  const years = [...new Set(matches.map((m) => m.year))].sort((a, b) => a - b);
  let first = 0,
    second = 0;
  return years.map((year) => {
    for (const m of matches.filter((m) => m.year === year)) {
      if (winnerName(m) === names[0]) first++;
      else second++;
    }
    return { year, first, second };
  });
}

export function roundAbbreviation(round: string, champion = false) {
  if (champion) return "C";
  const draw = round.match(/^Round of (128|64|32|16)$/i);
  if (draw) return draw[1] === "16" ? "OF" : `R${draw[1]}`;
  const key = round.toLowerCase();
  return (
    (
      {
        final: "F",
        semifinal: "SF",
        semifinales: "SF",
        quarterfinal: "CF",
        "cuartos de final": "CF",
        "octavos de final": "OF",
        "primera ronda": "R1",
        "segunda ronda": "R2",
        "tercera ronda": "R3",
      } as Record<string, string>
    )[key] || "R"
  );
}
