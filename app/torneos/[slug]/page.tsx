import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { courtPhoto } from "@/lib/imagery";
import { number, score, surfaceLabel } from "@/lib/cuaderno/model";
import { preparedArchive } from "@/lib/revista/read-records";
import { firstRecordedChampion } from "@/lib/revista/records";
import { tournamentName } from "@/lib/labels";
import {
  categoryLabel,
  categoryYears,
  tournamentCategory,
  tournamentDirectory,
  tournamentRows,
} from "@/lib/tournament-directory";
import {
  latestTournamentCourt,
  tournamentSurfaceHistory,
} from "@/lib/tournament-presentation";
import { chronological, roundPosition, winnerName } from "@/lib/editorial";
import { RankingRows, FirstRecorded } from "@/components/nocturno/Pieces";
import EditionPicker from "@/components/EditionPicker";
import PlayerAvatar from "@/components/PlayerAvatar";
import TournamentFinal from "@/components/TournamentFinal";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ categoria?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria } = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find(
    (entry) => entry.slug === slug,
  );
  const category =
    categoria && tournament?.categories.includes(categoria)
      ? categoria
      : tournament
        ? tournamentCategory(tournament)
        : "";
  const categoryQuery =
    categoria && tournament?.categories.includes(categoria)
      ? `?categoria=${encodeURIComponent(categoria)}`
      : "";
  return {
    title: `${tournament ? tournamentName(tournament.name) : "Torneo"}${category ? ` · ${categoryLabel(category)}` : ""} — DEUCE`,
    description: "Títulos, finales y ediciones de este torneo en el archivo.",
    alternates: { canonical: `/torneos/${slug}${categoryQuery}` },
  };
}

