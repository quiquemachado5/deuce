"use client";

import { useMemo } from "react";
import type { Match } from "@/lib/types";
import { lineData, score } from "@/lib/cuaderno/model";
import GameFlow from "./GameFlow";

export default function ReadingLine({ match }: { match: Match }) {
  const chart = useMemo(() => lineData(match), [match]);
  if (
    !chart.segments.length ||
    match.status !== "Finished" ||
    match.quality?.result === "review"
  )
    return null;
  const names = [match.player1.name, match.player2.name];
  return (
    <section className="ds-match-story" aria-label="El desarrollo del partido">
      <div className="ry-section-heading">
        <h2>Juegos registrados</h2>
      </div>
      <GameFlow match={match} data={chart} />
      {chart.tiebreaks.map((points) => {
        let first = 0,
          second = 0;
        const counts = points.map((point) => {
          if (point.winner === 1) first++;
          else if (point.winner === 2) second++;
          return { point, score: `${first}–${second}` };
        });
        const winner = first > second ? 0 : 1;
        const mini = points.filter(
          (point) =>
            point.server && point.winner && point.server !== point.winner,
        ).length;
        return (
          <details className="match-tiebreak-detail" key={points[0].set}>
            <summary>
              <span>Tie-break · set {points[0].set}</span>
              <strong>{score(match).split(", ")[points[0].set - 1]}</strong>
            </summary>
            <p>
              {names[winner]} ganó {Math.max(first, second)}–
              {Math.min(first, second)} puntos
              {mini ? ` · ${mini} minibreak${mini === 1 ? "" : "s"}` : ""}.
            </p>
            <ol
              className="match-tiebreak-counts"
              aria-label={`Marcador del tie-break del set ${points[0].set}`}
            >
              {counts.map(({ point, score: tally }, index) => (
                <li
                  key={point.point_number}
                  data-player={point.winner}
                  data-minibreak={Boolean(
                    point.server && point.server !== point.winner,
                  )}
                  className={
                    index === counts.length - 1
                      ? "match-tiebreak-close"
                      : undefined
                  }
                >
                  <span aria-hidden="true">{tally}</span>
                  <span className="nc-sr">
                    Punto {index + 1}: {tally}. Ganó{" "}
                    {point.winner ? names[point.winner - 1] : "sin registrar"}.
                    {point.server ? ` Sacó ${names[point.server - 1]}.` : ""}
                    {point.server && point.server !== point.winner
                      ? " Minibreak."
                      : ""}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        );
      })}
    </section>
  );
}
