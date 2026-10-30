import type { Match } from "./types";
import { roundPosition } from "./editorial";
import miamiDraw from "./verified-miami-2026.json";
import rolandGarrosDraw from "./verified-roland-garros-2026.json";
/** Result-only references for entries absent from the principal provider. No points or measurements are inferred. */
const australianOpenReferences = [
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
type EditionReference = {
  year: number;
  id: string;
  first: string;
  second: string;
  round: string;
  date: string;
  score: string;
  status: string;
  source: string;
  corroboration?: string;
  tournament: string;
  category: string;
  surface: Match["surface"];
  format: string;
  dateLabel: string;
};
const references: EditionReference[] = [
  ...australianOpenReferences.map((r) => ({
    ...r,
    year: 2026,
    tournament: "Australian Open",
    category: "Grand Slam",
    surface: "hard" as const,
    format: "BO5",
    dateLabel:
      r.status === "Walkover" ? "Fecha de la retirada" : "Fecha del partido",
  })),
  ...miamiDraw.map((r) => ({
    ...r,
    year: 2026,
    tournament: "Miami",
    category: "Masters 1000",
    surface: "hard" as const,
    format: "BO3",
    date: "2026-03-15",
    dateLabel: "Inicio del torneo",
    source: "https://www.miamiopen.com/draws/",
  })),
  ...rolandGarrosDraw.map((r) => ({
    ...r,
    year: 2026,
    tournament: "Roland Garros",
    category: "Grand Slam",
    surface: "clay" as const,
    format: "BO5",
    dateLabel: r.status === "Walkover" ? "Fecha programada" : "Fecha del partido",
    source: "https://www.rolandgarros.com/en-us/results/SM?round=1",
  })),
  {
    id: 'winston-salem-2025-korda-withdrawal',
    year: 2025,
    first: 'Marton Fucsovics',
    second: 'Sebastian Korda',
    round: 'Semifinal',
    date: '2025-08-22',
    score: '',
    status: 'Walkover',
    source: 'https://www.atptour.com/en/news/korda-winston-salem-2025-sf-withdrawal',
    corroboration: 'https://www.winstonsalemopen.com/en/media/news/korda-withdraws-from-semis',
    tournament: 'Winston-Salem',
    category: 'ATP 250',
    surface: 'hard',
    format: 'BO3',
    dateLabel: 'Fecha de la retirada',
  },
];
export const editionReferenceMatches: Match[] = references.map((r) => {
  const games = [...r.score.matchAll(/(\d+)–(\d+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
  return {
    match_id: `reference-${r.id}`,
    tournament: r.tournament,
    year: r.year,
    category: r.category,
    surface: r.surface,
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
      dateLabel: r.dateLabel,
      format: r.format,
      resultSource: r.source,
      ...(r.corroboration ? { metadataSources: [{ field: 'resultado', url: r.corroboration }] } : {}),
    },
  };
});
const fold = (value: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    tomasverabarrios: "tomasbarriosvera",
    danielmeridaaguilar: "danielmerida",
    danieladolfovallejo: "adolfodanielvallejo",
    colemanchaklamwong: "colemanwong",
  };
  return aliases[normalized] || normalized;
};
const identity = (m: Match) =>
  [
    m.tour || 'atp',
    m.tournament,
    m.year,
    roundPosition(m.round) || m.round,
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
