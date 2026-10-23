import Link from "next/link";
import MatchCard from "./MatchCard";
import type { Match } from "@/lib/types";
import { roundPosition, chronological } from "@/lib/editorial";
import { number } from "@/lib/cuaderno/model";
import type { CSSProperties } from "react";
import { surfaceLabel } from "@/lib/surface";
export default function HomeSeason({ matches, featuredId }: { matches: Match[]; featuredId?: string }) {
  const year = new Date().getUTCFullYear(),
    season = matches.filter((m) => m.year === year),
    allFinals = season.filter((m) => roundPosition(m.round) === 7),
    finals = allFinals
      .filter((m) => m.match_id !== featuredId)
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
  const documentedMonths = months.filter(month => month.count > 0);
  const max = Math.max(1, ...documentedMonths.map((m) => m.count));
  const coverageGap = documentedMonths.slice(0, -1).some(month => month.count < max * .3);
  const surfaceCounts = (["hard", "clay", "grass", "carpet"] as const).map(surface => ({ surface, count: season.filter(match => match.surface === surface).length })).filter(item => item.count > 0);
  const surfaceTotal = Math.max(1, surfaceCounts.reduce((total, item) => total + item.count, 0));
  return (
    <>
      <section className="home-season" aria-labelledby="home-season-title">
        <div className="ds-section-heading">
          <h2 id="home-season-title">La temporada {year}</h2>
          <Link href={`/buscar?year=${year}`}>Ver todos</Link>
        </div>
        <div className="home-season-numbers">
          <div>
            <strong>{number(season.length)}</strong>
            <span>partidos terminados</span>
          </div>
          <div>
            <strong>{number(allFinals.length)}</strong>
            <span>finales registradas</span>
          </div>
        </div>
        <h3 className="home-months-title">Partidos registrados por superficie</h3>
        <div className="home-surface-chart" role="img" aria-label={surfaceCounts.map(item => `${surfaceLabel[item.surface]}: ${number(item.count)} partidos`).join('; ')}>
          {surfaceCounts.map(item => <span key={item.surface} data-surface={item.surface} style={{ width: `${item.count / surfaceTotal * 100}%` }} />)}
        </div>
        <div className="home-surface-legend">{surfaceCounts.map(item => <span key={item.surface}><i data-surface={item.surface} />{surfaceLabel[item.surface]} · {number(item.count)}</span>)}</div>
        {!coverageGap && documentedMonths.length > 1 ? <><h3 className="home-months-title">Partidos por mes</h3><div
          className="home-months"
          style={{ "--month-count": documentedMonths.length } as CSSProperties}
          role="img"
          aria-label={`Partidos por mes de ${year}, solo meses con cobertura: ${documentedMonths.map((m) => `${m.label}, ${m.count}`).join("; ")}`}
        >
          {documentedMonths.map((m) => (
            <div key={m.label} data-current={m.label === months[currentMonth]?.label}>
              <span>{number(m.count)}</span>
              <i style={{ height: `${(m.count / max) * 100}%` }} />
              <small>{m.label}</small>
            </div>
          ))}
        </div></> : <p className="home-season-coverage">La cobertura por meses es irregular; no se presenta como evolución de toda la temporada.</p>}
      </section>
      <section
        className="home-season-finals"
        aria-labelledby="home-finals-title"
      >
        <div className="ds-section-heading">
          <h2 id="home-finals-title">Las últimas finales</h2>
          <Link href={`/buscar?year=${year}&round=Final`}>Ver todos</Link>
        </div>
        <div className="ds-match-grid">
          {finals.slice(0, 3).map((m) => (
            <MatchCard match={m} key={m.match_id} />
          ))}
        </div>
      </section>
    </>
  );
}
