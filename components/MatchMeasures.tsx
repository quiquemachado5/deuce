import type { Match } from "@/lib/types";
import { measuredFields, measuredValue, number } from "@/lib/cuaderno/model";
import { matchStat, statFraction, statNumber } from "@/lib/archive-insights";
import {
  categoryLabel,
  groupStatistics,
  periodLabel,
  statLabel,
} from "@/lib/statistics";

type Datum = {
  key: string;
  values: (string | null)[];
  magnitudes: (number | null)[];
};
function Columns({ match }: { match: Match }) {
  return (
    <div className="nc-sr" role="row">
      <span role="columnheader">Medida</span>
      <span role="columnheader">{match.player1.name}</span>
      <span role="columnheader">{match.player2.name}</span>
    </div>
  );
}
function Measure({ datum }: { datum: Datum }) {
  const max = datum.values.some((v) => v?.includes("%"))
    ? 100
    : Math.max(1, ...datum.magnitudes.filter((v): v is number => v !== null));
  const comparable = datum.magnitudes.every((v) => v !== null);
  const lower = /double faults|errores|errors/i.test(datum.key);
  return (
    <div className="measure-row" role="row">
      <div className="measure-label" role="rowheader">
        {statLabel(datum.key)}
      </div>
      <div className="measure-values">
        {datum.values.map((value, i) => {
          const valueNumber = datum.magnitudes[i],
            other = datum.magnitudes[1 - i];
          const best =
            comparable &&
            valueNumber !== null &&
            other !== null &&
            (lower ? valueNumber < other : valueNumber > other);
          const [primary, sample] = value?.split(" · ") || [];
          return (
            <div className="measure-value" role="cell" data-best={best} key={i}>
              <strong>{primary || "—"}</strong>
              {sample && <span>{sample}</span>}
              {valueNumber !== null && (
                <span className="measure-track" aria-hidden="true">
                  <i
                    style={{
                      width: `${Math.max(0, Math.min(100, (valueNumber / max) * 100))}%`,
                    }}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MatchMeasures({ match }: { match: Match }) {
  const fields: Datum[] = measuredFields
    .map((key) => ({
      key,
      values: ([1, 2] as const).map((side) => measuredValue(match, side, key)),
      magnitudes: ([1, 2] as const).map((side) => {
        const fraction = statFraction(match, side, key);
        return fraction
          ? (fraction[0] / fraction[1]) * 100
          : statNumber(matchStat(match, side, key));
      }),
    }))
    .filter((row) => row.values.some((v) => v !== null));
  const groups = [
    {
      title: "Servicio",
      rows: fields.filter((f) =>
        /serve|service|aces|faults|saque/i.test(f.key),
      ),
    },
    {
      title: "Resto",
      rows: fields.filter(
        (f) => /return|resto/i.test(f.key) && !/serve|service/i.test(f.key),
      ),
    },
    {
      title: "Puntos y golpes",
      rows: fields.filter(
        (f) => !/serve|service|aces|faults|saque|return|resto/i.test(f.key),
      ),
    },
  ].filter((g) => g.rows.length);
  const extras = groupStatistics(match.statistics)
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) =>
          group.period.toLowerCase() !== "match" ||
          !measuredFields.some(
            (key) => key.toLowerCase() === row.name.toLowerCase(),
          ),
      ),
    }))
    .filter((g) => g.rows.length);
  if (!fields.length && !extras.length) return null;
  return (
    <section className="match-measurements">
      <h2>Medidas del partido</h2>
      <div className="measure-player-head">
        <span>{match.player1.name}</span>
        <span>{match.player2.name}</span>
      </div>
      {groups.map((group) => (
        <section className="measure-group" key={group.title}>
          <h3>{group.title}</h3>
          <div role="table" aria-label={group.title}>
            <Columns match={match} />
            {group.rows.map((datum) => (
              <Measure datum={datum} key={datum.key} />
            ))}
          </div>
        </section>
      ))}
      {!!extras.length && (
        <details className="measure-extra">
          <summary>
            Más estadísticas ·{" "}
            {number(extras.reduce((n, g) => n + g.rows.length, 0))}
          </summary>
          {extras.map((group) => (
            <section className="measure-group" key={group.key}>
              <h3>
                {periodLabel(group.period)} · {categoryLabel(group.category)}
              </h3>
              <div
                role="table"
                aria-label={`${periodLabel(group.period)} · ${categoryLabel(group.category)}`}
              >
                <Columns match={match} />
                {group.rows.map((row) => (
                  <Measure
                    key={row.key}
                    datum={{
                      key: row.name,
                      values: [
                        row.first?.value || null,
                        row.second?.value || null,
                      ],
                      magnitudes: [null, null],
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </details>
      )}
    </section>
  );
}
