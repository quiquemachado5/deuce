import type { Match } from "../types";
import { rankingMetrics, type RankingMetric } from "../season-analytics";
import {
  gamesInMatch,
  isDeciding,
  lostOpening,
  tiebreakCount,
} from "../archive-insights";
import { metricDefinition } from "../statistics-catalog";
import { completeGames } from "../point-integrity";
import { closeness, kind } from "./model";
import { publishedMatchMinutes } from "../duration";
export type Shelf = {
  id: string;
  label: string;
  family: string;
  definition: string;
  metric?: RankingMetric;
  select?: (m: Match) => boolean;
  value?: (m: Match) => number;
  ascending?: boolean;
  unit?: string;
  sample?: (m: Match) => boolean;
};
const metric = (
  id: string,
  key: string,
  label: string,
  family: string,
): Shelf => {
  const metric = rankingMetrics.find((m) => m.key === key)!;
  return {
    id,
    label,
    family,
    metric,
    definition: metricDefinition(metric).replace(/ Mínimo de \w+\./, ""),
  };
};
const result = (
  id: string,
  label: string,
  family: string,
  definition: string,
  select: (m: Match) => boolean,
  value?: (m: Match) => number,
): Shelf => ({ id, label, family, definition, select, value });
export const measuredKeys: Record<string, string> = {
  aces: "Aces",
  "aces-per-match": "Aces",
  "double-faults": "Double Faults",
  "first-in": "1st serve in",
  "first-won": "1st serve points won",
  "second-won": "2nd serve points won",
  "service-won": "Service points won",
  "return-won": "Return points won",
  "total-points": "Total points won",
  holds: "Service games won",
  "return-games": "Return games won",
  "first-return": "1st return points won",
  "second-return": "2nd return points won",
  "second-in": "Second serves in",
  winners: "Golpes ganadores",
  unforced: "Errores no forzados",
  forehand: "Ganadores de derecha",
  backhand: "Ganadores de revés",
  volley: "Voleas ganadoras",
  "return-winners": "Restos ganadores",
  "break-conversion": "Break points converted",
  "break-saved": "Break points saved",
  "aces-per-100": "Aces",
  "faults-per-100": "Double Faults",
  "chances-per-100": "Break points played",
  "faced-per-100": "Break points faced",
};
export function marathon(m: Match) {
  return Math.max(
    0,
    ...completeGames(m.point_tape).map(
      (g) =>
        g.filter((p) => p.score_before?.replace("–", "-") === "40-40").length,
    ),
  );
}
export const shelves: Shelf[] = [
  result(
    "juegos-por-partido",
    "Juegos por partido",
    "Resultado",
    "Media de juegos por encuentro y partidos con más juegos. Solo resultados completos.",
    () => true,
    gamesInMatch,
  ),
  result(
    "sets-por-partido",
    "Sets por partido",
    "Resultado",
    "Número de sets disputados por encuentro. Solo resultados completos.",
    () => true,
    (m) => m.score_summary.games.length,
  ),
  metric(
    "sin-ceder-set",
    "straight-sets",
    "Victorias sin ceder un set",
    "Resultado",
  ),
  result(
    "seis-cero",
    "Partidos con un 6–0",
    "Resultado",
    "Encuentros que contienen al menos un set terminado 6–0.",
    (m) =>
      m.score_summary.games.some(
        (s) => Math.max(...s) === 6 && Math.min(...s) === 0,
      ),
  ),
  metric(
    "30-30",
    "thirty-all-games",
    "Juegos ganados tras el 30–30",
    "Presión",
  ),
  metric(
    "breaks-convertidos",
    "break-conversion",
    "Breaks convertidos",
    "Presión",
  ),
  metric("breaks-salvados", "break-saved", "Breaks salvados", "Presión"),
  metric(
    "bolas-partido-salvadas",
    "matchpoints-saved",
    "Bolas de partido salvadas",
    "Presión",
  ),
  metric(
    "tie-breaks",
    "tiebreak-rate",
    "Porcentaje de tie-breaks ganados",
    "Presión",
  ),
  metric(
    "sets-decisivos",
    "deciding-rate",
    "Sets decisivos ganados",
    "Presión",
  ),
  metric(
    "porcentaje-cinco-sets",
    "five-set-rate",
    "Porcentaje en cinco sets",
    "Presión",
  ),
  metric(
    "victorias-cinco-sets",
    "five-set-wins",
    "Victorias en cinco sets",
    "Presión",
  ),
  result(
    "juegos-maratonicos",
    "Juegos maratónicos",
    "Presión",
    "Juegos con más de ocho marcadores de deuce. Solo juegos íntegros en una cinta fiable.",
    (m) => m.quality?.tape === "reliable" && marathon(m) > 8,
    marathon,
  ),
  result(
    "remontada-primer-set",
    "Remontada tras perder el primer set",
    "Transcurso",
    "Victorias después de perder el primer set. Excluye abandonos y resultados sin cerrar.",
    (m) => lostOpening(m),
  ),
  result(
    "remontada-dos-sets",
    "Remontada tras perder los dos primeros",
    "Transcurso",
    "Victorias después de empezar perdiendo dos sets. Excluye abandonos y resultados sin cerrar.",
    (m) => lostOpening(m, 2),
  ),
  result(
    "final-ultimo-set",
    "Final decidida en el último set",
    "Transcurso",
    "Finales que llegaron al set decisivo de un partido a tres o cinco sets.",
    (m) => /^final$/i.test(m.round) && isDeciding(m),
  ),
  result(
    "cinco-sets",
    "Partidos de cinco sets",
    "Transcurso",
    "Encuentros con cinco sets cerrados y ganador coherente.",
    (m) => m.score_summary.games.length === 5,
  ),
  result(
    "marcador-ajustado",
    "Marcador ajustado",
    "Transcurso",
    "Proporción media de juegos del perdedor de cada set, con diez puntos adicionales si hubo set decisivo.",
    () => true,
    closeness,
  ),
  metric("top-10", "top10-wins", "Victorias ante el top 10", "Contexto"),
  {
    ...result(
      "mas-largos",
      "Partidos más largos",
      "Contexto",
      "Duración publicada por la fuente, hasta 12 horas y sin estimar ausencias.",
      (m) => publishedMatchMinutes(m) !== null,
      (m) => publishedMatchMinutes(m)!,
    ),
    unit: "min",
  },
  {
    ...result(
      "finalistas-jovenes",
      "Finalistas más jóvenes",
      "Contexto",
      "Edad publicada de cualquiera de los dos finalistas. No se estima a partir de fechas.",
      (m) => /^final$/i.test(m.round) && !!(m.context?.age1 || m.context?.age2),
      (m) => Math.min(m.context?.age1 || Infinity, m.context?.age2 || Infinity),
    ),
    ascending: true,
    unit: "años",
  },
  {
    id: "ediciones",
    label: "Ediciones de torneo",
    family: "Contexto",
    definition:
      "La final, el camino del campeón y los resultados de una edición.",
  },
  ...rankingMetrics
    .filter(
      (m) =>
        ["Servicio", "Resto y rallies", "Golpes"].includes(m.group) &&
        !["short-rallies", "medium-rallies", "long-rallies"].includes(m.key),
    )
    .map((m) => ({
      ...metric(m.key, m.key, m.label, "Saque, resto, golpes"),
      definition: `${metricDefinition(m)} Solo partidos con este dato. La muestra no es la del archivo completo.`,
    })),
  {
    ...metric(
      "segundo-saque-break",
      "second-serve-breaks",
      "Break ante segundo saque",
      "Saque, resto, golpes",
    ),
    definition:
      "Bolas de break convertidas tras un primer saque fallado publicado. Solo partidos con este dato. La muestra no es la del archivo completo.",
  },
  ...[
    "Remates ganadores",
    "Dejadas ganadoras",
    "Globos ganadores",
    "Golpes de fondo ganadores",
    "Errores forzados",
    "Errores forzados de derecha",
    "Errores forzados de revés",
    "Errores forzados al resto",
    "Errores forzados en remates",
    "Errores forzados de fondo",
    "Errores no forzados de derecha",
    "Errores no forzados de revés",
    "Errores no forzados en volea",
    "Errores no forzados en dejadas",
    "Errores no forzados en globos",
    "Errores no forzados de fondo",
  ].map((label, index): Shelf => ({
    id: `golpes-${index + 1}`,
    label,
    family: "Saque, resto, golpes",
    definition: `${label} publicados por la fuente. Solo partidos con este dato. La muestra no es la del archivo completo.`,
    metric: {
      key: `golpes-${index + 1}`,
      label,
      group: "Golpes",
      unit: "",
      value: (r) => (r.stats[label]?.samples ? r.stats[label].value : null),
      detail: (r) => `${r.stats[label]?.samples || 0} partidos con dato`,
    },
    sample: (m) =>
      m.statistics.some((s) => s.name === label && s.period === "match"),
  })),
];
export const families = [
  ["Resultado", "Lo que cuenta el marcador."],
  ["Presión", "Lo que ocurre cuando el juego puede cambiar."],
  ["Transcurso", "De qué forma se llega al resultado."],
  ["Contexto", "Tiempo, edad, rival y edición."],
  ["Saque, resto, golpes", "Medidas publicadas, con su propia muestra."],
];
export function shelfMatches(shelf: Shelf, matches: Match[]) {
  if (shelf.sample) return matches.filter(shelf.sample);
  if (shelf.select)
    return matches
      .filter(shelf.select)
      .sort((a, b) =>
        shelf.value
          ? (shelf.ascending ? 1 : -1) * (shelf.value(a) - shelf.value(b))
          : b.year - a.year,
      );
  const key = shelf.metric?.key || "",
    field = measuredKeys[key];
  return matches.filter((m) => {
    if (field)
      return m.statistics.some(
        (s) =>
          s.period.toLowerCase() === "match" &&
          s.name.toLowerCase() === field.toLowerCase(),
      );
    if (
      ["thirty-all-games", "matchpoints-saved", "second-serve-breaks"].includes(
        key,
      )
    )
      return (
        m.quality?.tape === "reliable" &&
        (key === "thirty-all-games"
          ? m.point_tape.some(
              (p) => p.score_before?.replace("–", "-") === "30-30",
            )
          : key === "matchpoints-saved"
            ? m.point_tape.some(
                (p) =>
                  p.is_match_point &&
                  p.match_point_for &&
                  p.winner !== p.match_point_for,
              )
            : m.point_tape.some(
                (p) => p.is_break_point && p.first_serve_in === false,
              ))
      );
    if (key === "top10-wins")
      return (
        m.context?.rankLabel === "Ranking al jugar" &&
        ((m.context.rank1 || Infinity) <= 10 ||
          (m.context.rank2 || Infinity) <= 10)
      );
    if (key === "tiebreak-rate") return tiebreakCount(m) > 0;
    if (["five-set-rate", "five-set-wins"].includes(key))
      return m.score_summary.games.length === 5;
    if (key === "deciding-rate") return isDeciding(m);
    if (key === "straight-sets")
      return m.score_summary.games.every(
        (s) => s[m.winner! - 1] > s[2 - m.winner!],
      );
    return true;
  });
}
export function kindShelf(m: Match) {
  return (
    (
      {
        Remontada: lostOpening(m, 2)
          ? "remontada-dos-sets"
          : "remontada-primer-set",
        "Al límite": "cinco-sets",
        Manguito: "seis-cero",
        Roto: "breaks-convertidos",
        Cerrado: "tie-breaks",
      } as Record<string, string>
    )[kind(m) || ""] || "marcador-ajustado"
  );
}
