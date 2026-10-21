import Link from "next/link";
import type { ReactNode } from "react";
import type { Match } from "@/lib/types";
import { durationLabel } from "@/lib/editorial";
import {
  statLabel,
  categoryLabel,
  periodLabel,
  groupStatistics,
} from "@/lib/statistics";
import { type RivalrySummary } from "@/lib/explore";
import {
  tapeState,
  pressure,
  measuredFields,
  measuredValue,
  number,
  lineData,
} from "@/lib/cuaderno/model";
import ReadingLine from "./ReadingLine";
import MatchHero from "@/components/MatchHero";
import { tournamentCourt } from "@/lib/tournament-presentation";
import MatchTabs, { type MatchView } from "./MatchTabs";

export function ReadingHead({
  match,
  reduced = false,
}: {
  match: Match;
  home?: boolean;
  reduced?: boolean;
}) {
  return <MatchHero match={match} reduced={reduced} />;
}

function MatchPressure({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  const players = pressure(match),
    names = [match.player1.name, match.player2.name];
  const winnerIndex = match.winner === 2 ? 1 : 0;
  const loserIndex = 1 - winnerIndex;
  const metrics = [
    { key: "converted" as const, label: "Bolas de break convertidas" },
    { key: "saved" as const, label: "Bolas de break salvadas" },
    { key: "matchPoints" as const, label: "Bolas de partido" },
    { key: "thirty" as const, label: "Juegos tras ganar el 30–30" },
  ].filter((metric) => players.some((player) => player[metric.key][1] > 0));
  if (!metrics.length)
    return compact ? null : (
      <div className="ry-match-empty">
        <h2>Presión</h2>
        <p>No hay oportunidades de presión verificables para este partido.</p>
      </div>
    );
  return (
    <section className={`ry-pressure${compact ? " ry-pressure-compact" : ""}`}>
      <div className="ry-section-heading">
        <h2>Rendimiento bajo presión</h2>
        <span>Éxitos / oportunidades</span>
      </div>
      {match.winner && players.every((player) => player.converted[1] > 0) && (
        <p className="ry-pressure-insight">
          {names[winnerIndex]} convirtió{" "}
          {number(players[winnerIndex].converted[0])} de{" "}
          {number(players[winnerIndex].converted[1])} bolas de break;{" "}
          {names[loserIndex]}, {number(players[loserIndex].converted[0])} de{" "}
          {number(players[loserIndex].converted[1])}.
        </p>
      )}
      <div className="ry-player-legend">
        {names.map((name, index) => (
          <span className={`ry-player-${index + 1}`} key={name}>
            <i aria-hidden="true" />
            {name}
          </span>
        ))}
      </div>
      <div className="ry-pressure-metrics">
        {metrics.map((metric) => (
          <div className="ry-pressure-metric" key={metric.key}>
            <h3>{metric.label}</h3>
            {players.map((player, index) => {
              const [won, total] = player[metric.key],
                percent = total > 0 ? Math.round((won / total) * 100) : null;
              if (percent === null) return null;
              return (
                <div
                  className={`ry-pressure-row ry-player-${player.side}${total < 3 ? " ry-pressure-row-sparse" : ""}`}
                  key={player.side}
                >
                  <div className="ry-pressure-value">
                    <span>
                      {names[index]}
                      {metric.key === "matchPoints" && total > 0 && (
                        <small>
                          {player.matchLabel.replace("Bolas de partido ", "")}
                        </small>
                      )}
                    </span>
                    <strong>
                      {number(won)} <span>de</span> {number(total)}
                      {total >= 3 && <small>{number(percent)} %</small>}
                    </strong>
                  </div>
                  {total >= 3 && (
                    <div className="ry-pressure-track" aria-hidden="true">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function MatchMeasures({ match }: { match: Match }) {
  const fields = measuredFields
    .map((key) => ({
      key,
      values: ([1, 2] as const).map((side) => measuredValue(match, side, key)),
    }))
    .filter((row) => row.values.some((value) => value !== null));
  const extraGroups = groupStatistics(match.statistics)
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
    .filter((group) => group.rows.length);
  if (!fields.length && !extraGroups.length)
    return (
      <div className="ry-match-empty">
        <h2>Medidas del partido</h2>
        <p>La fuente no publicó medidas para este partido.</p>
      </div>
    );
  const groups = [
    {
      title: "Servicio",
      fields: fields.filter(({ key }) =>
        /serve|service|aces|double faults|saque/i.test(key),
      ),
    },
    {
      title: "Resto",
      fields: fields.filter(
        ({ key }) =>
          /return|break points converted|resto/i.test(key) &&
          !/serve|service|saque/i.test(key),
      ),
    },
    {
      title: "Puntos y golpes",
      fields: fields.filter(
        ({ key }) =>
          !/serve|service|aces|double faults|saque|return|break points converted|resto/i.test(
            key,
          ),
      ),
    },
  ].filter((group) => group.fields.length);
  const magnitude = (value: string | null) =>
    value
      ? Number(
          value
            .match(/^[\d.,]+/)?.[0]
            .replace(/\./g, "")
            .replace(",", "."),
        )
      : NaN;
  return (
    <section className="ry-measures">
      <div className="ry-section-heading">
        <h2>Medidas del partido</h2>
      </div>
      {groups.map((group) => (
        <div className="ry-stat-group" key={group.title}>
          <h3>{group.title}</h3>
          <div className="ry-table-scroll">
            <table className="ry-stat-table">
              <caption className="nc-sr">
                {group.title}, estadísticas publicadas para este partido.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Dato</th>
                  <th scope="col">{match.player1.name}</th>
                  <th scope="col">{match.player2.name}</th>
                </tr>
              </thead>
              <tbody>
                {group.fields.map((field) => {
                  const values = field.values.map(magnitude),
                    common = field.values.some((value) => value?.includes("%"))
                      ? 100
                      : Math.max(1, ...values.filter(Number.isFinite));
                  return (
                    <tr key={field.key}>
                      <th scope="row">{statLabel(field.key)}</th>
                      {field.values.map((value, index) => (
                        <td
                          key={index}
                          data-player={
                            index === 0
                              ? match.player1.name
                              : match.player2.name
                          }
                        >
                          {value ? (
                            <span className="ry-measure-cell">
                              <strong>{value}</strong>
                              {Number.isFinite(values[index]) && (
                                <i
                                  aria-hidden="true"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, (values[index] / common) * 100))}%`,
                                  }}
                                />
                              )}
                            </span>
                          ) : (
                            <span
                              className="ry-no-value"
                              aria-label="No publicado"
                            >
                              —
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {extraGroups.length > 0 && (
        <details className="ry-more-measures">
          <summary>
            Más medidas publicadas ·{" "}
            {number(
              extraGroups.reduce((sum, group) => sum + group.rows.length, 0),
            )}
          </summary>
          {extraGroups.map((group) => (
            <div className="ry-stat-group" key={group.key}>
              <h3>
                {periodLabel(group.period)} · {categoryLabel(group.category)}
              </h3>
              <div className="ry-table-scroll">
                <table className="ry-stat-table">
                  <caption className="nc-sr">
                    {periodLabel(group.period)}, {categoryLabel(group.category)}
                    .
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Dato</th>
                      <th scope="col">{match.player1.name}</th>
                      <th scope="col">{match.player2.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.key}>
                        <th scope="row">{statLabel(row.name)}</th>
                        {[row.first, row.second].map((stat, index) => (
                          <td
                            key={index}
                            data-player={
                              index === 0
                                ? match.player1.name
                                : match.player2.name
                            }
                          >
                            {stat?.value && stat.value !== "—" ? (
                              stat.value
                            ) : (
                              <span
                                className="ry-no-value"
                                aria-label="No publicado"
                              >
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

function SummaryMeasures({ match }: { match: Match }) {
  const keys = [
    "Aces",
    "1st serve points won",
    "2nd serve points won",
    "Return points won",
  ];
  const rows = keys
    .map((key) => ({
      key,
      values: ([1, 2] as const).map((side) => measuredValue(match, side, key)),
    }))
    .filter((row) => row.values.every((value) => value !== null));
  if (!rows.length) return null;
  return (
    <section className="match-summary-measures">
      <h2>Principales cifras</h2>
      <div className="match-summary-names">
        <span>{match.player1.name}</span>
        <span>{match.player2.name}</span>
      </div>
      {rows.map((row) => (
        <div className="match-summary-datum" key={row.key}>
          <span>{row.values[0]}</span>
          <h3>{statLabel(row.key)}</h3>
          <span>{row.values[1]}</span>
        </div>
      ))}
    </section>
  );
}

function MatchContext({ match }: { match: Match }) {
  const context = match.context;
  const historicalRanks = context?.rankLabel === "Ranking al jugar";
  const rows = [match.player1.name, match.player2.name].map((name, index) => ({
    name,
    age: index === 0 ? context?.age1 : context?.age2,
    rank: historicalRanks
      ? index === 0
        ? context?.rank1
        : context?.rank2
      : null,
  }));
  const hasAge = rows.some((row) => row.age);
  const hasRank = rows.some((row) => row.rank);
  if (!context?.minutes && !hasAge && !hasRank && context?.indoor !== true)
    return null;
  return (
    <section className="ry-match-context">
      <h2>En aquel momento</h2>
      {context?.minutes ? (
        <div className="match-context-duration">
          <span>Duración</span>
          <strong>{durationLabel(context.minutes)}</strong>
        </div>
      ) : null}
      {(hasAge || hasRank) && (
        <table className="match-context-table">
          <caption className="nc-sr">
            Edad y ranking en la fecha del partido
          </caption>
          <thead>
            <tr>
              <th scope="col">Jugador</th>
              {hasAge && <th scope="col">Edad</th>}
              {hasRank && <th scope="col">Ranking</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                {hasAge && (
                  <td>{row.age ? `${number(row.age, 1)} años` : "—"}</td>
                )}
                {hasRank && <td>{row.rank ? number(row.rank) : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {context?.indoor === true && (
        <p className="match-context-venue">Pista cubierta</p>
      )}
    </section>
  );
}

function MatchSidebar({
  match,
  rivalry,
}: {
  match: Match;
  rivalry?: RivalrySummary;
}) {
  return (
    <aside className="ry-match-sidebar" aria-label="Contexto del partido">
      <MatchContext match={match} />
      {rivalry && (
        <section className="ry-match-h2h">
          <h2>Cara a cara</h2>
          <div>
            {[match.player1.name, match.player2.name].map((name, index) => (
              <p key={name} className={`ry-player-${index + 1}`}>
                <span>{name}</span>
                <strong>
                  {number(rivalry.wins[rivalry.names.indexOf(name)])}
                </strong>
              </p>
            ))}
          </div>
          <p className="ry-data-note">
            {number(rivalry.matches.length)} partidos en este archivo
          </p>
          <Link href={`/rivalries/${rivalry.slug}`}>Ver enfrentamientos</Link>
        </section>
      )}
    </aside>
  );
}

export function ReadingBody({ match }: { match: Match }) {
  return (
    <>
      <MatchPressure match={match} />
      <MatchMeasures match={match} />
      <MatchContext match={match} />
    </>
  );
}

export default function Reading({
  match,
  rivalry,
  around,
  initial = "resumen",
  baseHref,
}: {
  match: Match;
  rivalry?: RivalrySummary;
  home?: boolean;
  around?: ReactNode;
  initial?: MatchView;
  baseHref?: string;
}) {
  const hasPressure = pressure(match).some((player) =>
    [player.thirty, player.converted, player.saved, player.matchPoints].some(
      (metric) => metric[1] > 0,
    ),
  );
  const hasMeasures = match.statistics.some(
    (stat) => stat.player !== null && stat.value !== "—",
  );
  const hasFlow = lineData(match).segments.length > 0;
  const panels: { id: MatchView; label: string; content: ReactNode }[] = [
    {
      id: "resumen",
      label: "Resumen",
      content: (
        <>
          <ReadingLine match={match} />
          {!hasFlow && (
            <>
              <SummaryMeasures match={match} />
              <MatchPressure match={match} compact />
            </>
          )}
          <div className="ry-match-close">
            <Link href={`/compare?left=${encodeURIComponent(match.match_id)}`}>
              Comparar con otro partido
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8h10m-4-4 4 4-4 4" />
              </svg>
            </Link>
          </div>
        </>
      ),
    },
    ...(hasPressure
      ? [
          {
            id: "presion" as const,
            label: "Presión",
            content: <MatchPressure match={match} />,
          },
        ]
      : []),
    ...(hasMeasures
      ? [
          {
            id: "medidas" as const,
            label: "Medidas",
            content: <MatchMeasures match={match} />,
          },
        ]
      : []),
    {
      id: "alrededor",
      label: "Histórico",
      content: (
        <div className="ry-match-history">
          <div className="ry-section-heading">
            <h2>La historia del cruce</h2>
          </div>
          {around || (
            <Link
              className="ry-compare-action"
              href={`/compare?left=${encodeURIComponent(match.match_id)}`}
            >
              Comparar con otro partido
            </Link>
          )}
          <details className="match-registration" id="registro">
            <summary>Información de este registro</summary>
            <h2>Registro del partido</h2>
            <p>{tapeState(match)}</p>
            <p>
              La línea conserva los juegos que pueden verificarse con el
              marcador.
            </p>
            <Link className="nc-link" href="/cobertura">
              Cobertura
            </Link>
            <Link className="nc-link" href="/info">
              Cómo se lee
            </Link>
          </details>
        </div>
      ),
    },
  ];
  return (
    <div
      className={`ry-match${rivalry?.names[0] === match.player2.name ? " ry-pair-flipped" : ""}`}
      data-event-surface={tournamentCourt(match).surface}
      data-event-category={match.category}
    >
      <ReadingHead match={match} />
      <div className="ry-match-layout">
        <div className="ry-match-body">
          <MatchTabs
            key={`${match.match_id}-${initial}`}
            initial={initial}
            baseHref={baseHref || `/match/${match.match_id}`}
            panels={panels}
          />
        </div>
        <MatchSidebar match={match} rivalry={rivalry} />
      </div>
    </div>
  );
}
