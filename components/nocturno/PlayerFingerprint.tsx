import type { CSSProperties } from "react";
import { number } from "@/lib/cuaderno/model";
import type { PlayerRecord } from "@/lib/season-analytics";

type Fraction = { won: number; total: number; matches?: number };
type Metric = {
  label: string;
  unit: string;
  minimum: number;
  minimumMatches?: number;
  fraction: (record: PlayerRecord) => Fraction | null;
};

const extra = (record: PlayerRecord, won: string, total: string): Fraction => ({
  won: record.extra[won] || 0,
  total: record.extra[total] || 0,
});
const measured = (record: PlayerRecord, key: string): Fraction | null => {
  const value = record.stats[key];
  return value?.total ? { won: value.won, total: value.total, matches: value.samples } : null;
};

const metrics: Metric[] = [
  {
    label: "Juegos tras ganar el 30–30",
    unit: "juegos",
    minimum: 10,
    fraction: (r) => extra(r, "thirtyAllWon", "thirtyAllTotal"),
  },
  {
    label: "Breaks salvados",
    unit: "bolas de break",
    minimum: 10,
    minimumMatches: 3,
    fraction: (r) => measured(r, "Break points saved"),
  },
  {
    label: "Partidos de cinco sets",
    unit: "partidos",
    minimum: 10,
    fraction: (r) => ({ won: r.fiveSetWins, total: r.fiveSetPlayed }),
  },
  {
    label: "Remonta el primer set",
    unit: "partidos",
    minimum: 10,
    fraction: (r) => extra(r, "afterOpeningLost", "openingLost"),
  },
  {
    label: "Ante el top 10 de entonces",
    unit: "partidos",
    minimum: 10,
    fraction: (r) => extra(r, "top10Wins", "top10Played"),
  },
  {
    label: "Puntos al saque",
    unit: "puntos",
    minimum: 50,
    minimumMatches: 3,
    fraction: (r) => measured(r, "Service points won"),
  },
  {
    label: "Puntos al resto",
    unit: "puntos",
    minimum: 50,
    minimumMatches: 3,
    fraction: (r) => measured(r, "Return points won"),
  },
];

function valid(value: Fraction | null, metric: Metric): value is Fraction {
  return (
    !!value && value.total >= metric.minimum &&
    (!metric.minimumMatches || (value.matches || 0) >= metric.minimumMatches) &&
    value.won >= 0 && value.won <= value.total
  );
}
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Every bar is the player's observed rate; the mark is the median of eligible players. */
export default function PlayerFingerprint({
  player,
  archive,
}: {
  player: PlayerRecord;
  archive: PlayerRecord[];
}) {
  const rows = metrics.flatMap((metric) => {
    const fraction = metric.fraction(player);
    if (!valid(fraction, metric)) return [];
    const population = archive.map(metric.fraction).filter((value): value is Fraction => valid(value, metric));
    if (!population.length) return [];
    const value = (fraction.won / fraction.total) * 100;
    const reference = median(population.map((p) => (p.won / p.total) * 100));
    return [{ ...fraction, label: metric.label, unit: metric.unit, value, reference, cohort: population.length }];
  });
  if (rows.length < 2) return null;
  const strongest = [...rows].sort(
    (a, b) => Math.abs(b.value - b.reference) - Math.abs(a.value - a.reference),
  )[0];
  const difference = strongest.value - strongest.reference;
  const hasAboveMedian = rows.some((row) => row.value > row.reference + 0.5);
  return (
    <section
      className="ry-people-section ry-fingerprint"
      aria-labelledby="ry-fingerprint-title"
    >
      <div className="ry-people-section-head">
        <h2 id="ry-fingerprint-title">{hasAboveMedian ? "Dónde destaca" : "Rendimiento medido"}</h2>
        <span className="ry-chart-key ry-chart-key-median">Mediana del archivo</span>
      </div>
      <p className="nc-meta">Porcentajes frente a la mediana de jugadores con datos suficientes para cada medida.</p>
      <dl className="ry-fingerprint-list">
        {rows.map((row) => (
          <div className="ry-fingerprint-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              <span className="ry-fingerprint-value">
                {number(row.value, 1)} %{" "}
                <span>
                  {number(row.won)} de {number(row.total)} {row.unit}{row.total < 50 ? " · muestra pequeña" : ""}
                </span>
              </span>
              <span
                className="ry-fingerprint-track"
                aria-hidden="true"
                style={
                  {
                    "--ry-value": `${row.value}%`,
                    "--ry-median": `${row.reference}%`,
                  } as CSSProperties
                }
              >
                <span className="ry-fingerprint-fill" />
                <span className="ry-fingerprint-median" />
              </span>
              <span className="nc-sr">
                Mediana del archivo: {number(row.reference, 1)} % entre {number(row.cohort)} jugadores.
              </span>
              <span className="ry-fingerprint-reference" aria-hidden="true">
                Mediana: {number(row.reference, 1)} % · {number(row.cohort)} jugadores
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {Math.abs(difference) >= 0.5 && (
        <p className="ry-fingerprint-note">
          {strongest.label}: {number(Math.abs(difference), 1)} puntos por{" "}
          {difference > 0 ? "encima" : "debajo"} de la mediana.
        </p>
      )}
    </section>
  );
}
