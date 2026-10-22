import Link from "next/link";
import Row from "./nocturno/Row";
import type { Match } from "@/lib/types";
import { roundPosition, chronological } from "@/lib/editorial";
import { number } from "@/lib/cuaderno/model";
import type { CSSProperties } from "react";
export default function HomeSeason({ matches }: { matches: Match[] }) {
  const year = new Date().getUTCFullYear(),
    season = matches.filter((m) => m.year === year),
    finals = season
      .filter((m) => roundPosition(m.round) === 7)
      .sort((a, b) => chronological(b, a));
  if (!season.length) return null;
  const currentMonth = new Date().getUTCMonth();
  const months = Array.from({ length: currentMonth + 1 }, (_, i) => ({
    label: new Intl.DateTimeFormat("es", {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, i, 1))),
    count: season.filter(
      (m) =>
        m.context?.dateLabel === "Fecha del partido" &&
        Number(m.context.date?.slice(5, 7)) === i + 1,
    ).length,
  }));
  const max = Math.max(1, ...months.map((m) => m.count));
  return (
    <>
      <section className="home-season" aria-labelledby="home-season-title">
        <div className="ds-section-heading">
          <h2 id="home-season-title">La temporada {year}</h2>
          <Link href={`/buscar?year=${year}`}>Ver partidos</Link>
        </div>
        <div className="home-season-numbers">
          <div>
            <strong>{number(season.length)}</strong>
            <span>partidos terminados</span>
          </div>
          <div>
            <strong>{number(finals.length)}</strong>
            <span>finales registradas</span>
          </div>
        </div>
        <div
          className="home-months"
          style={{ "--month-count": months.length } as CSSProperties}
          role="img"
          aria-label={`Partidos por mes de ${year}: ${months.map((m) => `${m.label}, ${m.count}`).join("; ")}`}
        >
          {months.map((m) => (
            <div key={m.label}>
              <span>{number(m.count)}</span>
              <i style={{ height: `${(m.count / max) * 100}%` }} />
              <small>{m.label}</small>
            </div>
          ))}
        </div>
      </section>
      <section
        className="home-season-finals"
        aria-labelledby="home-finals-title"
      >
        <div className="ds-section-heading">
          <h2 id="home-finals-title">Las últimas finales</h2>
          <Link href={`/buscar?year=${year}&round=Final`}>Más resultados</Link>
        </div>
        <div className="match-row-group">
          {finals.slice(0, 3).map((m) => (
            <Row match={m} key={m.match_id} />
          ))}
        </div>
      </section>
    </>
  );
}
