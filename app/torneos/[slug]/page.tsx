import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courtPhoto } from "@/lib/imagery";
import { number } from "@/lib/cuaderno/model";
import { preparedArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import {
  categoryLabel,
  categoryYears,
  tournamentCategory,
  tournamentDirectory,
  tournamentRows,
} from "@/lib/tournament-directory";
import { latestTournamentCourt } from "@/lib/tournament-presentation";
import { chronological, roundPosition, scoreFor, winnerName } from "@/lib/editorial";
import PlayerAvatar from "@/components/PlayerAvatar";
import TournamentChampionRail from "@/components/TournamentChampionRail";
import { playerEditionPhoto, playerPhoto } from "@/lib/player-imagery";
import { ArrowUpRight } from "lucide-react";
import { championPhotoForEdition, latestMediaForTournament } from "@/lib/tournament-media";
import { imageFocus } from "@/lib/image-focus";
import TournamentEditionMediaView from "@/components/TournamentEditionMedia";
import TournamentEditionNav from "@/components/TournamentEditionNav";

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
  const archive=await preparedArchive();
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
  const photo =
    tournament.canonical && ["Grand Slam", "Masters 1000"].includes(category)
      ? courtPhoto(tournament.name)
      : null;
  const mainRates = pieces.rate.filter((row) => row.sample >= 50);
  const smallRates = pieces.rate.filter((row) => row.sample < 50);
  const finals = registered
    .filter((match) => roundPosition(match.round) === 7 && winnerName(match))
    .sort((a, b) => chronological(b, a));
  const distinctChampions = new Set(finals.map((match) => winnerName(match)).filter(Boolean)).size;
  const decidingFinals = finals.filter((match) => Math.abs(match.score_summary.sets[0] - match.score_summary.sets[1]) === 1).length;
  const longestFinal = [...finals].filter((match) => match.context?.minutes).sort((a,b)=>(b.context?.minutes||0)-(a.context?.minutes||0))[0];
  const finalPairs = new Map<string,{names:[string,string];count:number}>();
  for (const match of finals) {
    const names=[match.player1.name,match.player2.name].sort((a,b)=>a.localeCompare(b,"es")) as [string,string];
    const key=names.join("|");
    const previous=finalPairs.get(key);
    finalPairs.set(key,{names,count:(previous?.count||0)+1});
  }
  const recurringFinal=[...finalPairs.values()].sort((a,b)=>b.count-a.count)[0];
  const editionHref = (year: number) =>
    `/torneos/${slug}/${year}${tournament.categories.length > 1 ? `?categoria=${encodeURIComponent(category)}` : ""}`;
  const editionMedia=latestMediaForTournament(tournament.name,years);
  const championFinals=finals.filter(final=>winnerName(final)).slice(0,10);
  const titleLeaderPhoto=pieces.titles[0]?playerPhoto(pieces.titles[0].name):null;
  const decidingFinalPhoto=finals[0]?playerPhoto(winnerName(finals[0])!):null;
  const rivalryPhoto=recurringFinal?playerPhoto(recurringFinal.names[0]):null;
  const durationPhoto=longestFinal?playerPhoto(longestFinal.player1.name):null;
  return (
    <div
      className="nc-wrap ry-photo-tournament-detail td-tournament"
      data-event-category={category}
      data-event-surface={court.surface}
    >
      <header className={`td-venue-hero${photo ? " td-venue-hero-photo" : ""}`}>
        {photo && (
          <Image
            className="art-directed-photo"
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="100vw"
            style={imageFocus(photo.objectPosition||"center",photo.mobileObjectPosition||photo.objectPosition||"center")}
            priority
          />
        )}
        <div className="td-venue-copy">
          <div className="td-venue-title-row">
            <h1>{tournamentName(tournament.name)}</h1>
            <TournamentEditionNav slug={slug} years={years} masters={category === "Precursores de Masters"} category={tournament.categories.length > 1 ? category : undefined}/>
          </div>
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
      {finals.length > 0 && (
        <section
          className="nc-section td-champion-history"
          aria-labelledby="td-history-title"
        >
          <div className="td-section-heading td-section-heading--rail">
            <div>
              <h2 id="td-history-title">Campeones de la historia</h2>
            </div>
          </div>
          <TournamentChampionRail>
            {championFinals.map((final, index) => {
              const champion = winnerName(final)!;
              const opponent =
                final.player1.name === champion
                  ? final.player2.name
                  : final.player1.name;
              const titlePhoto=championPhotoForEdition(tournament.name,final.year);
              const occurrence=championFinals.slice(0,index).filter(item=>winnerName(item)===champion).length;
              const championPhoto=titlePhoto||playerEditionPhoto(champion,occurrence);
              return (
                <li key={final.match_id}>
                  <Link href={editionHref(final.year)} aria-label={`${champion}, campeón en ${final.year}. Final ante ${opponent}`}>
                    {championPhoto ? <Image className="td-champion-photo art-directed-photo" src={championPhoto.src} alt={titlePhoto?`${champion} con el trofeo de ${final.year}`:""} fill sizes="(max-width: 759px) 78vw, 330px" style={imageFocus(championPhoto.objectPosition||"50% 20%",championPhoto.mobileObjectPosition||championPhoto.objectPosition||"50% 20%")} unoptimized /> : <PlayerAvatar name={champion} size={80} />}
                    <span className="td-champion-shade" aria-hidden="true" />
                    <span className="td-champion-year">{final.year}</span>
                    <span className="td-champion-copy"><strong>{champion}</strong><span>Final ante {opponent}</span><small>{scoreFor(final,champion)}</small></span>
                  </Link>
                </li>
              );
            })}
          </TournamentChampionRail>
        </section>
      )}
      {editionMedia && <TournamentEditionMediaView media={editionMedia} />}
      {(pieces.titles.length > 0 || pieces.played.length > 0) && (
        <section className="td-tournament-rankings" aria-labelledby="td-rankings-title">
          <div className="td-section-heading"><div><h2 id="td-rankings-title">Nombres que definen el torneo</h2></div></div>
          {pieces.titles.length > 0 && (
            <div className="td-titles-feature">
              <div className="td-titles-leader">
                {titleLeaderPhoto&&<Image className="td-titles-leader-photo art-directed-photo" src={titleLeaderPhoto.src} alt={titleLeaderPhoto.alt} fill sizes="(max-width:759px) 94vw, 42vw" style={imageFocus("50% 20%","50% 18%")} unoptimized/>}
                <span className="td-titles-leader-shade" aria-hidden="true"/>
                <span className="td-titles-leader-copy"><small>Más títulos</small><strong>{pieces.titles[0].value}</strong><Link href={pieces.titles[0].href}>{pieces.titles[0].name}<ArrowUpRight size={16} aria-hidden="true"/></Link><em>{pieces.titles[0].detail}</em></span>
              </div>
              <ol className="td-title-chasers">{pieces.titles.slice(1,6).map((row,index)=><li key={row.name}><span>{index+2}</span><Link href={row.href}><PlayerAvatar name={row.name} size={34}/><strong>{row.name}</strong></Link><b>{number(row.value)}</b></li>)}</ol>
            </div>
          )}
          {pieces.played.length > 0 && (
            <div className="td-finalists-strip"><h3>Más finales</h3><ol>{pieces.played.slice(0,7).map((row,index)=><li key={row.name}><Link href={row.href}><span>{number(index+1).padStart(2,"0")}</span><PlayerAvatar name={row.name} size={42}/><strong>{row.name}</strong><small>{row.detail}</small><b>{number(row.value)}</b></Link></li>)}</ol></div>
          )}
        </section>
      )}
      {(mainRates.length > 0 || smallRates.length > 0) && (
        <section className="td-effectiveness" aria-labelledby="td-effectiveness-title">
          <div className="td-section-heading"><div><h2 id="td-effectiveness-title">Efectividad en este torneo</h2><p>Porcentaje de victorias con un mínimo de diez partidos registrados.</p></div></div>
          <ol className="td-rate-bars">{[...mainRates,...smallRates].slice(0,8).map((row,index)=><li key={row.name}><span className="td-rate-rank">{number(index+1)}</span><Link href={row.href}><PlayerAvatar name={row.name} size={38}/><strong>{row.name}</strong><small>{row.detail}</small></Link><span className="td-rate-track" aria-hidden="true"><i style={{width:`${Math.min(100,row.value)}%`}}/></span><b>{number(row.value,1)} %</b></li>)}</ol>
        </section>
      )}
      <section className="td-stories" aria-labelledby="td-stories-title">
        <div className="td-section-heading"><div><h2 id="td-stories-title">El torneo, visto desde los datos</h2></div></div>
        <div className="td-story-grid">
          <article className="td-story-card td-story-card--number">{decidingFinalPhoto&&<Image className="td-story-photo art-directed-photo" src={decidingFinalPhoto.src} alt="" fill sizes="(max-width:759px) 94vw, 36vw" style={imageFocus(decidingFinalPhoto.objectPosition||"center top",decidingFinalPhoto.mobileObjectPosition||decidingFinalPhoto.objectPosition||"center top")} unoptimized/>}<span className="td-story-shade" aria-hidden="true"/><span>Finales al límite</span><strong>{number(decidingFinals)}</strong><p>se decidieron en el último set de su formato.</p></article>
          <article className="td-story-card td-story-card--champions"><span>Campeones distintos</span><div className="td-story-portraits">{pieces.titles.slice(0,3).map(row=><PlayerAvatar key={row.name} name={row.name} size={46}/>)}</div><strong>{number(distinctChampions)}</strong><p>en {number(finals.length)} finales registradas.</p></article>
          {recurringFinal&&<article className="td-story-card td-story-card--rivalry">{rivalryPhoto&&<Image className="td-story-photo art-directed-photo" src={rivalryPhoto.src} alt="" fill sizes="(max-width:759px) 94vw, 36vw" style={imageFocus(rivalryPhoto.objectPosition||"center top",rivalryPhoto.mobileObjectPosition||rivalryPhoto.objectPosition||"center top")} unoptimized/>}<span className="td-story-shade" aria-hidden="true"/><span>Final que más se repite</span><div><PlayerAvatar name={recurringFinal.names[0]} size={48}/><PlayerAvatar name={recurringFinal.names[1]} size={48}/></div><strong>{recurringFinal.names[0]} <i>contra</i> {recurringFinal.names[1]}</strong><p>{number(recurringFinal.count)} enfrentamientos por el título.</p></article>}
          {longestFinal&&<article className="td-story-card td-story-card--duration">{durationPhoto&&<Image className="td-story-photo art-directed-photo" src={durationPhoto.src} alt="" fill sizes="(max-width:759px) 94vw, 30vw" style={imageFocus(durationPhoto.objectPosition||"center top",durationPhoto.mobileObjectPosition||durationPhoto.objectPosition||"center top")} unoptimized/>}<span className="td-story-shade" aria-hidden="true"/><span>Final más larga documentada</span><div className="td-story-portraits"><PlayerAvatar name={longestFinal.player1.name} size={44}/><PlayerAvatar name={longestFinal.player2.name} size={44}/></div><strong>{Math.floor((longestFinal.context?.minutes||0)/60)} h {(longestFinal.context?.minutes||0)%60} min</strong><p>{longestFinal.player1.name} contra {longestFinal.player2.name} · {longestFinal.year}</p><Link className="deuce-cta deuce-cta--small" href={`/match/${longestFinal.match_id}`}>Ver partido <ArrowUpRight size={15} aria-hidden="true"/></Link></article>}
          {editionMedia&&<article className="td-story-card td-story-card--media"><Image className="td-story-photo art-directed-photo" src={editionMedia.trophy.src} alt="" fill sizes="(max-width:759px) 94vw, 30vw" style={imageFocus(editionMedia.trophy.objectPosition||"center",editionMedia.trophy.mobileObjectPosition||editionMedia.trophy.objectPosition||"center")} unoptimized/><span className="td-story-shade" aria-hidden="true"/><span>Archivo visual</span><strong>{editionMedia.year}</strong><p>La final y el momento del trofeo, conservados en imagen y vídeo.</p><a className="deuce-cta deuce-cta--small" href="#edition-media-title">Ver archivo</a></article>}
        </div>
      </section>
    </div>
  );
}
