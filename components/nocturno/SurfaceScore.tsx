import { number, surfaceLabel } from "@/lib/cuaderno/model";
import type { Surface } from "@/lib/types";

export type SurfaceScoreRow = {
  surface: Surface;
  wins: readonly [number, number];
  count?: number;
};

export default function SurfaceScore({
  names,
  rows,
}: {
  names: readonly [string, string];
  rows: SurfaceScoreRow[];
}) {
  return (
    <dl className="ry-surface-score-list" aria-label="Victorias por superficie">
      {rows.map((row) => (
        <div className="ry-surface-score-row" data-event-surface={row.surface} key={row.surface}>
          <dt className="ry-surface-name">
            <span className="ry-surface-dot" aria-hidden="true" />
            {surfaceLabel[row.surface]}
          </dt>
          <dd aria-label={`${names[0]}: ${number(row.wins[0])} ${row.wins[0] === 1 ? "victoria" : "victorias"}. ${names[1]}: ${number(row.wins[1])} ${row.wins[1] === 1 ? "victoria" : "victorias"}. ${number(row.count ?? row.wins[0] + row.wins[1])} partidos en total.`}>
            <span className={row.wins[0] > row.wins[1] ? "ry-surface-leading" : undefined}>{number(row.wins[0])}</span>
            <span aria-hidden="true">–</span>
            <span className={row.wins[1] > row.wins[0] ? "ry-surface-leading" : undefined}>{number(row.wins[1])}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
