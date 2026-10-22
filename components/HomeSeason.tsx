import Link from "next/link";
import Row from "./nocturno/Row";
import type { Match } from "@/lib/types";
import { winnerName, roundPosition, chronological } from "@/lib/editorial";
import { number } from "@/lib/cuaderno/model";
export default function HomeSeason({ matches }: { matches: Match[] }) {
  const year = new Date().getUTCFullYear(),
    season = matches.filter((m) => m.year === year),
    finals = season
      .filter((m) => roundPosition(m.round) === 7)
      .sort((a, b) => chronological(b, a));
  if (!season.length) return null;
  const months = Array.from({ length: 12 }, (_, i) => ({
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
  const max = Math.max(1, ...months.map((m) => m.count)),
    wins = new Map<string, number>();
  for (const m of season) {
    const name = winnerName(m);
    if (name) wins.set(name, (wins.get(name) || 0) + 1);
  }
  const leader = [...wins].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"),
  )[0];
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
          {leader && (
            <div>
              <strong>{number(leader[1])}</strong>
              <span>victorias de {leader[0]}</span>
            </div>
          )}
        </div>
        <div
          className="home-months"
          role="img"
          aria-label={`Partidos por mes de ${year}: ${months.map((m) => `${m.label}, ${m.count}`).join("; ")}`}
        >
          {months.map((m) => (
            <div key={m.label}>
              <span>{m.count > 0 ? number(m.count) : ""}</span>
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