export default async function Tournament({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria } = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find(
    (entry) => entry.slug === slug,
  );
  if (!tournament) notFound();
  const category =
    categoria && tournament.categories.includes(categoria)
      ? categoria
      : tournamentCategory(tournament);
  const registered = tournament.matches.filter(
    (match) => match.category === category,
  );
  if (!registered.length) notFound();
  const pieces = tournamentRows(registered);
  const years = categoryYears(tournament, category);
  const court = latestTournamentCourt(registered);
  const surfaceHistory = tournamentSurfaceHistory(registered);
  const photo =
    tournament.canonical && ["Grand Slam", "Masters 1000"].includes(category)
      ? courtPhoto(tournament.name)
      : null;
  const first = firstRecordedChampion(registered);
  const mainRates = pieces.rate.filter((row) => row.sample >= 50);
  const smallRates = pieces.rate.filter((row) => row.sample < 50);
  const finals = registered
    .filter((match) => roundPosition(match.round) === 7 && winnerName(match))
    .sort((a, b) => chronological(b, a));
  const editionHref = (year: number) =>
    `/${slug}/${year}${tournament.categories.length > 1 ? `?categoria=${encodeURIComponent(category)}` : ""}`;
  return (
    <div
      className="nc-wrap ry-photo-tournament-detail td-tournament"
      data-event-category={category}
      data-event-surface={court.surface}
    >
      <header className={`td-venue-hero${photo ? " td-venue-hero-photo" : ""}`}>
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 759px) calc(100vw - 32px), 1240px"
            priority
          />
        )}
        <div className="td-venue-copy">
          <Link href="/tournaments" className="td-breadcrumb">
            Torneos <span aria-hidden="true">/</span> {categoryLabel(category)}
          </Link>
          <h1>{tournamentName(tournament.name)}</h1>
          <p className="td-hero-court">
            <i
              className={`nc-dot nc-dot-${court.surface}`}
              aria-hidden="true"
            />
            {surfaceLabel[court.surface]}
            {court.indoor !== null && (
              <span>· {court.indoor ? "Bajo techo" : "Al aire libre"}</span>
            )}
            <span>· última edición registrada, {court.year}</span>
          </p>
        </div>
        {photo && (
          <details className="td-photo-info">
            <summary aria-label="Información de la fotografía">
              <Info size={18} aria-hidden="true" />
            </summary>
            <p>{photo.caption || photo.alt}</p>
            <p>{photo.credit}</p>
            <a href={photo.source} target="_blank" rel="noreferrer">
              Ver fuente y licencia
            </a>
          </details>
        )}
      </header>

      {tournament.categories.length > 1 && (
        <nav
          className="ry-tournament-levels"
          aria-label="Categorías de este torneo"
        >
          {tournament.categories.map((level) => (
            <Link
              key={level}
              data-event-category={level}
              href={`/torneos/${slug}${level === tournamentCategory(tournament) ? "" : `?categoria=${encodeURIComponent(level)}`}`}
              aria-current={level === category ? "page" : undefined}
            >
              {categoryLabel(level)}{" "}
              <span>{number(categoryYears(tournament, level).length)}</span>
            </Link>
          ))}
        </nav>
      )}
      <div className="td-tournament-facts">
        <div>
          <strong>{number(years.length)}</strong>
          <span>ediciones registradas</span>
        </div>
        <div>
          <strong>{number(registered.length)}</strong>
          <span>partidos en el archivo</span>
        </div>
        <div>
          <strong>
            {years.at(-1)}
            <span>—</span>
            {years[0]}
          </strong>
          <span>periodo de esta categoría</span>
        </div>
      </div>
      <section className="td-editions" aria-labelledby="td-editions-heading">
        <h2 id="td-editions-heading">Explorar una edición</h2>
        <EditionPicker
          slug={slug}
          years={years}
          masters={category === "Precursores de Masters"}
          category={tournament.categories.length > 1 ? category : undefined}
        />
      </section>
      {pieces.champion && <TournamentFinal match={pieces.champion} latest />}
      {finals.length > 0 && (
        <section
          className="nc-section td-champion-history"
          aria-labelledby="td-history-title"
        >
          <div className="td-section-heading">
            <div>
              <h2 id="td-history-title">Campeones de la historia</h2>
            </div>
            <span>
              Últimas {Math.min(6, finals.length)} finales registradas
            </span>
          </div>
          <ol className="td-champions">
            {finals.slice(0, 6).map((final) => {
              const champion = winnerName(final)!;
              const opponent =
                final.player1.name === champion
                  ? final.player2.name
                  : final.player1.name;
              return (
                <li key={final.match_id}>
                  <Link href={editionHref(final.year)}>
                    <span className="td-champion-year">{final.year}</span>
                    <PlayerAvatar name={champion} size={64} />
                    <strong>{champion}</strong>
                    <span>Final ante {opponent}</span>
                    <small>
                      Desde {final.player1.name}: {score(final)}
                    </small>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {(pieces.titles.length > 0 || pieces.played.length > 0) && (
        <div className="nc-tournament-columns td-tournament-rankings">
          {pieces.titles.length > 0 && (
            <section className="nc-section td-stat-panel">
              <h2>Más títulos</h2>
              <p className="nc-meta">
                {years.at(-1)}–{years[0]} · En este archivo · Mínimo un título.
              </p>
              <RankingRows rows={pieces.titles.slice(0, 8)} />
            </section>
          )}
          {pieces.played.length > 0 && (
            <section className="nc-section td-stat-panel">
              <h2>Más finales</h2>
              <p className="nc-meta">
                {years.at(-1)}–{years[0]} · En este archivo · Mínimo una final.
              </p>
              <RankingRows rows={pieces.played.slice(0, 8)} />
            </section>
          )}
        </div>
      )}
      {(mainRates.length > 0 || smallRates.length > 0) && (
        <section className="nc-section td-stat-panel td-effectiveness">
          <h2>Efectividad en este torneo</h2>
          <p className="nc-meta">
            Mínimo diez partidos. El porcentaje incluye victorias y derrotas con
            marcador cerrado.
          </p>
          <RankingRows rows={mainRates.slice(0, 8)} percent />
          {smallRates.length > 0 && (
            <details>
              <summary>Muestras pequeñas · menos de 50 partidos</summary>
              <RankingRows rows={smallRates.slice(0, 25)} percent small />
            </details>
          )}
        </section>
      )}
      {surfaceHistory.length > 1 && (
        <details className="td-surface-history">
          <summary>Las superficies de este torneo</summary>
          <p>
            Ediciones registradas de {categoryLabel(category)}. La fotografía
            describe la sede; el color principal corresponde a {court.year}.
          </p>
          <ul>
            {surfaceHistory.map((period) => (
              <li key={period.surface}>
                <i
                  className={`nc-dot nc-dot-${period.surface}`}
                  aria-hidden="true"
                />
                {surfaceLabel[period.surface]}
                <span>
                  {period.from === period.to
                    ? period.from
                    : `${period.from}–${period.to}`}
                </span>
              </li>
            ))}
          </ul>
          {tournament.name === "Madrid" && category === "Masters 1000" && (
            <a
              href="https://www.atptour.com/en/news/madrid-foundation-story-bespoke-2024"
              target="_blank"
              rel="noreferrer"
            >
              Historia oficial ATP: dura bajo techo hasta 2008; tierra al aire
              libre desde 2009.
            </a>
          )}
        </details>
      )}
      {first && (
        <FirstRecorded
          name={first.name}
          year={first.year}
          match={first.proof}
        />
      )}
    </div>
  );
}
