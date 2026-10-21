import type { Match } from "./types";
const draw =
  "https://rg-organisation.fft.fr/sites/default/files/2024-06/Mens_Singles_20240604225512.pdf";
/** Scores transcribed from the FFT draw, always from the first named player's side. */
export const verifiedResults = [
  [
    "live-83571",
    "Francisco Cerundolo",
    "Novak Djokovic",
    "1–6 7–5 6–3 5–7 3–6",
    2,
    draw,
  ],
  [
    "live-82971",
    "Lorenzo Musetti",
    "Novak Djokovic",
    "5–7 7–6(6) 6–2 3–6 0–6",
    2,
    draw,
  ],
  [
    "live-82969",
    "Francisco Cerundolo",
    "Tommy Paul",
    "3–6 6–3 6–3 6–2",
    1,
    draw,
  ],
  ["live-82539", "Jannik Sinner", "Pavel Kotov", "6–4 6–4 6–4", 1, draw],
  ["live-81821", "Gael Monfils", "Lorenzo Musetti", "5–7 1–6 4–6", 2, draw],
  [
    "live-81829",
    "Mariano Navone",
    "Tomas Machac",
    "2–6 1–6 6–3 6–1 1–6",
    2,
    draw,
  ],
  [
    "live-81804",
    "Alexander Shevchenko",
    "Corentin Moutet",
    "4–6 2–6 6–0 3–6",
    2,
    draw,
  ],
  ["live-81552", "Pedro Martinez", "Andrey Rublev", "3–6 4–6 3–6", 2, draw],
  [
    "live-81358",
    "Roman Andres Burruchaga",
    "Jan-Lennard Struff",
    "3–6 2–6 1–6",
    2,
    draw,
  ],
  ["live-81348", "Taylor Fritz", "Federico Coria", "2–6 6–1 6–2 6–1", 1, draw],
  [
    "live-81360",
    "Valentin Vacherot",
    "Alejandro Davidovich Fokina",
    "6–4 2–6 2–6 6–7(2)",
    2,
    draw,
  ],
  [
    "live-81353",
    "Pablo Carreno-Busta",
    "Mariano Navone",
    "7–5 1–6 3–6 0–6",
    2,
    draw,
  ],
  [
    "live-81014",
    "Lorenzo Musetti",
    "Elahi Galan Daniel",
    "6–3 6–3 7–5",
    1,
    draw,
  ],
  [
    "live-81030",
    "Henri Squire",
    "Max Purcell",
    "6–2 6–2 3–6 4–6 7–6(10)",
    1,
    draw,
  ],
  ["live-81021", "Soonwoo Kwon", "Emil Ruusuvuori", "6–3 6–4 6–3", 1, draw],
  [
    "live-81019",
    "Felix Auger-Aliassime",
    "Yoshihito Nishioka",
    "6–2 6–4 6–4",
    1,
    draw,
  ],
  [
    "live-85264",
    "Carlos Alcaraz",
    "Jannik Sinner",
    "2–6 6–3 3–6 6–4 6–3",
    1,
    "https://www.atptour.com/-/media/d3a8363fd8f94f938ec3d28e834e8794.pdf",
  ],
] as const;
const fold = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function verifiedResult(match: Match): Match {
  if (
    match.year !== 2024 ||
    match.tournament !== "Roland Garros" ||
    !["Finished", "Review"].includes(match.status)
  )
    return match;
  const reference = verifiedResults.find((row) => row[0] === match.match_id);
  if (!reference) return match;
  const [, first, second, score, winner, source] = reference;
  const forward =
    fold(match.player1.name) === fold(first) &&
    fold(match.player2.name) === fold(second);
  const reverse =
    fold(match.player1.name) === fold(second) &&
    fold(match.player2.name) === fold(first);
  if (!forward && !reverse) return match;
  const tokens = score
    .split(" ")
    .map((token) => (reverse ? token.replace(/^(\d+)–(\d+)/, "$2–$1") : token));
  const games = tokens.map((token) =>
    token
      .match(/^(\d+)–(\d+)/)!
      .slice(1)
      .map(Number),
  );
  const side = reverse ? 3 - winner : winner;
  const changed =
    JSON.stringify(games) !== JSON.stringify(match.score_summary.games) ||
    match.winner !== side;
  return {
    ...match,
    status: "Finished",
    winner: side as 1 | 2,
    final_score: tokens.join(" "),
    score_summary: {
      ...match.score_summary,
      games,
      sets: [
        games.filter((s) => s[0] > s[1]).length,
        games.filter((s) => s[1] > s[0]).length,
      ],
    },
    statistics: changed ? [] : match.statistics,
    point_tape: changed ? [] : match.point_tape,
    context: { ...match.context, resultSource: source },
  };
}
