"use client";

import { useId, useState } from "react";
import type { Match } from "@/lib/types";
import { lineData, number, tapeState } from "@/lib/cuaderno/model";

export default function ReadingLine({ match, scale }: {
  match: Match;
  scale?: { total: number; extent: number };
}) {
  const data = lineData(match),
    scoreOnly = !match.point_tape.length && match.quality?.tape !== "partial",
    [selected, setSelected] = useState<number | null>(null),
    id = useId().replace(/:/g, "");
  let segments = data.segments;
  if (scoreOnly) {
    let games = 0, difference = 0;
    segments = [[{ x: 0, y: 0 }, ...match.score_summary.games.map(([a, b]) => {
      games += a + b;
      difference += a - b;
      return { x: games, y: difference };
    })]];
  }
  const total = Math.max(1, scale?.total || 0, data.total, ...segments.flat().map((point) => point.x)),
    extent = Math.max(2, scale?.extent || 0, data.extent, ...segments.flat().map((point) => Math.abs(point.y))),
    x = (value: number) => 24 + (value / total) * 952,
    y = (value: number) => 110 - (value / extent) * 80,
    event = selected === null ? null : data.events[selected],
    visible: number[] = [];
  for (const item of data.events.map((item, index) => ({ item, index })).sort((a, b) => ({ break: 2, thirty: 1, match: 3 })[b.item.type] - ({ break: 2, thirty: 1, match: 3 })[a.item.type])) {
    if (visible.every((index) => Math.abs(data.events[index].x - item.item.x) / total > 0.14)) visible.push(item.index);
  }
  const caption = scoreOnly ? "Solo marcador: la línea une los cierres de set, sin reconstruir puntos." : match.quality?.tape === "partial" ? "Secuencia incompleta: los huecos del registro permanecen abiertos." : "Cada paso representa un juego terminado. La línea mide diferencia de juegos, no probabilidad de victoria.",
    hasLine = segments.some((segment) => segment.length > 1);
  const boundaries = match.score_summary.games.slice(0, -1).map((_, index) => ({ at: match.score_summary.games.slice(0, index + 1).reduce((sum, [a, b]) => sum + a + b, 0), set: index + 1 }));
  return <figure className="ry-game-line">
    <div className="ry-section-heading"><h2>Evolución del marcador</h2><span>Diferencia de juegos</span></div>
    <div className="ry-player-legend"><span className="ry-player-1"><i aria-hidden="true"/>{match.player1.name}</span><span className="ry-player-2"><i aria-hidden="true"/>{match.player2.name}</span></div>
    {hasLine && <>
      <div className="ry-game-line-plot">
        <span className="ry-game-scale ry-game-scale-top">+{number(extent)}</span><span className="ry-game-scale ry-game-scale-zero">0</span><span className="ry-game-scale ry-game-scale-bottom">−{number(extent)}</span>
        <div className="ry-game-drawing"><svg role="img" aria-label={`Ventaja acumulada de juegos entre ${match.player1.name} y ${match.player2.name}. ${scoreOnly ? "La línea une los cierres de set." : match.quality?.tape === "partial" ? "Los huecos del registro no se unen." : "Cada paso representa un juego terminado."}`} viewBox="0 0 1000 220" preserveAspectRatio="none">
          <defs><clipPath id={`${id}-above`}><rect x="0" y="0" width="1000" height="110"/></clipPath><clipPath id={`${id}-below`}><rect x="0" y="110" width="1000" height="110"/></clipPath></defs>
          {[30, 70, 150, 190].map((at) => <line key={at} className="ry-game-grid" x1="24" x2="976" y1={at} y2={at}/>)}
          <line className="ry-game-zero" x1="24" x2="976" y1="110" y2="110"/>
          {boundaries.map((item) => <line key={item.set} className="ry-game-set-boundary" x1={x(item.at)} x2={x(item.at)} y1="20" y2="200"/>)}
          {segments.map((segment, index) => {
            const d = segment.map((point, i) => i === 0 ? `M${x(point.x)},${y(point.y)}` : scoreOnly ? `L${x(point.x)},${y(point.y)}` : `L${x(point.x)},${y(segment[i - 1].y)} L${x(point.x)},${y(point.y)}`).join(" ");
            return <g key={index}><path className={`ry-game-line-stroke ry-line-first${scoreOnly ? " ry-line-score-only" : ""}`} d={d} clipPath={`url(#${id}-above)`}/><path className={`ry-game-line-stroke ry-line-second${scoreOnly ? " ry-line-score-only" : ""}`} d={d} clipPath={`url(#${id}-below)`}/>{scoreOnly && segment.slice(1).map((point) => <circle className={point.y >= 0 ? "ry-game-close-first" : "ry-game-close-second"} cx={x(point.x)} cy={y(point.y)} r="4" key={point.x}/>)}</g>;
          })}
        </svg>
        {!scoreOnly && data.events.map((item, index) => <span key={`${item.point.point_number}-${index}`} aria-hidden="true" className={`ry-game-marker ry-game-marker-${item.type}${selected === index ? " ry-game-marker-selected" : ""}`} style={{ left: `${x(item.x) / 10}%`, top: `${y(item.difference) / 2.2}%` }}/>) }
        {!scoreOnly && visible.map((index) => { const item = data.events[index]; return <button key={index} type="button" className="ry-game-event" style={{ left: `${x(item.x) / 10}%`, top: `${y(item.difference) / 2.2}%` }} aria-label={`${item.label}. ${item.count}`} aria-pressed={selected === index} onFocus={() => setSelected(index)} onMouseEnter={() => setSelected(index)} onClick={() => setSelected(index)}/>; })}
        </div>
      </div>
      <div className="ry-game-line-axis"><span>Inicio</span>{boundaries.map((item) => <span key={item.set} style={{ left: `${x(item.at) / 10}%` }}>Set {item.set}</span>)}<span>{number(total)} juegos</span></div>
    </>}
    {!scoreOnly && data.events.length > 0 && <div className="ry-game-moment">
      <button type="button" aria-label="Momento anterior" onClick={() => setSelected(selected === null ? data.events.length - 1 : (selected - 1 + data.events.length) % data.events.length)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5"/></svg></button>
      <p aria-live="polite">{event ? <><strong>{event.label}</strong>{event.count && <span>{event.count}</span>}</> : <><strong>{number(data.events.length)} momentos registrados</strong><span>Explora breaks, 30–30 y bolas de partido</span></>}</p>
      <button type="button" aria-label="Momento siguiente" onClick={() => setSelected(selected === null ? 0 : (selected + 1) % data.events.length)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button>
    </div>}
    <figcaption className="ry-data-note">{caption}</figcaption>
    {data.unpositioned.length > 0 && <details className="ry-unpositioned"><summary>{number(data.unpositioned.length)} juegos completos sin posición en la línea</summary><p className="ry-data-note">Los huecos anteriores impiden situar su ventaja acumulada.</p>{data.unpositioned.map((game) => <p className="ry-unpositioned-game" key={`${game.set}-${game.game}`}>Set {game.set} · juego {game.game}<span>Ganó {game.winner === 1 ? match.player1.name : match.player2.name}</span></p>)}</details>}
    {!hasLine && !data.unpositioned.length && <p className="ry-match-empty-line">{tapeState(match) === "Secuencia incompleta" ? "No hay juegos completos que se puedan situar." : "No hay una secuencia de juegos disponible."}</p>}
  </figure>;
}
