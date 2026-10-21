"use client";
import Link from "next/link";
import { useState } from "react";
type Cell = {
  year: number;
  tournament: string;
  label: string;
  level: number;
  code: string;
  href?: string;
};
export default function SeasonMatrix({
  cells,
  years,
  tournaments,
}: {
  cells: Cell[];
  years: number[];
  tournaments: string[];
}) {
  const [page, setPage] = useState(0),
    slice = years.slice(page * 8, page * 8 + 8);
  return (
    <section className="section">
      <div className="section-heading matrix-heading">
        <div>
          <h2>El recorrido en el circuito</h2>
          <p className="small">
            Hasta dónde llegó en cada edición guardada. Una celda, un partido.
          </p>
        </div>
        <div className="segmented matrix-pagination">
          <button
            aria-label="Temporadas más recientes"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </button>
          <button
            aria-label="Temporadas anteriores"
            disabled={(page + 1) * 8 >= years.length}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      </div>
      <div
        className="matrix-scroll"
        tabIndex={0}
        role="region"
        aria-label="Resultados por torneo y temporada; desplazamiento horizontal en móvil"
      >
        <table className="season-matrix">
          <thead>
            <tr>
              <th scope="col">Torneo</th>
              {slice.map((y) => (
                <th scope="col" key={y}>
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t}>
                <th scope="row">{t}</th>
                {slice.map((year) => {
                  const c = cells.find(
                    (c) => c.year === year && c.tournament === t,
                  );
                  return (
                    <td key={year}>
                      {c?.href ? (
                        <Link
                          className={`matrix-cell level-${c.level}`}
                          href={c.href}
                          aria-label={`${t} ${year}: ${c.label}`}
                          title={`${t} ${year}: ${c.label}`}
                        >
                          {c.code}
                        </Link>
                      ) : (
                        <span
                          className="matrix-cell no-record"
                          aria-label={`${t} ${year}: sin registro`}
                        >
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="micro">
        C: campeón · F: final · SF: semifinal · CF: cuartos · OF: octavos. R128,
        R64 y R32 indican el tamaño del cuadro en esa ronda. Sin registro no
        significa que no participase.
      </p>
    </section>
  );
}
