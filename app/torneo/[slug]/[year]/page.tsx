import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { preparedTournamentArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import {
  categoryLabel,
  categoryYears,
  tournamentDirectory,
} from "@/lib/tournament-directory";
import { roundLabel, roundPosition, durationLabel, winnerName } from "@/lib/editorial";
import { eligibleMatch } from "@/lib/quality";
import { lostOpening } from "@/lib/archive-insights";
import { closeness, number } from "@/lib/cuaderno/model";
import { editionTournamentCourt } from "@/lib/tournament-presentation";
import { courtPhoto, courtPhotoForEdition } from "@/lib/imagery";
import TournamentFinal from "@/components/TournamentFinal";
import EditionMatchExplorer from "@/components/EditionMatchExplorer";
import { toMatchRecord } from "@/data/map-match";
import { publishedMatchMinutes } from "@/lib/duration";
import { imageFocus } from "@/lib/image-focus";
import TournamentEditionNav from "@/components/TournamentEditionNav";

type Props = {
  params: Promise<{ slug: string; year: string }>;
  searchParams: Promise<{ categoria?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const tournament = tournamentDirectory(await preparedTournamentArchive()).find(
    (entry) => entry.slug === slug,
  );
  const options =
    tournament?.matches.filter((match) => match.year === Number(year)) || [];
  const level =
    query.categoria &&
    options.some((match) => match.category === query.categoria)
      ? query.categoria
      : options[0]?.category;
  const canonicalParams = new URLSearchParams();
  if (level && new Set(options.map((match) => match.category)).size > 1)
    canonicalParams.set("categoria", level);
  const title = `${tournament ? tournamentName(tournament.name) : "Edición"} ${year}${level ? ` · ${categoryLabel(level)}` : ""} — DEUCE`;
  const description = "La final, el camino del campeón y los resultados de esta edición.";
  return {
    title,
    description,
    alternates: {
      canonical: `/torneos/${slug}/${year}${canonicalParams.size ? `?${canonicalParams}` : ""}`,
    },
    openGraph: { title, description, url: `/torneos/${slug}/${year}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Edition({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const archive=await preparedTournamentArchive();
  const tournament = tournamentDirectory(archive).find(
    (entry) => entry.slug === slug,
  );
  if (!tournament || !/^\d{4}$/.test(year)) notFound();
  const edition = tournament.matches.filter(
    (match) => match.year === Number(year),
  );
  const categories = [...new Set(edition.map((match) => match.category))];
  const category =
    query.categoria && categories.includes(query.categoria)
      ? query.categoria
      : categories[0];
  const matches = edition.filter((match) => match.category === category);
  if (!matches.length) notFound();
  const court = editionTournamentCourt(matches);
  const final = matches.find((match) => roundPosition(match.round) === 7);
  const measuredMatches=matches.filter(eligibleMatch);
  const comebacks=measuredMatches.filter(match=>lostOpening(match));
  const closest = [...measuredMatches].sort((a, b) => closeness(b) - closeness(a))[0];
  const timed = measuredMatches
    .filter((match) => publishedMatchMinutes(match) !== null)
    .sort((a, b) => publishedMatchMinutes(b)! - publishedMatchMinutes(a)!);
  const photo = tournament.canonical
    ? courtPhotoForEdition(tournament.name, Number(year)) || (Number(year)>=2023 ? courtPhoto(tournament.name) : null)
    : null;
  const tiebreaks=measuredMatches.reduce((total,match)=>total+match.score_summary.games.filter(set=>set.length===2&&Math.max(...set)===7&&Math.min(...set)===6).length,0);
  const decidingMatches=measuredMatches.filter(match=>{
    const [one,two]=match.score_summary.sets;
    return Number.isFinite(one)&&Number.isFinite(two)&&Math.abs(one-two)===1;
  }).length;
  const straightSetWins=measuredMatches.filter(match=>match.score_summary.sets.some(value=>value>0)&&match.score_summary.sets.includes(0)).length;
  const players=new Set(matches.flatMap(match=>[match.player1.name,match.player2.name])).size;
  const champion=final?winnerName(final):null;
  const editionResults=matches.filter(match=>roundPosition(match.round)>0).sort((a,b)=>roundPosition(b.round)-roundPosition(a.round)||b.score_summary.timestamp.localeCompare(a.score_summary.timestamp)).map(match=>({key:String(roundPosition(match.round)),label:roundLabel(match.round),position:roundPosition(match.round),championPath:Boolean(champion&&winnerName(match)===champion),match:toMatchRecord(match)}));
  return (
    <div
      className="nc-wrap ry-photo-edition td-edition"
      data-event-category={category}
      data-event-surface={court.surface}
    >
      <header
        className={`td-edition-hero${photo ? " td-edition-hero-photo" : ""}`} data-grand-slam={category === "Grand Slam"}
      >
        {photo && (
          <Image
            className="art-directed-photo"
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="100vw"
            priority
            style={imageFocus(photo.objectPosition||"center",photo.mobileObjectPosition||photo.objectPosition||"center")}
          />
        )}
        <div className="td-edition-hero-copy td-venue-copy">
          <div className="td-edition-title-row td-venue-title-row">
            <h1>{tournamentName(tournament.name)} <span>{year}</span></h1>
            <TournamentEditionNav slug={slug} years={categoryYears(tournament, category)} currentYear={Number(year)} masters={category === "Precursores de Masters"} category={tournament.categories.length > 1 ? category : undefined}/>
          </div>
        </div>
      </header>

      {categories.length > 1 && (
        <nav
          className="ry-tournament-levels"
          aria-label="Categorías de esta edición"
        >
          {categories.map((level) => (
            <Link
              key={level}
              data-event-category={level}
              aria-current={level === category ? "page" : undefined}
              href={`/torneos/${slug}/${year}?categoria=${encodeURIComponent(level)}`}
            >
              {categoryLabel(level)}
            </Link>
          ))}
        </nav>
      )}
      {final && <TournamentFinal match={final} />}
      <EditionMatchExplorer results={editionResults} />
      {measuredMatches.length > 0 && (
        <section className="nc-section nc-edition-facts td-edition-insights">
          <div className="td-section-heading">
            <div>
              <h2>Lecturas de la edición</h2>
              <p>Las cifras que explican el desarrollo del torneo, calculadas con sus resultados cerrados.</p>
            </div>
          </div>
          <div className="td-edition-insight-grid">
            <article className="td-edition-insight td-edition-insight--hero"><span>Partidos cerrados</span><strong>{number(measuredMatches.length)}</strong><p>{number(players)} jugadores aparecen en la edición.</p></article>
            <article className="td-edition-insight td-edition-insight--deciders"><span>Al set decisivo</span><strong>{number(decidingMatches)}</strong><p>partidos llegaron al último set de su formato.</p></article>
            <article className="td-edition-insight td-edition-insight--tiebreak"><span>Tie-breaks</span><strong>{number(tiebreaks)}</strong><p>sets terminaron 7–6 o 6–7.</p></article>
            <article className="td-edition-insight td-edition-insight--clean"><span>Sin ceder un set</span><strong>{number(straightSetWins)}</strong><p>victorias se resolvieron sin sets para el rival.</p></article>
            <article className="td-edition-insight td-edition-insight--comeback"><span>Remontadas</span><strong>{number(comebacks.length)}</strong><p>ganadores perdieron el primer set.</p></article>
            {closest&&<article className="td-edition-insight td-edition-insight--close"><span>Partido más ajustado</span><strong>{number(closeness(closest))}<small>/100</small></strong><p>{closest.player1.name} contra {closest.player2.name}.</p></article>}
            {timed[0]&&<article className="td-edition-insight td-edition-insight--duration"><span>Mayor duración publicada</span><strong>{durationLabel(publishedMatchMinutes(timed[0])!)}</strong><p>{timed[0].player1.name} contra {timed[0].player2.name}.</p></article>}
          </div>
        </section>
      )}
    </div>
  );
}
