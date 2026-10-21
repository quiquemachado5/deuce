"use client";
import { useState } from "react";
import type { SeasonPoint } from "@/lib/analytics/product";
const n = (v: number) =>
  v.toLocaleString("es-ES", { maximumFractionDigits: 1 });
type Point = { year: number; values: (number | null)[]; detail?: string };
export function Timeline({
  points,
  names,
  unit = "victorias",
  ceiling,
}: {
  points: Point[];
  names: string[];
  unit?: string;
  ceiling?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const observed = Math.max(
    1,
    ...points.flatMap((p) => p.values.map((v) => v || 0)),
  );
  const max = ceiling || Math.ceil(observed / 4) * 4;
  const minYear = points[0]?.year || 0,
    maxYear = points.at(-1)?.year || minYear;
  const y = (v: number) => 220 - (v / max) * 184;
  const current = points[active ?? points.length - 1];
  if (!points.length) return null;
  const graph = (width: number, mobile: boolean) => {
    const x = (year: number) =>
      48 + ((year - minYear) / (maxYear - minYear || 1)) * (width - 80);
    return (
      <svg
        className={mobile ? "chart-mobile" : "chart-desktop"}
        viewBox={`0 0 ${width} 260`}
        role="img"
        aria-label={`${names.join(" y ")} por temporada. Unidad: ${unit}. La tabla ofrece todos los valores.`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              className="chart-grid"
              x1="48"
              x2={width - 32}
              y1={y(max * t)}
              y2={y(max * t)}
            />
            <text x="36" y={y(max * t) + 4} textAnchor="end">
              {n(max * t)}
              {unit === "%" ? " %" : ""}
            </text>
          </g>
        ))}
        {names.map((name, i) => {
          let gap = true;
          const d = points
            .map((p) => {
              if (p.values[i] === null) {
                gap = true;
                return "";
              }
              const command = gap ? "M" : "L";
              gap = false;
              return `${command}${x(p.year)},${y(p.values[i]!)}`;
            })
            .join(" ");
          return <path key={name} d={d} className={`chart-path series-${i}`} />;
        })}
        {points
          .filter(
            (_, i) =>
              i === 0 ||
              i === points.length - 1 ||
              (points.length > 6 &&
                i % Math.ceil(points.length / (mobile ? 3 : 5)) === 0),
          )
          .map((p) => (
            <text key={p.year} x={x(p.year)} y="246" textAnchor="middle">
              {p.year}
            </text>
          ))}
        {active !== null && (
          <line
            x1={x(points[active].year)}
            x2={x(points[active].year)}
            y1="28"
            y2="220"
            className="chart-cursor"
          />
        )}
        {points.map((p, i) => (
          <g
            key={p.year}
            role="button"
            tabIndex={0}
            aria-label={`${p.year}. ${p.values.map((v, j) => `${names[j]}: ${v === null ? "sin registro" : n(v) + " " + unit}`).join(". ")}`}
            onFocus={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActive(i);
              }
            }}
          >
            <rect
              x={x(p.year) - Math.max(6, 300 / points.length)}
              width={Math.max(12, 600 / points.length)}
              y="24"
              height="202"
              fill="transparent"
            />
            {p.values.map(
              (v, j) =>
                v !== null && (
                  <circle
                    key={j}
                    cx={x(p.year)}
                    cy={y(v)}
                    r={active === i ? 5 : 2.5}
                    className={`chart-point series-${j}`}
                  />
                ),
            )}
          </g>
        ))}
      </svg>
    );
  };
  return (
    <div className="timeline">
      <div className="chart-readout" aria-live="polite">
        <span>{current?.year}</span>
        {names.map((name, i) => (
          <span key={name}>
            <i className={`series-dot series-${i}`} />
            {name}{" "}
            <strong>
              {current?.values[i] === null
                ? "Sin registro"
                : `${n(current?.values[i] || 0)}${unit === "%" ? " %" : ""}`}
            </strong>
          </span>
        ))}
        {current?.detail && <small>{current.detail}</small>}
      </div>
      {graph(752, false)}
      {graph(400, true)}
      <details className="chart-table">
        <summary>Ver datos del gráfico</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Temporada</th>
                {names.map((name) => (
                  <th scope="col" key={name}>
                    {name} · {unit}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.year}>
                  <th scope="row">{p.year}</th>
                  {p.values.map((v, i) => (
                    <td key={i}>{v === null ? "Sin registro" : n(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
export function SeasonChart({ seasons }: { seasons: SeasonPoint[] }) {
  const [metric, setMetric] = useState<"rate" | "wins" | "finals">("rate");
  return (
    <section className="chart-section">
      <div className="section-heading">
        <div>
          <h2>Temporada a temporada</h2>
          <p className="small">
            Resultados de este archivo. Los años sin registro dejan un hueco.
          </p>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label="Métrica de temporada"
        >
          {(["rate", "wins", "finals"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={m === metric}
              onClick={() => setMetric(m)}
            >
              {{ rate: "Efectividad", wins: "Victorias", finals: "Finales" }[m]}
            </button>
          ))}
        </div>
      </div>
      <Timeline
        points={seasons.map((s) => ({
          year: s.year,
          values: [s.played ? s[metric] : null],
          detail: `${s.wins} victorias · ${s.played} partidos`,
        }))}
        names={[
          { rate: "Victorias", wins: "Victorias", finals: "Finales" }[metric],
        ]}
        unit={
          metric === "rate" ? "%" : metric === "wins" ? "victorias" : "finales"
        }
        ceiling={metric === "rate" ? 100 : undefined}
      />
    </section>
  );
}
export function ComparisonBars({
  rows,
  names,
}: {
  rows: { label: string; values: [number, number]; detail?: string }[];
  names: [string, string];
}) {
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <div className="comparison">
      <div className="comparison-legend">
        <span>
          <i className="series-dot series-0" />
          {names[0]}
        </span>
        <span>
          <i className="series-dot series-1" />
          {names[1]}
        </span>
      </div>
      {rows.map((r) => (
        <div className="comparison-row" key={r.label}>
          <div className="comparison-caption">
            <span>{r.label}</span>
            <small>{r.detail}</small>
          </div>
          <div
            className="diverging"
            aria-label={`${r.label}: ${names[0]} ${r.values[0]}, ${names[1]} ${r.values[1]}`}
          >
            <strong>{n(r.values[0])}</strong>
            <div className="bar-left">
              <i style={{ width: `${(r.values[0] / max) * 100}%` }} />
            </div>
            <div className="bar-right">
              <i style={{ width: `${(r.values[1] / max) * 100}%` }} />
            </div>
            <strong>{n(r.values[1])}</strong>
          </div>
        </div>
      ))}
      <p className="micro">
        Escala común: 0–{n(max)}. Cada barra representa victorias.
      </p>
    </div>
  );
}
export function SurfaceBars({
  rows,
}: {
  rows: { name: string; wins: number; played: number; surface: string }[];
}) {
  return (
    <div className="surface-bars">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="surface-bar-heading">
            <span>
              <i className={`surface-dot ${r.surface}`} />
              {r.name}
            </span>
            <strong>{n((r.wins / r.played) * 100)} %</strong>
          </div>
          <div
            className="bar-track"
            role="img"
            aria-label={`${r.name}: ${r.wins} victorias de ${r.played} partidos`}
          >
            <span style={{ width: `${(r.wins / r.played) * 100}%` }} />
          </div>
          <p className="micro">
            {r.wins} victorias · {r.played - r.wins} derrotas · {r.played}{" "}
            partidos
          </p>
        </div>
      ))}
      <p className="micro">Efectividad · misma escala de 0 a 100 %.</p>
    </div>
  );
}
