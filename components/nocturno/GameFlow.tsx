"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Match } from "@/lib/types";
import { lineData, number, type ReadingEvent } from "@/lib/cuaderno/model";

const WIDTH = 720;
const HEIGHT = 184;
const BASELINE = 92;
const PLOT_WIDTH = 628;
const PLOT_START = 46;
const PLOT_HEIGHT = 68;

function visibleMoments(events: ReadingEvent[], total: number) {
  const candidates = events
    .filter((event) => event.type === "break" || event.type === "match")
    .sort((a, b) => a.x - b.x);
  const selected: ReadingEvent[] = [];
  const separation = Math.max(2, total * 0.115);
  for (const event of candidates) {
    if (selected.length === 6) break;
    if (!selected.length || event.x - selected.at(-1)!.x >= separation)
      selected.push(event);
  }
  const lastMatchPoint = candidates.findLast((event) => event.type === "match");
  if (lastMatchPoint && !selected.includes(lastMatchPoint)) {
    if (
      selected.length === 6 ||
      (selected.at(-1) && lastMatchPoint.x - selected.at(-1)!.x < separation)
    )
      selected.pop();
    selected.push(lastMatchPoint);
  }
  return selected.sort((a, b) => a.x - b.x);
}

function momentText(event: ReadingEvent, names: string[]) {
  const point = event.point;
  const moment =
    event.type === "break"
      ? `Break de ${point.winner ? names[point.winner - 1] : "un jugador"}`
      : point.match_point_for
        ? `Bola de partido para ${names[point.match_point_for - 1]}`
        : "Bola de partido";
  const outcome =
    event.type === "match" && point.match_point_for && point.winner
      ? point.winner === point.match_point_for
        ? "convertida"
        : "salvada"
      : "";
  const attempts =
    event.type === "break" && event.count
      ? ` · ${event.count} bolas de break`
      : "";
  return `${moment} · set ${point.set}, juego ${point.game}${outcome ? ` · ${outcome}` : ""}${attempts}`;
}

const momentId = (event: ReadingEvent) =>
  `${event.point.set}-${event.point.game}-${event.point.point_number}`;

