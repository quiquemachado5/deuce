import Image from "next/image";
import Link from "next/link";
import SetScoreboard from "@/components/SetScoreboard";
import { notFound } from "next/navigation";
import { courtPhoto } from "@/lib/imagery";
import { number, surfaceLabel } from "@/lib/cuaderno/model";
import { preparedArchive, preparedEditionAudit } from "@/lib/revista/read-records";
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
  tournamentTimeline,
  latestTournamentCourt,
  tournamentSurfaceHistory,
} from "@/lib/tournament-presentation";
import { chronological, roundPosition, winnerName } from "@/lib/editorial";
import { RankingRows, FirstRecorded } from "@/components/nocturno/Pieces";
import EditionPicker from "@/components/EditionPicker";
import PlayerAvatar from "@/components/PlayerAvatar";
import TournamentFinal from "@/components/TournamentFinal";
import { Breadcrumbs } from "@/components/deuce/Breadcrumbs";
import { editionCompleteness } from "@/lib/edition-audit";

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
  const title = `${tournament ? tournamentName(tournament.name) : "Torneo"}${category ? ` · ${categoryLabel(category)}` : ""} — DEUCE`;
  const description = "Títulos, finales y ediciones de este torneo en el archivo.";
  return {
    title,
    description,
    alternates: { canonical: `/torneos/${slug}${categoryQuery}` },
    openGraph: { title, description, url: `/torneos/${slug}${categoryQuery}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Tournament({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria } = await searchParams;
  const [archive,audits]=await Promise.all([preparedArchive(),preparedEditionAudit()]);
  const tournament = tournamentDirectory(archive).find(
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
  const categoryAudits=audits.filter(audit=>audit.tournament===tournament.name&&audit.category===category).map(audit=>({...audit,...editionCompleteness(audit)}));
  const verifiedEditions=categoryAudits.filter(audit=>audit.completeDraw===true).length;
  const incompleteEditions=categoryAudits.filter(audit=>audit.completeDraw===false);
  const editionHref = (year: number) =>
    `/torneos/${slug}/${year}${tournament.categories.length > 1 ? `?categoria=${encodeURIComponent(category)}` : ""}`;
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
          <Breadcrumbs className="td-breadcrumb" items={[{label:'Torneos',href:'/torneos'},{label:tournamentName(tournament.name)}]}/>
          <h1>{tournamentName(tournament.name)}</h1>
          <p className="td-hero-court">
            <i
              className={`nc-dot nc-dot-${court.surface}`}
              aria-hidden="true"
            />
            {surfaceLabel[court.surface]}
            {court.indoor === true && (
              <span>· {court.indoor ? "Bajo techo" : ""}</span>
            )}
            <span>· última edición registrada, {court.year}</span>
          </p>
        </div>
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
        <div>
          <strong>{number(verifiedEditions)}</strong>
          <span>ediciones con rondas finales completas</span>
        </div>
      </div>
      <div className={`td-coverage-status${!categoryAudits.length?'':incompleteEditions.length?' is-warning':' is-complete'}`} role="status"><strong>{!categoryAudits.length?'Control de edición no disponible':incompleteEditions.length?`${number(incompleteEditions.length)} ediciones necesitan revisión`:'Rondas finales verificadas'}</strong><span>{!categoryAudits.length?'La página conserva los resultados publicados, pero no ha podido abrir el informe automático de esta categoría.':incompleteEditions.length?`Faltan rondas o marcadores por cerrar en la fuente guardada. Últimas: ${incompleteEditions.slice(0,3).map(audit=>`${audit.year} (${audit.missingLateRounds.join(', ')||`${audit.pending} pendientes`})`).join(' · ')}.`:`${number(verifiedEditions)} ediciones conservan cuartos, semifinales y final en la fuente publicada.`}</span><Link href="/cobertura#ediciones">Ver control de cobertura</Link></div>
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
                  </Link>
                  <SetScoreboard match={final} compact />
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
      <details className="archive-provenance"><summary>Categoría y condiciones por época</summary><p>Solo ediciones registradas. Un salto de años no acredita continuidad; una condición ausente no se deduce de la fotografía. Los nombres y sedes no documentados se mantienen sin reconstruir.</p><ul>{tournamentTimeline(tournament.matches).map(period=><li key={period.from+'-'+period.category+'-'+period.surface}>{period.from===period.to?period.from:period.from+'–'+period.to} · {categoryLabel(period.category)} · {surfaceLabel[period.surface]}{period.indoor===null?'':period.indoor?' · Bajo techo':' · Al aire libre'}</li>)}</ul></details>
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
