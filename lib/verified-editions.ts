import type { Match } from "./types";
/** Result-only references for entries absent from the principal provider. No points or measurements are inferred. */
const references = [
  {
    id: "ao-2026-ms601",
    first: "Carlos Alcaraz",
    second: "Alexander Zverev",
    round: "Semifinal",
    date: "2026-01-30",
    score: "6–4 7–6(5) 6–7(3) 6–7(4) 7–5",
    status: "Finished",
    source:
      "https://www.atptour.com/en/news/alcaraz-zverev-australian-open-2026-sf",
  },
  {
    id: "ao-2026-ms602",
    first: "Novak Djokovic",
    second: "Jannik Sinner",
    round: "Semifinal",
    date: "2026-01-30",
    score: "3–6 6–3 4–6 6–4 6–4",
    status: "Finished",
    source:
      "https://ausopen.com/articles/news/daily-download-your-rapid-recap-day-13-australian-open-2026",
  },
  {
    id: "ao-2026-ms701",
    first: "Carlos Alcaraz",
    second: "Novak Djokovic",
    round: "Final",
    date: "2026-02-01",
    score: "2–6 6–2 6–3 7–5",
    status: "Finished",
    source: "https://ausopen.com/history/honour-roll/mens-singles",
  },
  {
    id: "ao-2026-mensik-withdrawal",
    first: "Novak Djokovic",
    second: "Jakub Mensik",
    round: "Octavos de final",
    date: "2026-01-25",
    score: "",
    status: "Walkover",
    source:
      "https://www.atptour.com/en/news/mensik-australian-open-2026-withdrawal",
  },
] as const;
export const editionReferenceMatches: Match[] = references.map((r) => {
  const games = [...r.score.matchAll(/(\d+)–(\d+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
  return {
    match_id: `reference-${r.id}`,
    tournament: "Australian Open",
    year: 2026,
    category: "Grand Slam",
    surface: "hard",
    player1: { name: r.first, seed: null },
    player2: { name: r.second, seed: null },
    round: r.round,
    status: r.status,
    winner: 1,
    final_score: r.score,
    score_summary: {
      games,
      sets: games.length
        ? [
            games.filter(([a, b]) => a > b).length,
            games.filter(([a, b]) => b > a).length,
          ]
        : [],
      points: [],
      server: null,
      is_tiebreak: false,
      win_probability_p1: null,
      timestamp: r.date + "T00:00:00Z",
    },
    data_source: "reference",
    point_tape: [],
    statistics: [],
    context: {
      date: r.date,
      dateLabel:
        r.status === "Walkover" ? "Fecha de la retirada" : "Fecha del partido",
      format: "BO5",
      resultSource: r.source,
    },
  };
});
const fold = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const identity = (m: Match) =>
  [
    m.tournament,
    m.year,
    m.round,
    [fold(m.player1.name), fold(m.player2.name)].sort().join("|"),
  ].join("|");
/** Provider IDs remain stable; matching official references repair or fill the same contest. */
export function mergeEditionReferences(
  source: Match[],
  year?: number,
): Match[] {
  const keys = new Set(source.map(identity)),
    byKey = new Map(editionReferenceMatches.map((m) => [identity(m), m]));
  const rows = source.map((m) => {
    const ref = byKey.get(identity(m));
    if (!ref || !["Finished", "Review", "Walkover"].includes(m.status))
      return m;
    const reversed = fold(m.player1.name) !== fold(ref.player1.name),
      games = ref.score_summary.games.map(([a, b]) =>
        reversed ? [b, a] : [a, b],
      );
    const changed =
      JSON.stringify(games) !== JSON.stringify(m.score_summary.games) ||
      m.winner !== (reversed ? 2 : 1);
    return {
      ...m,
      final_score: reversed
        ? ref.final_score.replace(/(\d+)–(\d+)/g, "$2–$1")
        : ref.final_score,
      score_summary: {
        ...m.score_summary,
        games,
        sets: reversed
          ? [...ref.score_summary.sets].reverse()
          : ref.score_summary.sets,
      },
      status: ref.status,
      winner: (reversed ? 2 : 1) as 1 | 2,
      point_tape: changed ? [] : m.point_tape,
      statistics: changed ? [] : m.statistics,
      context: { ...m.context, resultSource: ref.context?.resultSource },
    };
  });
  return [
    ...rows,
    ...editionReferenceMatches.filter(
      (m) => (!year || m.year === year) && !keys.has(identity(m)),
    ),
  ];
}
