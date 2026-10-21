import Image from "next/image";
import Link from "next/link";
import "../../rally-photography.css";
import "../../tournaments/tournament-refresh.css";
import { notFound } from "next/navigation";
import { courtPhoto } from "@/lib/imagery";
import { number, surfaceLabel } from "@/lib/cuaderno/model";
import { preparedArchive } from "@/lib/revista/read-records";
import { firstRecordedChampion } from "@/lib/revista/records";
import { tournamentName } from "@/lib/labels";
import {
  categoryLabel, categorySurfaces, categoryYears,
  tournamentCategory, tournamentDirectory, tournamentRows,
} from "@/lib/tournament-directory";
import { RankingRows, FirstRecorded } from "@/components/nocturno/Pieces";
import EditionPicker from "@/components/EditionPicker";
import { round, score } from "@/lib/cuaderno/model";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ categoria?: string }> };
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria } = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find((entry) => entry.slug === slug);
  const category = categoria && tournament?.categories.includes(categoria) ? categoria : tournament ? tournamentCategory(tournament) : "";
  const categoryQuery = categoria && tournament?.categories.includes(categoria) ? `?categoria=${encodeURIComponent(categoria)}` : "";
  return {
    title: `${tournament ? tournamentName(tournament.name) : "Torneo"}${category ? ` · ${categoryLabel(category)}` : ""} — DEUCE`,
    description: "Títulos, finales y ediciones de este torneo en el archivo.",
    alternates: { canonical: `/torneos/${slug}${categoryQuery}` },
  };
}

export default async function Tournament({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria } = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find((entry) => entry.slug === slug);
  if (!tournament) notFound();
  const category = categoria && tournament.categories.includes(categoria) ? categoria : tournamentCategory(tournament);
  const registered = tournament.matches.filter((match) => match.category === category);
  if (!registered.length) notFound();
  const pieces = tournamentRows(registered);
  const lastFinal = pieces.champion;
  const latestChampion = lastFinal ? lastFinal.winner === 1 ? lastFinal.player1.name : lastFinal.player2.name : null;
  const latestOpponent = lastFinal ? lastFinal.winner === 1 ? lastFinal.player2.name : lastFinal.player1.name : null;
  const years = categoryYears(tournament, category);
  const surfaces = categorySurfaces(tournament, category);
  const photo = tournament.canonical && (category === "Grand Slam" || category === "Masters 1000")
    ? courtPhoto(tournament.name) : null;
  const first = firstRecordedChampion(registered);
  const mainRates = pieces.rate.filter((row) => row.sample >= 50);
  const smallRates = pieces.rate.filter((row) => row.sample < 50);
  return (
    <div className="nc-wrap ry-photo-tournament-detail" data-event-category={category}
      data-event-surface={surfaces.length === 1 ? surfaces[0] : undefined}>
      <header className={`nc-tournament-head ry-photo-tournament-detail-head${photo ? "" : " ry-photo-tournament-detail-head-no-photo"}`}>
        <div>
          <h1>{tournamentName(tournament.name)}</h1>
          <p className="nc-meta">
            <span className="ry-tournament-level">{categoryLabel(category)}</span> · {years.at(-1)}–{years[0]}
          </p>
          <p className="nc-meta">
            {surfaces.length === 1 && <><i className={`nc-dot nc-dot-${surfaces[0]}`} aria-hidden="true" />{surfaceLabel[surfaces[0]]} · </>}
            {number(years.length)}{" "}
            ediciones · {number(registered.length)} partidos
          </p>
          {lastFinal && <Link className="ry-tournament-latest" href={`/match/${lastFinal.match_id}`}>
            <span>Última final · {lastFinal.year}</span>
            <strong>{latestChampion} ganó a {latestOpponent}</strong>
            <span>{round(lastFinal)} · {score(lastFinal)}</span>
          </Link>}
        </div>
        {photo && (
          <figure className="nc-tournament-photo">
            <Image
              src={photo.src}
              alt={photo.alt}
              width={1068}
              height={712}
              sizes="(max-width: 649px) calc(100vw - 32px), (max-width: 1099px) 50vw, 560px"
              priority
            />
            {photo.caption && <figcaption>{photo.caption}</figcaption>}
          </figure>
        )}
      </header>
      {tournament.categories.length > 1 && <nav className="ry-tournament-levels" aria-label="Categorías de este torneo">
        {tournament.categories.map((level) => <Link key={level} data-event-category={level}
          href={`/torneos/${slug}${level === tournamentCategory(tournament) ? "" : `?categoria=${encodeURIComponent(level)}`}`}
          aria-current={level === category ? "page" : undefined}>{categoryLabel(level)} <span>{number(categoryYears(tournament, level).length)}</span></Link>)}
      </nav>}
      <section className="nc-section ry-tournament-editions">
        <h2>Ediciones</h2>
        <EditionPicker slug={slug} years={years} masters={category === "Precursores de Masters"}
          category={tournament.categories.length > 1 ? category : undefined} />
      </section>
      {(pieces.titles.length > 0 || pieces.played.length > 0) && <div className="nc-tournament-columns">
        {pieces.titles.length > 0 && (
        <section className="nc-section">
          <h2>Más títulos</h2>
          <p className="nc-meta">
            {years.at(-1)}–{years[0]} · Solo este archivo · Mínimo un título.
          </p>
          <RankingRows rows={pieces.titles.slice(0, 8)} />
        </section>
        )}
        {pieces.played.length > 0 && (
        <section className="nc-section">
          <h2>Más finales</h2>
          <p className="nc-meta">
            {years.at(-1)}–{years[0]} · Solo este archivo · Mínimo una final.
          </p>
          <RankingRows rows={pieces.played.slice(0, 8)} />
        </section>
        )}
      </div>}
      {(mainRates.length > 0 || smallRates.length > 0) && (
      <section className="nc-section">
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
