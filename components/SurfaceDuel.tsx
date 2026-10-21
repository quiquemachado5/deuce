"use client";
import { useState } from "react";
import { surfaceLabel } from "@/lib/surface";
import type { Surface } from "@/lib/types";

export default function SurfaceDuel({
  names,
  rows,
}: {
  names: readonly string[];
  rows: { surface: Surface; wins: readonly number[] }[];
}) {
  const [active, setActive] = useState<Surface | "all">("all");
  const selected = rows.find((row) => row.surface === active);
  const wins =
    selected?.wins ||
    names.map((_, index) =>
      rows.reduce((sum, row) => sum + (row.wins[index] || 0), 0),
    );
  const total = wins[0] + wins[1];
  return (
    <div
      className="surface-duel"
      data-event-surface={active === "all" ? undefined : active}
    >
      <div
        className="surface-duel-filters"
        role="group"
        aria-label="Superficie del cara a cara"
      >
        <button
          type="button"
          aria-pressed={active === "all"}
          onClick={() => setActive("all")}
        >
          Todas
        </button>
        {rows.map((row) => (
          <button
            key={row.surface}
            type="button"
            aria-pressed={active === row.surface}
            onClick={() => setActive(row.surface)}
          >
            <i className={`nc-dot nc-dot-${row.surface}`} aria-hidden="true" />
            {surfaceLabel[row.surface]}
          </button>
        ))}
      </div>
      <div className="surface-duel-result" aria-live="polite">
        <span>
          {names[0]}
          <strong>{wins[0]}</strong>
        </span>
        <span>
          {names[1]}
          <strong>{wins[1]}</strong>
        </span>
      </div>
      <div
        className="surface-duel-bar"
        role="img"
        aria-label={`${names[0]}: ${wins[0]}; ${names[1]}: ${wins[1]}. ${total} partidos.`}
      >
        <span style={{ transform: `scaleX(${total ? wins[0] / total : 0})` }} />
        <span style={{ transform: `scaleX(${total ? wins[1] / total : 0})` }} />
      </div>
      <p>
        {total} partidos{active === "all" ? "" : ` · ${surfaceLabel[active]}`}
      </p>
    </div>
  );
}
