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
  score,
  tapeState,
  pressure,
  measuredFields,
  measuredValue,
  number,
  lineData,
} from "@/lib/cuaderno/model";
import ReadingLine from "./ReadingLine";
import MatchHero from "@/components/MatchHero";
import MatchTabs, { type MatchView } from "./MatchTabs";
import ScoreText from "@/components/ScoreText";

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

function TieBreaks({ match }: { match: Match }) {
  const ties = lineData(match).tiebreaks,
    names = [match.player1.name, match.player2.name];
  if (!ties.length) return null;
  return (
    <section className="ry-tiebreaks">
      <div className="ry-section-heading">
        <h2>Tie-breaks</h2>
        <span>Punto a punto</span>
      </div>
      {ties.map((points) => (
        <div className="ry-tiebreak" key={points[0].set}>
          <p>
            Set {points[0].set}
            <strong>
              <ScoreText value={score(match).split(", ")[points[0].set - 1]} />
            </strong>
          </p>
          <ol
            className="ry-tiebreak-points"
            aria-label={`Puntos del tie-break del set ${points[0].set}`}
          >
            {points.map((point, index) => (
              <li
                className={`ry-tiebreak-point ry-point-winner-${point.winner}${point.server !== point.winner ? " ry-point-minibreak" : ""}${index === points.length - 1 ? " ry-point-close" : ""}`}
                key={point.point_number}
              >
                <span className="nc-sr">
                  Punto {index + 1}. Saca {names[(point.server || 1) - 1]}; gana{" "}
                  {names[(point.winner || 1) - 1]}.
                  {index === points.length - 1 ? " Cierra el set." : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
      <p className="nc-sr">
        Cada marca es un punto ganado. El contorno indica un minibreak.
      </p>
    </section>
  );
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

function MatchContext({ match }: { match: Match }) {
  const context = match.context,
    historicalRanks = context?.rankLabel === "Ranking al jugar",
    names = [match.player1.name, match.player2.name];
  const hasContext = Boolean(
    context?.minutes ||
      context?.indoor === true ||
      context?.age1 ||
      context?.age2 ||
      (historicalRanks && (context?.rank1 || context?.rank2)),
  );
  if (!hasContext) return null;
  return (
    <section className="ry-match-context">
      <h2>Contexto</h2>
      <dl>
        {context?.minutes ? (
          <div>
            <dt>Duración</dt>
            <dd>{durationLabel(context.minutes)}</dd>
          </div>
        ) : null}
        {context?.indoor === true && (
          <div>
            <dt>Pista</dt>
            <dd>Cubierta</dd>
          </div>
        )}
      </dl>
      {context &&
        names.map((name, index) => {
          const age = index === 0 ? context.age1 : context.age2,
            rank = historicalRanks
              ? index === 0
                ? context.rank1
                : context.rank2
              : null;
          return age || rank ? (
            <div
              className={`ry-context-player ry-player-${index + 1}`}
              key={name}
            >
              <h3>{name}</h3>
              <dl>
                {age ? (
                  <div>
                    <dt>Edad al jugar</dt>
                    <dd>{number(age, 1)} años</dd>
                  </div>
                ) : null}
                {rank ? (
                  <div>
                    <dt>Ranking al jugar</dt>
                    <dd>{number(rank)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null;
        })}
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
  const panels: { id: MatchView; label: string; content: ReactNode }[] = [
    {
      id: "resumen",
      label: "Resumen",
      content: (
        <>
          <ReadingLine match={match} />
          <TieBreaks match={match} />
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
          <section className="match-registration" id="registro">
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
          </section>
          <div className="ry-section-heading">
            <h2>Histórico y comparación</h2>
          </div>
          {around || (
            <Link
              className="ry-compare-action"
              href={`/compare?left=${encodeURIComponent(match.match_id)}`}
            >
              Comparar con otro partido
            </Link>
          )}
        </div>
      ),
    },
  ];
  return (
    <div
      className={`ry-match${rivalry?.names[0] === match.player2.name ? " ry-pair-flipped" : ""}`}
      data-event-surface={match.surface}
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
