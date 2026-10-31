import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { preparedTournamentArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import {
  categoryLabel,
  tournamentDirectory,
} from "@/lib/tournament-directory";
import { roundPosition, durationLabel, winnerName } from "@/lib/editorial";
import { eligibleMatch } from "@/lib/quality";
import { archiveSummary, gamesInMatch, isDeciding, lostOpening, tiebreakCount } from "@/lib/archive-insights";
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
import EditionInsightsRail, { type EditionInsightSlide } from "@/components/EditionInsightsRail";
import styles from "@/components/tournament-detail.module.css";
import { tournamentDetailFeaturePhoto, tournamentDetailPhoto } from "@/lib/tournament-detail-media";
import { auditEditions } from "@/lib/edition-audit";

type Props = {
  params: Promise<{ slug: string; year: string }>;
  searchParams: Promise<{ categoria?: string; cuadro?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const tournament = tournamentDirectory(await preparedTournamentArchive()).find(
    (entry) => entry.slug === slug,
  );
  const options =
    tournament?.matches.filter((match) => match.year === Number(year)) || [];
  const men=options.filter(match=>(match.tour||'atp')==='atp');
  const women=options.filter(match=>match.tour==='wta');
  const requested=options.filter(match=>match.category===query.categoria);
  const selected=query.cuadro==='wta'&&women.length?women:query.cuadro==='atp'&&men.length?men:requested.length&&requested.every(match=>match.tour==='wta')?women:men.length?men:women;
  const level=query.categoria&&selected.some(match=>match.category===query.categoria)?query.categoria:selected[0]?.category;
  const canonicalParams = new URLSearchParams();
  if (level && new Set(options.map((match) => match.category)).size > 1)
    canonicalParams.set("categoria", level);
  if (selected === women && women.length) canonicalParams.set("cuadro", "wta");
  const title = `${tournament ? tournamentName(tournament.name) : "Edición"} ${year}${level ? ` · ${categoryLabel(level)}` : ""} — DEUCE`;
  const description = `La final, el cuadro y los resultados ${selected === women ? 'femeninos' : 'masculinos'} de esta edición.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/torneos/${slug}/${year}${canonicalParams.size ? `?${canonicalParams}` : ""}`,
    },
    openGraph: { title, description, url: `/torneos/${slug}/${year}${canonicalParams.size ? `?${canonicalParams}` : ""}` },
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
  const men=edition.filter(match=>(match.tour||'atp')==='atp');
  const women=edition.filter(match=>match.tour==='wta');
  if (!men.length && !women.length) notFound();
  const requestedCategory=query.categoria&&categories.includes(query.categoria)?query.categoria:undefined;
  const requestedMatches=edition.filter(match=>match.category===requestedCategory);
  const selectedTour=query.cuadro==='wta'&&women.length?'wta':query.cuadro==='atp'&&men.length?'atp':requestedMatches.length&&requestedMatches.every(match=>match.tour==='wta')?'wta':men.length?'atp':'wta';
  const selectedMatches=selectedTour==='wta'?women:men;
  const category=requestedCategory&&selectedMatches.some(match=>match.category===requestedCategory)?requestedCategory:selectedMatches[0]?.category;
  const matches=selectedMatches.filter(match=>match.category===category);
  const editionAudit=auditEditions(matches)[0];
  const court = editionTournamentCourt(matches);
  const final = matches.find((match) => roundPosition(match.round) === 7);
  const measuredMatches=matches.filter(eligibleMatch);
  const summary=archiveSummary(measuredMatches);
  const observation=(key:string)=>summary.observations.find(item=>item.metric.key===key);
  const comebacks=measuredMatches.filter(match=>lostOpening(match));
  const closest = [...measuredMatches].sort((a, b) => closeness(b) - closeness(a))[0];
  const timed = measuredMatches
    .filter((match) => publishedMatchMinutes(match) !== null)
    .sort((a, b) => publishedMatchMinutes(b)! - publishedMatchMinutes(a)!);
  const champion=final?winnerName(final):null;
  const heroPhoto = tournamentDetailPhoto(tournament.name) || courtPhoto(tournament.name);
  const detailPhoto = tournamentDetailFeaturePhoto(tournament.name);
  const tiebreaks=measuredMatches.reduce((total,match)=>total+tiebreakCount(match),0);
  const tiebreakMatches=measuredMatches.filter(match=>tiebreakCount(match)>0);
  const decidingMatches=measuredMatches.filter(isDeciding);
  const straightSetWins=measuredMatches.filter(match=>match.winner&&match.score_summary.games.every(set=>set[match.winner!-1]>set[2-match.winner!])).length;
  const bagelMatches=measuredMatches.filter(match=>match.score_summary.games.some(set=>Math.max(...set)===6&&Math.min(...set)===0));
  const totalSets = measuredMatches.reduce((total, match) => total + match.score_summary.games.length, 0);
  const totalGames = measuredMatches.reduce((total, match) => total + gamesInMatch(match), 0);
  const rounds = new Set(matches.map(match => roundPosition(match.round)).filter(Boolean)).size;
  const averageDuration = timed.length
    ? Math.round(timed.reduce((sum, match) => sum + publishedMatchMinutes(match)!, 0) / timed.length)
    : null;
  const championPath = champion ? matches.filter(match => winnerName(match) === champion).length : 0;
  const championMatches=champion?measuredMatches.filter(match=>match.player1.name===champion||match.player2.name===champion):[];
  const championSetsLost=championMatches.reduce((total,match)=>{
    const side=match.player1.name===champion?0:1;
    return total+match.score_summary.games.filter(set=>set[side]<set[1-side]).length;
  },0);
  const championGameBalance=championMatches.reduce((balance,match)=>{
    const side=match.player1.name===champion?0:1;
    return balance+match.score_summary.games.reduce((sum,set)=>sum+set[side]-set[1-side],0);
  },0);
  const playersInEdition=new Set(measuredMatches.flatMap(match=>[match.player1.name,match.player2.name])).size;
  const longestByGames=[...measuredMatches].sort((a,b)=>gamesInMatch(b)-gamesInMatch(a))[0];
  const winningMargin=(match:typeof measuredMatches[number])=>{
    if(!match.winner)return 0;
    return match.score_summary.games.reduce((margin,set)=>margin+set[match.winner!-1]-set[2-match.winner!],0);
  };
  const widestWin=[...measuredMatches].sort((a,b)=>winningMargin(b)-winningMargin(a))[0];
  const rate=(count:number)=>measuredMatches.length?Math.round(count/measuredMatches.length*100):0;
  const upsets=observation("upsets");
  const aces=observation("aces-average");
  const breakEfficiency=observation("break-efficiency");
  const editionSignals=[
    {label:"Al set decisivo",value:number(decidingMatches.length),detail:`${number(rate(decidingMatches.length))} % de los partidos`},
    {label:"Remontadas",value:number(comebacks.length),detail:`tras perder el primer set · ${number(rate(comebacks.length))} %`},
    {label:"Con tie-break",value:number(tiebreakMatches.length),detail:`${number(tiebreaks)} desempates en total`},
    {label:"Sin ceder set",value:number(straightSetWins),detail:`${number(rate(straightSetWins))} % de las victorias`},
    {label:"Sets 6–0",value:number(bagelMatches.length),detail:"partidos con al menos un rosco"},
    {label:"Juegos por set",value:number(totalSets?totalGames/totalSets:0,1),detail:`${number(totalSets)} sets documentados`},
    ...(upsets&&upsets.numerator!==undefined?[{label:"Sorpresas de ranking",value:number(upsets.numerator),detail:`${number(upsets.value,1)} % en ${number(upsets.sample)} partidos con ranking`}]:[]),
    ...(aces?[{label:"Aces por partido",value:number(aces.value,1),detail:`muestra de ${number(aces.sample)} encuentros`}]:[]),
    ...(breakEfficiency?[{label:"Bolas de break",value:`${number(breakEfficiency.value,1)} %`,detail:`${number(breakEfficiency.numerator||0)} de ${number(breakEfficiency.denominator||0)} convertidas`}]:[]),
    ...(averageDuration?[{label:"Duración media",value:durationLabel(averageDuration),detail:`${number(timed.length)} partidos con tiempo publicado`}]:[]),
  ].slice(0,8);
  const editionSpotlights=[
    closest&&{match:closest,label:"El partido más ajustado",value:`${number(closeness(closest))}/100`},
    longestByGames&&{match:longestByGames,label:"El maratón de la edición",value:`${number(gamesInMatch(longestByGames))} juegos`},
    widestWin&&{match:widestWin,label:"La victoria más amplia",value:`+${number(winningMargin(widestWin))} juegos`},
    timed[0]&&{match:timed[0],label:"La mayor duración publicada",value:durationLabel(publishedMatchMinutes(timed[0])!)},
  ].filter((item):item is {match:typeof measuredMatches[number];label:string;value:string}=>Boolean(item));
  const editionPortrait = champion
    ? (selectedTour==='atp'?championPhotoForEdition(tournament.name, Number(year)) || playerPhotoAtTournament(champion, tournament.name):null) || playerPhoto(champion)
    : detailPhoto || heroPhoto;
  const spotlightSlides: Extract<EditionInsightSlide,{kind:"photo"}>[] = editionSpotlights.slice(0,3).flatMap((item) => {
    const subject = winnerName(item.match) || item.match.player1.name;
    const photo = (selectedTour==='atp'?playerPhotoAtTournament(subject, tournament.name):null) || playerPhoto(subject) || detailPhoto || heroPhoto;
    if (!photo) return [];
    return [{
      kind: "photo" as const,
      label: item.label,
      title: `${item.match.player1.name} · ${item.match.player2.name}`,
      value: item.value,
      detail: `${categoryLabel(category)} · ${year}`,
      image: { src: photo.src, alt: photo.alt, objectPosition: photo.objectPosition },
    }];
  });
  const insightSlides: EditionInsightSlide[] = [
    ...(spotlightSlides[0] ? [spotlightSlides[0]] : []),
    {
      kind: "chart",
      label: "Anatomía del cuadro",
      title: "Cómo se resolvieron los partidos",
      detail: `${number(measuredMatches.length)} partidos finalizados forman la base de esta lectura.`,
      bars: [
        { label: "Set decisivo", value: rate(decidingMatches.length), display: `${number(rate(decidingMatches.length))} %` },
        { label: "Remontada", value: rate(comebacks.length), display: `${number(rate(comebacks.length))} %` },
        { label: "Con tie-break", value: rate(tiebreakMatches.length), display: `${number(rate(tiebreakMatches.length))} %` },
        { label: "Sin ceder set", value: rate(straightSetWins), display: `${number(rate(straightSetWins))} %` },
      ],
    },
    {
      kind: "scale",
      label: "Escala de la edición",
      title: "Una radiografía compacta del torneo",
      value: number(totalGames),
      detail: "juegos documentados de principio a fin.",
      facts: [
        { value: number(playersInEdition), label: selectedTour==='wta'?"jugadoras":"jugadores" },
        { value: number(totalSets), label: "sets" },
        { value: number(rounds), label: "rondas" },
      ],
    },
    ...spotlightSlides.slice(1),
  ];
  const tourCategories=[...new Set(tournament.matches.filter(match=>(match.tour||'atp')===selectedTour).map(match=>match.category))];
  const categoryOptions = tourCategories.map((level) => ({
    value: level,
    label: categoryLabel(level),
    years: [...new Set(tournament.matches.filter(match=>match.category===level&&(match.tour||'atp')===selectedTour).map(match=>match.year))].sort((a,b)=>b-a),
  }));
  const titleName = tournamentName(tournament.name);
  const heroTitleLines = slug === "us-open" ? ["Abierto de", "Estados Unidos"] : [titleName];
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
              <h1 className={styles.heroTitle}><span className={styles.heroName} data-hero-tournament-name="">{heroTitleLines.map((line) => <span className={styles.heroLine} key={line}>{line}</span>)}</span><span className={styles.heroYear}>{year}</span></h1>
            </div>
            <div className={styles.heroNav}><TournamentEditionNav slug={slug} years={categoryOptions.find(option=>option.value===category)?.years||[]} currentYear={Number(year)} category={tournament.categories.length > 1 ? category : undefined} categories={categoryOptions} tour={selectedTour}/></div>
          </div>
        </div>
      </header>

      {men.length>0&&women.length>0?<nav className={styles.editionTourSwitch} aria-label="Cuadro de la edición"><Link href={`/torneos/${slug}/${year}?cuadro=atp`} aria-current={selectedTour==='atp'?'page':undefined} scroll={false}>ATP</Link><Link href={`/torneos/${slug}/${year}?cuadro=wta`} aria-current={selectedTour==='wta'?'page':undefined} scroll={false}>WTA</Link></nav>:null}
      <nav className={styles.sectionIndex} aria-label="Secciones de la edición">{final&&<a href="#final-edition">Final</a>}<a href="#cuadro">Cuadro documentado</a>{measuredMatches.length>0&&<a href="#edition-insights-title">Lecturas</a>}</nav>
      {final&&<TournamentFinal match={final} heading={men.length&&women.length?selectedTour==='wta'?'La final femenina':'La final masculina':'La final'}/>}
      {matches.length>0&&<><aside className={styles.drawCoverage} data-complete={editionAudit?.completeDraw===true||undefined}><strong>Cuadro documentado</strong><span>{editionAudit?.completeDraw===true?'Rondas finales completas en esta publicación.':editionAudit?.missingLateRounds.length?`Cobertura parcial: faltan ${editionAudit.missingLateRounds.join(', ')}.`:'La publicación conserva solo los partidos disponibles.'}</span><Link href="/cobertura/revision">Ver cobertura</Link></aside><TournamentBracket matches={matches} heading={men.length&&women.length?selectedTour==='wta'?'Cuadro femenino documentado':selectedTour==='atp'?'Cuadro masculino documentado':'Cuadro documentado':'Cuadro documentado de la edición'}/></>}
      {measuredMatches.length > 0 && (
        <section className={styles.editionReadings} id="lecturas" aria-labelledby="edition-insights-title">
          <div className={styles.sectionHead}><div><h2 id="edition-insights-title">Lecturas de la edición{men.length&&women.length?selectedTour==='wta'?' · WTA':' · ATP':''}</h2></div></div>
          <div className={styles.editionStory}>
            <article className={styles.editionLead}>
              {editionPortrait && <Image className="art-directed-photo" src={editionPortrait.src} alt={editionPortrait.alt} fill sizes="(max-width:759px) 100vw, 54vw" style={imageFocus(editionPortrait.objectPosition || "center top", editionPortrait.mobileObjectPosition || editionPortrait.objectPosition || "center top")} unoptimized />}
              <span className={styles.photoShade} aria-hidden="true" />
              <div><span>El pulso de {year}</span><strong>{number(totalGames)}</strong><p>juegos. Una edición medida punto a punto, con la atmósfera que la hizo única.</p></div>
            </article>
            <div className={styles.editionFocus}>
              <article><span>Camino {selectedTour==='wta'?'de la campeona':'del campeón'}</span><strong>{number(championPath)}</strong><p>{champion ? `${champion}: ${number(championSetsLost)} sets cedidos y balance de ${championGameBalance>=0?"+":""}${number(championGameBalance)} juegos.` : `No hay ${selectedTour==='wta'?'campeona':'campeón'} documentado en esta edición.`}</p></article>
              <article><span>Cuadro documentado</span><strong>{number(playersInEdition)}</strong><p>{selectedTour==='wta'?'jugadoras':'jugadores'} · {number(measuredMatches.length)} partidos · {number(rounds)} rondas documentadas.</p></article>
            </div>
            <EditionInsightsRail slides={insightSlides} />
            <div className={styles.editionSignals} data-count={editionSignals.length} aria-label="Ritmo de la edición">
              {editionSignals.map((signal,index)=><article key={signal.label} data-signal={index+1}><span>{signal.label}</span><strong>{signal.value}</strong><small>{signal.detail}</small></article>)}
            </div>
            <div className={styles.editionMatches}>
              {editionSpotlights.slice(0,3).map(item=><Link href={`/match/${item.match.match_id}`} key={item.label}><span><small>{item.label}</small><strong>{item.match.player1.name} <i>contra</i> {item.match.player2.name}</strong></span><b>{item.value}</b><ArrowRight size={20} aria-hidden="true" /></Link>)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