/** Each plotted segment is anchored by closed games; missing winners remain gaps. */
export default function GameFlow({
  match,
  extent,
  total,
  data,
}: {
  match: Match;
  extent?: number;
  total?: number;
  data?: ReturnType<typeof lineData>;
}) {
  const chart = useMemo(() => data || lineData(match), [match, data]);
  const names = [match.player1.name, match.player2.name];
  const clipId = useId().replaceAll(":", "");
  const [activePoint, setActivePoint] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const moments = useMemo(
    () => visibleMoments(chart.events, chart.total),
    [chart],
  );
  const activeIndex = moments.findIndex(
    (event) => momentId(event) === activePoint,
  );
  useEffect(() => {
    if (!playing || !moments.length) return;
    const timer = window.setTimeout(() => {
      if (activeIndex >= moments.length - 1) setPlaying(false);
      else setActivePoint(momentId(moments[activeIndex + 1]));
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [playing, activeIndex, moments]);
  if (!chart.segments.length) return null;

  const horizontalExtent = Math.max(total || 0, chart.total, 1);
  const x = (value: number) =>
    PLOT_START + (value / horizontalExtent) * PLOT_WIDTH;
  const scale = Math.max(extent || 0, chart.extent);
  const y = (value: number) => BASELINE - (value / scale) * PLOT_HEIGHT;
  const paths = chart.segments.map((segment) =>
    segment
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${x(point.x).toFixed(2)} ${y(point.y).toFixed(2)}`,
      )
      .join(" "),
  );
  const active = moments.find((event) => momentId(event) === activePoint);
  const before = active?.label.match(/, (\d+)–(\d+) en juegos/);
  const momentGames = before ? [Number(before[1]), Number(before[2])] : null;
  if (momentGames && active?.point.game_ended && active.point.winner)
    momentGames[active.point.winner - 1]++;
  const boundaries = match.score_summary.games
    .map(([first, second]) => first + second)
    .reduce<
      number[]
    >((values, count) => [...values, (values.at(-1) || 0) + count], []);
  const recorded = chart.segments.reduce(
    (sum, segment) => sum + segment.length - 1,
    0,
  );
  const partial = match.quality?.tape === "partial" || recorded < chart.total;
  const verifiedGames = chart.segments.flatMap((segment) => segment.slice(1));

  return (
    <figure className="ry-game-flow">
      <div className="ry-game-flow-heading">
        <strong>Ventaja en juegos</strong>
        <span>{chart.total} juegos</span>
      </div>
      <div className="ry-game-flow-plot">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Ventaja acumulada en juegos: eje horizontal de 0 a ${horizontalExtent}, eje vertical de ${-scale} a ${scale}. ${names[0]} por encima del cero, ${names[1]} por debajo. ${partial ? "Los tramos sin secuencia verificada no están unidos." : "Secuencia completa de juegos."}`}
          focusable="false"
        >
          <defs>
            <clipPath id={`${clipId}-upper`}>
              <rect x="0" y="0" width={WIDTH} height={BASELINE} />
            </clipPath>
            <clipPath id={`${clipId}-lower`}>
              <rect
                x="0"
                y={BASELINE}
                width={WIDTH}
                height={HEIGHT - BASELINE}
              />
            </clipPath>
            <clipPath id={`${clipId}-replay`}>
              <rect
                x={PLOT_START}
                y="0"
                width={
                  active ? Math.max(0, x(active.x) - PLOT_START) : PLOT_WIDTH
                }
                height={HEIGHT}
              />
            </clipPath>
          </defs>
          <line
            className="ry-game-flow-zero"
            x1={PLOT_START}
            x2={PLOT_START + PLOT_WIDTH}
            y1={BASELINE}
            y2={BASELINE}
          />
          {boundaries.slice(0, -1).map((boundary) => (
            <line
              className="ry-game-flow-boundary"
              key={boundary}
              x1={x(boundary)}
              x2={x(boundary)}
              y1="16"
              y2="165"
            />
          ))}
          <g clipPath={`url(#${clipId}-replay)`}>
            {paths.map((path, index) => (
              <g key={index}>
                <path
                  className="ry-game-flow-path ry-game-flow-path-first"
                  d={path}
                  clipPath={`url(#${clipId}-upper)`}
                />
                <path
                  className="ry-game-flow-path ry-game-flow-path-second"
                  d={path}
                  clipPath={`url(#${clipId}-lower)`}
                />
              </g>
            ))}
          </g>
          {active && (
            <line
              className="match-replay-cursor"
              x1={x(active.x)}
              x2={x(active.x)}
              y1="16"
              y2="165"
            />
          )}
        </svg>
        <div className="ry-game-flow-axis" aria-hidden="true">
          <span style={{ top: `${(y(scale) / HEIGHT) * 100}%` }}>
            +{number(scale)}
          </span>
          <span style={{ top: `${(BASELINE / HEIGHT) * 100}%` }}>0</span>
          <span style={{ top: `${(y(-scale) / HEIGHT) * 100}%` }}>
            −{number(scale)}
          </span>
        </div>
        {moments.map((event) => (
          <button
            className={`ry-game-flow-point ry-game-flow-point-${event.type}`}
            key={momentId(event)}
            type="button"
            aria-label={momentText(event, names)}
            aria-pressed={activePoint === momentId(event)}
            style={{
              left: `${(x(event.x) / WIDTH) * 100}%`,
              top: `${(y(event.difference) / HEIGHT) * 100}%`,
            }}
            onMouseEnter={() => setActivePoint(momentId(event))}
            onFocus={() => setActivePoint(momentId(event))}
            onClick={() => {
              setActivePoint(momentId(event));
              setPlaying(false);
            }}
          />
        ))}
      </div>
      <div className="ry-game-flow-x-axis" aria-hidden="true">
        <span>0</span>
        <span>{number(horizontalExtent)} juegos</span>
      </div>
      <figcaption className="ry-game-flow-caption">
        <span>{names[0]} ↑</span>
        <span />
        <span>{names[1]} ↓</span>
      </figcaption>
      {moments.length > 0 && (
        <div className="match-replay">
          <div className="match-replay-controls">
            <button
              type="button"
              className="match-replay-play"
              aria-label={playing ? "Pausar momentos" : "Reproducir momentos"}
              onClick={() => {
                if (
                  !playing &&
                  (activeIndex < 0 || activeIndex === moments.length - 1)
                )
                  setActivePoint(momentId(moments[0]));
                setPlaying((value) => !value);
              }}
            >
              {playing ? (
                <Pause size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
              <span>{playing ? "Pausar" : "Reproducir momentos"}</span>
            </button>
            <div>
              <button
                type="button"
                aria-label="Momento anterior"
                disabled={activeIndex <= 0}
                onClick={() => {
                  setPlaying(false);
                  setActivePoint(
                    momentId(moments[Math.max(0, activeIndex - 1)]),
                  );
                }}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Momento siguiente"
                disabled={activeIndex === moments.length - 1}
                onClick={() => {
                  setPlaying(false);
                  setActivePoint(
                    momentId(
                      moments[Math.min(moments.length - 1, activeIndex + 1)],
                    ),
                  );
                }}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          {active && (
            <div className="match-replay-moment" aria-live="polite">
              <div>
                <span>
                  Set {active.point.set} · Momento {activeIndex + 1} de{" "}
                  {moments.length}
                </span>
                {momentGames && (
                  <strong
                    aria-label={`${names[0]} ${momentGames[0]}, ${names[1]} ${momentGames[1]} en juegos`}
                  >
                    {momentGames.join("–")}
                  </strong>
                )}
              </div>
              <p>{momentText(active, names)}</p>
            </div>
          )}
          {active && (
            <button
              type="button"
              className="match-replay-reset"
              onClick={() => {
                setPlaying(false);
                setActivePoint(null);
              }}
            >
              Ver el partido completo
            </button>
          )}
        </div>
      )}
      <details className="ry-game-flow-data">
        <summary>Ver juegos en tabla</summary>
        <div className="ry-game-flow-table-scroll">
          <table>
            <caption>Juegos cerrados y verificados en esta secuencia</caption>
            <thead>
              <tr>
                <th scope="col">Juego</th>
                <th scope="col">Ventaja acumulada</th>
              </tr>
            </thead>
            <tbody>
              {verifiedGames.map((game) => (
                <tr key={game.x}>
                  <th scope="row">{number(game.x)}</th>
                  <td>
                    {game.y === 0
                      ? "Igualados"
                      : `${game.y > 0 ? names[0] : names[1]} · ${number(Math.abs(game.y))} ${Math.abs(game.y) === 1 ? "juego" : "juegos"}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
