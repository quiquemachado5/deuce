import type { pressure } from "@/lib/cuaderno/model";
export function PressureComparison({
  names,
  rows,
}: {
  names: [string, string];
  rows: ReturnType<typeof pressure>;
}) {
  const labels = {
    thirty: "Juegos ganados tras ganar el 30–30",
    converted: "Breaks convertidos",
    saved: "Breaks salvados",
  };
  return (
    <div className="pressure-comparison">
      <div className="comparison-legend">
        {names.map((name, i) => (
          <span key={name}>
            <i className={`series-dot series-${i}`} />
            {name}
          </span>
        ))}
      </div>
      {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => {
        const a = rows[0][key],
          b = rows[1][key];
        if (!a[1] && !b[1]) return null;
        return (
          <div className="pressure-compare-row" key={key}>
            <p>{labels[key]}</p>
            <div className="pressure-compare-values">
              <span>{a[1] ? `${a[0]} de ${a[1]}` : "Sin oportunidades"}</span>
              <span>{b[1] ? `${b[0]} de ${b[1]}` : "Sin oportunidades"}</span>
            </div>
            <div className="pressure-compare-bars">
              <div>
                <i style={{ width: `${a[1] ? (100 * a[0]) / a[1] : 0}%` }} />
              </div>
              <div>
                <i style={{ width: `${b[1] ? (100 * b[0]) / b[1] : 0}%` }} />
              </div>
            </div>
          </div>
        );
      })}
      <p className="micro">
        Las barras representan efectividad en una escala común de 0 a 100 %.
        Cada cifra conserva su número de oportunidades.
      </p>
      {rows
        .filter((r) => r.matchPoints[1] > 0)
        .map((r) => (
          <p className="small" key={r.side}>
            {names[r.side - 1]} · {r.matchLabel}:{" "}
            <strong>
              {r.matchPoints[0]} de {r.matchPoints[1]}
            </strong>
          </p>
        ))}
    </div>
  );
}
