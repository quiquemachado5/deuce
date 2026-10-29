import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { preparedTournamentArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import {
  categoryLabel,
  categoryYears,
  tournamentDirectory,
} from "@/lib/tournament-directory";
import { roundPosition, durationLabel, winnerName } from "@/lib/editorial";
import { eligibleMatch } from "@/lib/quality";
import { lostOpening } from "@/lib/archive-insights";
import { closeness, number } from "@/lib/cuaderno/model";
import { editionTournamentCourt } from "@/lib/tournament-presentation";
import { courtPhoto } from "@/lib/imagery";
import TournamentFinal from "@/components/TournamentFinal";
import TournamentBracket from "@/components/TournamentBracket";
import { publishedMatchMinutes } from "@/lib/duration";
import { imageFocus } from "@/lib/image-focus";
import { playerPhoto } from "@/lib/player-imagery";
import { championPhotoForEdition, playerPhotoAtTournament } from "@/lib/tournament-media";
import TournamentEditionNav from "@/components/TournamentEditionNav";
import styles from "@/components/tournament-detail.module.css";
import { tournamentDetailFeaturePhoto, tournamentDetailPhoto } from "@/lib/tournament-detail-media";

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
  const champion=final?winnerName(final):null;
  const heroPhoto = tournamentDetailPhoto(tournament.name) || courtPhoto(tournament.name);
  const detailPhoto = tournamentDetailFeaturePhoto(tournament.name);
  const tiebreaks=measuredMatches.reduce((total,match)=>total+match.score_summary.games.filter(set=>set.length===2&&Math.max(...set)===7&&Math.min(...set)===6).length,0);
  const decidingMatches=measuredMatches.filter(match=>{
    const [one,two]=match.score_summary.sets;
    return Number.isFinite(one)&&Number.isFinite(two)&&Math.abs(one-two)===1;
  }).length;
  const straightSetWins=measuredMatches.filter(match=>match.score_summary.sets.some(value=>value>0)&&match.score_summary.sets.includes(0)).length;
  const totalSets = measuredMatches.reduce((total, match) => total + match.score_summary.games.length, 0);
  const totalGames = measuredMatches.reduce((total, match) => total + match.score_summary.games.reduce((sum, set) => sum + set[0] + set[1], 0), 0);
  const rounds = new Set(matches.map(match => roundPosition(match.round)).filter(Boolean)).size;
  const averageGames = measuredMatches.length ? totalGames / measuredMatches.length : 0;
  const averageDuration = timed.length
    ? Math.round(timed.reduce((sum, match) => sum + publishedMatchMinutes(match)!, 0) / timed.length)
    : null;
  const championPath = champion ? matches.filter(match => winnerName(match) === champion).length : 0;
  const editionPortrait = champion
    ? championPhotoForEdition(tournament.name, Number(year)) || playerPhotoAtTournament(champion, tournament.name) || playerPhoto(champion)
    : detailPhoto || heroPhoto;
  const categoryOptions = tournament.categories.map((level) => ({
    value: level,
    label: categoryLabel(level),
    years: categoryYears(tournament, level),
  }));
  return (
    <div
      className={`${styles.page} nc-wrap`}
      data-event-category={category}
      data-event-surface={court.surface}
      data-tournament={slug}
      data-grand-slam={category === "Grand Slam" ? "true" : undefined}
    >
      <header className={styles.editionHero} data-grand-slam={category === "Grand Slam"}>
        {heroPhoto ? <Image className="art-directed-photo" src={heroPhoto.src} alt={heroPhoto.alt} fill sizes="100vw" priority style={imageFocus(heroPhoto.objectPosition||"center",heroPhoto.mobileObjectPosition||heroPhoto.objectPosition||"center")} unoptimized={heroPhoto.src.includes("/images/players/") || heroPhoto.src.startsWith("/images/tournaments/detail/")} /> : <span className={styles.heroFallback} aria-hidden="true" />}
        <span className={styles.heroBackdrop} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div>
              <h1 className={styles.heroTitle}><span className={styles.heroName}>{tournamentName(tournament.name)}</span><span className={styles.heroYear}>{year}</span></h1>
            </div>
            <div className={styles.heroNav}><TournamentEditionNav slug={slug} years={categoryYears(tournament, category)} currentYear={Number(year)} masters={category === "Precursores de Masters"} category={tournament.categories.length > 1 ? category : undefined} categories={categoryOptions}/></div>
          </div>
        </div>
      </header>

      {final && <TournamentFinal match={final} />}
      <TournamentBracket matches={matches} />
      {measuredMatches.length > 0 && (
        <section className={styles.editionReadings} aria-labelledby="edition-insights-title">
          <div className={styles.sectionHead}><div><h2 id="edition-insights-title">Lecturas de la edición</h2></div></div>
          <div className={styles.editionStory}>
            <article className={styles.editionLead}>
              {editionPortrait && <Image className="art-directed-photo" src={editionPortrait.src} alt={editionPortrait.alt} fill sizes="(max-width:759px) 100vw, 54vw" style={imageFocus(editionPortrait.objectPosition || "center top", editionPortrait.mobileObjectPosition || editionPortrait.objectPosition || "center top")} unoptimized />}
              <span className={styles.photoShade} aria-hidden="true" />
              <div><span>El pulso de {year}</span><strong>{number(totalGames)}</strong><p>juegos. Una edición medida punto a punto, con la atmósfera que la hizo única.</p></div>
            </article>
            <div className={styles.editionFocus}>
              <article><span>Camino del campeón</span><strong>{number(championPath)}</strong><p>{champion ? `${champion} firma los peldaños publicados hacia el título.` : "No hay campeón documentado en esta edición."}</p></article>
              <article><span>Partido medio</span><strong>{number(averageGames, 1)}</strong><p>juegos · {number(totalSets)} sets disputados en total.</p></article>
            </div>
            <div className={styles.editionSignals} aria-label="Ritmo de la edición">
              {[
                ["Rondas", number(rounds)],
                ["Al decisivo", number(decidingMatches)],
                ["Tie-breaks", number(tiebreaks)],
                ["Remontadas", number(comebacks.length)],
                ["Sin ceder set", number(straightSetWins)],
                ["Duración media", averageDuration ? durationLabel(averageDuration) : "—"],
              ].map(([label, value], index) => <article key={label} data-signal={index+1}><span>{label}</span><strong>{value}</strong></article>)}
            </div>
            <div className={styles.editionMatches}>
              {closest && <Link href={`/match/${closest.match_id}`}><span><small>El partido más ajustado</small><strong>{closest.player1.name} <i>contra</i> {closest.player2.name}</strong></span><b>{number(closeness(closest))}/100</b><ArrowRight size={20} aria-hidden="true" /></Link>}
              {timed[0] && <Link href={`/match/${timed[0].match_id}`}><span><small>La mayor duración publicada</small><strong>{timed[0].player1.name} <i>contra</i> {timed[0].player2.name}</strong></span><b>{durationLabel(publishedMatchMinutes(timed[0])!)}</b><ArrowRight size={20} aria-hidden="true" /></Link>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
