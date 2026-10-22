import Link from "next/link";
import type { Match } from "@/lib/types";
import { tournamentDirectory } from "@/lib/tournament-directory";
import { calendarOrder } from "@/lib/presentation-calendar";
import { tournamentName } from "@/lib/labels";
import { number, surfaceLabel } from "@/lib/cuaderno/model";
import { tournamentCourt } from "@/lib/tournament-presentation";
import { chronological, roundPosition, winnerName } from "@/lib/editorial";
import { Pagination } from "./nocturno/Row";

export default function SeasonArchive({
  matches,
  years,
  year,
  page,
}: {
  matches: Match[];
  years: number[];
  year: number;
  page: number;
}) {
  const entries = calendarOrder(
    tournamentDirectory(matches.filter((match) => match.year === year)),
  );
  const current = Math.min(
    Math.max(1, page),
    Math.max(1, Math.ceil(entries.length / 25)),
  );
  return (
    <section className="season-archive" aria-labelledby="season-archive-title">
      <div className="ds-section-heading">
        <h2 id="season-archive-title">La temporada {year}</h2>
        <span>{entries.length} campeonatos</span>
      </div>
      <nav className="season-archive-years" aria-label="Temporadas de partidos">
        {years.slice(0, 6).map((value) => (
          <Link
            key={value}
            href={`/buscar?year=${value}`}
            aria-current={year === value ? "page" : undefined}
          >
            {value}
          </Link>
        ))}
        <details className="season-archive-all-years">
          <summary>Más años</summary>
          <div>{years.slice(6).map((value) => <Link key={value} href={`/buscar?year=${value}`} aria-current={year === value ? "page" : undefined}>{value}</Link>)}</div>
        </details>
      </nav>
      {!entries.length && (
        <p className="season-archive-empty">
          No hay campeonatos de esta temporada.{" "}
          <Link href={`/buscar?year=${years[0]}`}>Ver la última temporada</Link>
        </p>
      )}
      <div className="season-archive-grid">
        {entries.slice((current - 1) * 25, current * 25).map((entry) => {
          const court = tournamentCourt(entry.matches[0]);
          const final = [...entry.matches].filter((match) => roundPosition(match.round) === 7).sort(chronological).at(-1);
          const champion = final ? winnerName(final) : "";
          const category = entry.categories.find((value) => value !== "ATP Tour · nivel no especificado");
          return (
            <Link
              key={entry.slug}
              className="season-event"
              href={`/buscar?year=${year}&tournament=${entry.slug}`}
              data-event-surface={court.surface}
            >
              <span className="season-event-category">
                <i className={`nc-dot nc-dot-${court.surface}`} aria-hidden="true" />{surfaceLabel[court.surface]}{category ? ` · ${category}` : ""}
              </span>
              <span className="season-event-name">
                {tournamentName(entry.name)}
              </span>
              <span className="season-event-count">{champion ? `Campeón: ${champion}` : "Campeón no registrado"} · {number(entry.matches.length)} partidos</span>
            </Link>
          );
        })}
      </div>
      {entries.length > 25 && (
        <Pagination
          page={current}
          total={entries.length}
          href={(value) => `/buscar?year=${year}&editions=${value}`}
        />
      )}
    </section>
  );
}
