import Link from "next/link";
import type { ReactNode } from "react";
import type { Match } from "@/lib/types";
import { durationLabel } from "@/lib/editorial";
import {
  statLabel,
} from "@/lib/statistics";
import { comparisonHref, type RivalrySummary } from "@/lib/explore";
import {
  pressure,
  measuredValue,
  number,
} from "@/lib/cuaderno/model";
import MatchMeasures from "@/components/MatchMeasures";
import MatchHero from "@/components/MatchHero";
import { tournamentCourt } from "@/lib/tournament-presentation";
import MatchTabs, { type MatchView } from "./MatchTabs";
import PlayerFlag from "@/components/PlayerFlag";
import { toMatchRecord } from "@/data/map-match";

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
  if (!context?.minutes && !hasAge && !hasRank) return null;
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
    </section>
  );
}

function RivalrySnapshot({match,rivalry}:{match:Match;rivalry:RivalrySummary}) {
  const values=[match.player1.name,match.player2.name].map(name=>rivalry.wins[rivalry.names.indexOf(name)]||0);
  return <section className="ry-match-h2h ry-match-h2h-integrated">
    <div><span>Cara a cara</span><h2>{match.player1.name} <i>VS</i> {match.player2.name}</h2></div>
    <p className="ry-match-h2h-score" aria-label={`${match.player1.name}: ${values[0]} victorias. ${match.player2.name}: ${values[1]} victorias.`}><strong className={values[0]>values[1]?'is-leading':undefined}>{number(values[0])}</strong><span>–</span><strong className={values[1]>values[0]?'is-leading':undefined}>{number(values[1])}</strong></p>
    <Link href={comparisonHref(match.player1.name,match.player2.name)}>Comparar jugadores</Link>
  </section>;
}

function MatchSidebar({ match }: { match: Match }) {
  return (
    <aside className="ry-match-sidebar" aria-label="Contexto del partido">
      <MatchContext match={match} />
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
  const record = toMatchRecord(match);
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
          <section className="match-games-summary"><h2>El partido en cifras</h2><div className="match-games-pair">{[match.player1, match.player2].map((player, side) => <div key={player.name}><span className="match-games-player">{record.players[side]?.countryCode&&<PlayerFlag code={record.players[side].countryCode}/>}<b>{player.name}</b></span><strong>{match.score_summary.games.reduce((sum, set) => sum + set[side], 0)}</strong><span>juegos ganados</span></div>)}</div></section>
          <SummaryMeasures match={match} />
          <MatchPressure match={match} compact />
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
      label: "Cara a cara",
      content: (
        <div className="ry-match-history">
          {rivalry&&<RivalrySnapshot match={match} rivalry={rivalry}/>}
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
        <MatchSidebar match={match} />
      </div>
    </div>
  );
}
