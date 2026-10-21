import Image from "next/image";
import Link from "next/link";
import type { Match } from "@/lib/types";
import { tournamentDirectory } from "@/lib/tournament-directory";
import { calendarOrder } from "@/lib/presentation-calendar";
import { courtPhoto } from "@/lib/imagery";
import { tournamentName } from "@/lib/labels";
import { number } from "@/lib/cuaderno/model";
import { editionTournamentCourt } from "@/lib/tournament-presentation";
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
      </nav>
      {!entries.length && (
        <p className="season-archive-empty">
          No hay campeonatos de esta temporada.{" "}
          <Link href={`/buscar?year=${years[0]}`}>Ver la última temporada</Link>
        </p>
      )}
      <div className="season-archive-grid">
        {entries.slice((current - 1) * 25, current * 25).map((entry, index) => {
          const photo = courtPhoto(entry.name);
          const court = editionTournamentCourt(entry.matches);
          return (
            <Link
              key={entry.slug}
              className={`season-event${photo ? " season-event-photo" : ""}`}
              href={`/buscar?year=${year}&tournament=${entry.slug}`}
              data-event-surface={court.surface}
            >
              {photo && (
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width:759px) 100vw, (max-width:1099px) 50vw, 400px"
                />
              )}
              <span className="season-event-category">
                {entry.categories[0]}
              </span>
              <span className="season-event-name">
                {tournamentName(entry.name)}
              </span>
              <span className="season-event-count">
                {number(entry.matches.length)} partidos
              </span>
            </Link>
          );
        })}
      </div>
      {entries.length > 25 && (
        <Pagination
          page={current}
          total={entries.length}
          href={(value) => `/buscar?year=${year}&page=${value}`}
        />
      )}
    </section>
  );
}
