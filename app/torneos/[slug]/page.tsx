import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { courtPhoto } from "@/lib/imagery";
import { number } from "@/lib/cuaderno/model";
import { preparedArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import { categoryLabel, tournamentCategory, tournamentDirectory, tournamentRows } from "@/lib/tournament-directory";
import { latestTournamentCourt } from "@/lib/tournament-presentation";
import { chronological, roundPosition, scoreFor, winnerName } from "@/lib/editorial";
import PlayerAvatar from "@/components/PlayerAvatar";
import TournamentChampionRail from "@/components/TournamentChampionRail";
import { championPhotoForEdition, playerPhotoAtTournament } from "@/lib/tournament-media";
import { playerEditionPhoto, playerPhoto } from "@/lib/player-imagery";
import { imageFocus } from "@/lib/image-focus";
import TournamentEditionNav from "@/components/TournamentEditionNav";
import styles from "@/components/tournament-detail.module.css";
import { tournamentDetailPhoto } from "@/lib/tournament-detail-media";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ categoria?: string; cuadro?: string }> };

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria, cuadro } = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find((entry) => entry.slug === slug);
  const requested=tournament?.matches.filter(match=>match.category===categoria)||[];
  const tour=cuadro==='wta'||(!cuadro&&requested.length>0&&requested.every(match=>match.tour==='wta'))||!tournament?.matches.some(match=>(match.tour||'atp')==='atp')?'wta':'atp';
  const matches=tournament?.matches.filter(match=>(match.tour||'atp')===tour)||[];
  const categories=[...new Set(matches.map(match=>match.category))];
  const category=categoria&&categories.includes(categoria)?categoria:tournament&&matches.length?tournamentCategory({...tournament,matches,categories,latestYear:Math.max(...matches.map(match=>match.year))}):"";
  const canonicalParams=new URLSearchParams();
  if(categoria&&tournament?.categories.includes(categoria))canonicalParams.set('categoria',categoria);
  if(cuadro==='wta')canonicalParams.set('cuadro','wta');
  const categoryQuery=canonicalParams.size?`?${canonicalParams}`:'';
  const title = `${tournament ? tournamentName(tournament.name) : "Torneo"}${category ? ` · ${categoryLabel(category)}` : ""} — DEUCE`;
  const description = "Títulos, finales y ediciones masculinas y femeninas de este torneo en el archivo.";
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
  const { categoria, cuadro } = await searchParams;
  const archive = await preparedArchive();
  const tournament = tournamentDirectory(archive).find((entry) => entry.slug === slug);
  if (!tournament) notFound();
  const hasWomen=tournament.matches.some(match=>match.tour==='wta');
  const hasMen=tournament.matches.some(match=>(match.tour||'atp')==='atp');
  const requestedCategory=categoria&&tournament.categories.includes(categoria)?categoria:undefined;
  const requestedRows=tournament.matches.filter(match=>match.category===requestedCategory);
  const selectedTour=cuadro==='wta'&&hasWomen?'wta':cuadro==='atp'&&hasMen?'atp':requestedRows.length&&requestedRows.every(match=>match.tour==='wta')?'wta':hasMen?'atp':'wta';
  const tourMatches=tournament.matches.filter(match=>(match.tour||'atp')===selectedTour);
  const tourCategories=[...new Set(tourMatches.map(match=>match.category))];
  const category=requestedCategory&&tourCategories.includes(requestedCategory)?requestedCategory:tournamentCategory({...tournament,matches:tourMatches,categories:tourCategories,latestYear:Math.max(...tourMatches.map(match=>match.year))});
  const registered=tourMatches.filter(match=>match.category===category);
  if (!registered.length) notFound();

  const pieces = tournamentRows(registered);
  const years = [...new Set(registered.map(match=>match.year))].sort((a,b)=>b-a);
  const court = latestTournamentCourt(registered);
  const photo = tournamentDetailPhoto(tournament.name) || courtPhoto(tournament.name);
  const rateRows = pieces.rate.slice(0, 6);
  const rateLeader = rateRows[0];
  const finals = registered
    .filter((match) => roundPosition(match.round) === 7 && winnerName(match))
    .sort((a, b) => chronological(b, a));
  const distinctChampions = new Set(finals.map((match) => winnerName(match)).filter(Boolean)).size;
  const distinctPlayers = new Set(registered.flatMap((match) => [match.player1.name, match.player2.name])).size;
  const distinctEditions = new Set(registered.map((match) => match.year)).size;
  const decidingFinals = finals.filter((match) => Math.abs(match.score_summary.sets[0] - match.score_summary.sets[1]) === 1).length;
  const matchSets = registered.reduce((total, match) => total + match.score_summary.games.length, 0);
  const matchGames = registered.reduce((total, match) => total + match.score_summary.games.reduce((sum, set) => sum + set[0] + set[1], 0), 0);
  const longestFinal = [...finals]
    .filter((match) => match.context?.minutes)
    .sort((a, b) => (b.context?.minutes || 0) - (a.context?.minutes || 0))[0];
  const finalPairs = new Map<string, { names: [string, string]; count: number }>();
  for (const match of finals) {
    const names = [match.player1.name, match.player2.name].sort((a, b) => a.localeCompare(b, "es")) as [string, string];
    const key = names.join("|");
    finalPairs.set(key, { names, count: (finalPairs.get(key)?.count || 0) + 1 });
  }
  const recurringFinal = [...finalPairs.values()].sort((a, b) => b.count - a.count)[0];
  const editionHref = (year: number) => `/torneos/${slug}/${year}?categoria=${encodeURIComponent(category)}${selectedTour==='wta'?'&cuadro=wta':''}`;
  const championFinals = finals.slice(0, 10);
  const playerHref = (href: string) => selectedTour === 'wta' && href.startsWith('/jugadores/')
    ? `${href}${href.includes('?') ? '&' : '?'}tour=wta` : href;
  const tournamentPlayerPhoto = (name: string) => {
    const titleYears = finals.filter((match) => winnerName(match) === name).map((match) => match.year);
    return selectedTour==='wta'?playerPhoto(name):playerPhotoAtTournament(name, tournament.name, titleYears);
  };
  const titlePodium = pieces.titles.slice(0, 3).map((row) => {
    const podiumPhoto = tournamentPlayerPhoto(row.name);
    const needsWimbledonPortraitFocus = slug === "wimbledon" && row.name === "Novak Djokovic";
    return {
      ...row,
      photo: podiumPhoto,
      photoFocus: imageFocus(
        needsWimbledonPortraitFocus ? "50% 0%" : podiumPhoto?.objectPosition || "center top",
        needsWimbledonPortraitFocus ? "50% 0%" : podiumPhoto?.mobileObjectPosition || podiumPhoto?.objectPosition || "center top",
      ),
    };
  });
  const latestFinal = finals[0];
  const latestChampion = latestFinal ? winnerName(latestFinal) : null;
  const latestChampionPhoto = latestFinal && latestChampion
    ? selectedTour==='wta'?playerPhoto(latestChampion):playerPhotoAtTournament(latestChampion, tournament.name, [latestFinal.year]) : null;
  const rateLeaderFinal = rateLeader ? finals.find((match) => winnerName(match) === rateLeader.name) : null;
  const rateLeaderPhoto = rateLeader
    ? (selectedTour==='atp'&&rateLeaderFinal ? championPhotoForEdition(tournament.name, rateLeaderFinal.year) : null)
      || tournamentPlayerPhoto(rateLeader.name)
    : null;
  const longestChampion = longestFinal ? winnerName(longestFinal) : null;
  const durationPhoto = longestFinal
    ? (selectedTour==='atp'?championPhotoForEdition(tournament.name, longestFinal.year):null) || (longestChampion ? tournamentPlayerPhoto(longestChampion) : null)
    : null;
  const titleName = tournamentName(tournament.name);
  const heroTitleLines = slug === "us-open" ? ["Abierto de", "Estados Unidos"] : [titleName];
  const categoryOptions = tourCategories.map((level) => ({
    value: level,
    label: categoryLabel(level),
    count: [...new Set(tournament.matches.filter(match=>match.category===level&&(match.tour||'atp')===selectedTour).map(match=>match.year))].length,
    years: [...new Set(tournament.matches.filter(match=>match.category===level&&(match.tour||'atp')===selectedTour).map(match=>match.year))].sort((a,b)=>b-a),
  }));

  return (
    <div className={`${styles.page} nc-wrap`} data-event-category={category} data-event-surface={court.surface} data-tournament={slug} data-grand-slam={category === "Grand Slam" ? "true" : undefined}>
      <header className={styles.hero}>
        {photo ? <Image className="art-directed-photo" src={photo.src} alt={photo.alt} fill sizes="100vw" style={imageFocus(photo.objectPosition || "center", photo.mobileObjectPosition || photo.objectPosition || "center")} priority unoptimized={photo.src.startsWith("/images/tournaments/detail/")} /> : <span className={styles.heroFallback} aria-hidden="true" />}
        <span className={styles.heroBackdrop} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div>
              <h1 className={styles.heroTitle}><span className={styles.heroName} data-hero-tournament-name="">{heroTitleLines.map((line) => <span className={styles.heroLine} key={line}>{line}</span>)}</span></h1>
            </div>
            <div className={styles.heroNav}>
              <TournamentEditionNav slug={slug} years={years} category={tournament.categories.length > 1 ? category : undefined} categories={categoryOptions} tour={selectedTour} />
            </div>
          </div>
        </div>
      </header>

      {hasMen&&hasWomen?<nav className={styles.editionTourSwitch} aria-label="Circuito del torneo"><Link href={`/torneos/${slug}?cuadro=atp`} aria-current={selectedTour==='atp'?'page':undefined} scroll={false}>ATP</Link><Link href={`/torneos/${slug}?cuadro=wta`} aria-current={selectedTour==='wta'?'page':undefined} scroll={false}>WTA</Link></nav>:null}

      {finals.length > 0 && <section className={styles.championSection} aria-labelledby="td-history-title">
        <TournamentChampionRail title={selectedTour==='wta'?'Campeonas de la historia':'Campeones de la historia'} titleId="td-history-title">
          {championFinals.map((final, finalIndex) => {
            const champion = winnerName(final)!;
            const opponent = final.player1.name === champion ? final.player2.name : final.player1.name;
            const titlePhoto = selectedTour==='atp'?championPhotoForEdition(tournament.name, final.year):null;
            const occurrence = championFinals.slice(0, finalIndex).filter((item) =>
              winnerName(item) === champion && !(selectedTour==='atp'&&championPhotoForEdition(tournament.name, item.year))
            ).length;
            const championPhoto = titlePhoto || playerEditionPhoto(champion, occurrence) || tournamentPlayerPhoto(champion);
            return <li key={final.match_id}><Link href={editionHref(final.year)} aria-label={`${champion}, ${selectedTour==='wta'?'campeona':'campeón'} en ${final.year}. Final ante ${opponent}`}>
              {championPhoto ? <Image className={`${styles.championPhoto} art-directed-photo`} src={championPhoto.src} alt={titlePhoto ? `${champion} con el trofeo de ${final.year}` : ""} fill sizes="(max-width: 759px) 78vw, 330px" style={imageFocus(championPhoto.objectPosition || "50% 20%", championPhoto.mobileObjectPosition || championPhoto.objectPosition || "50% 20%")} unoptimized /> : <PlayerAvatar name={champion} photo={null} size={80} />}
              <span className={styles.championShade} aria-hidden="true" /><span className={styles.championYear}>{final.year}</span><span className={styles.championCopy}><strong>{champion}</strong><span>Final ante {opponent}</span><small>{scoreFor(final, champion)}</small></span>
            </Link></li>;
          })}
        </TournamentChampionRail>
      </section>}

      {pieces.titles.length > 0 && <section className={`${styles.section} ${styles.namesSection}`} aria-labelledby="td-rankings-title">
        <div className={styles.sectionHead}><div><h2 id="td-rankings-title">Nombres que definen el torneo</h2></div></div>
        <div className={styles.namesPodium}>
          <ol className={styles.namesTopThree} data-count={titlePodium.length}>
            {titlePodium.map((row, index) => <li key={row.name} data-place={index + 1}><Link href={playerHref(row.href)} aria-label={`${row.name}: ${number(row.value)} títulos`}>
              {row.photo ? <Image className="art-directed-photo" src={row.photo.src} alt={row.photo.alt} fill sizes={index === 0 ? "(max-width:759px) 100vw, 56vw" : "(max-width:759px) 48vw, 36vw"} style={row.photoFocus} unoptimized /> : <span className={styles.podiumAvatar}><PlayerAvatar name={row.name} photo={null} size={96}/></span>}
              <span className={styles.podiumShade} aria-hidden="true" />
              <span className={styles.podiumCopy}><strong>{row.name}</strong><span><b>{number(row.value)}</b> títulos</span></span>
            </Link></li>)}
          </ol>
          {pieces.titles.length > 3 && <div className={styles.namesChasers}><div><span>El siguiente escalón</span><strong>La persecución continúa</strong></div><ol>{pieces.titles.slice(3, 9).map((row) => <li key={row.name}><Link href={playerHref(row.href)}><PlayerAvatar name={row.name} photo={tournamentPlayerPhoto(row.name)} size={38}/><span><strong>{row.name}</strong></span><b>{number(row.value)}</b></Link></li>)}</ol></div>}
          {pieces.played.length > 0 && <div className={styles.namesAppearances}><span>Más veces en la final</span><ol>{pieces.played.slice(0, 6).map((row) => <li key={row.name}><Link href={playerHref(row.href)}><PlayerAvatar name={row.name} photo={tournamentPlayerPhoto(row.name)} size={34}/><span><strong>{row.name}</strong><small>{number(row.value)} finales</small></span></Link></li>)}</ol></div>}
        </div>
      </section>}

      {rateLeader && <section className={`${styles.section} ${styles.rateSection}`} aria-labelledby="td-effectiveness-title">
        <div className={styles.sectionHead}><div><h2 id="td-effectiveness-title">Efectividad en este torneo</h2></div></div>
        <div className={styles.rateEditorial}>
          <article className={styles.rateLeaderFeature}>{rateLeaderPhoto && <Image className="art-directed-photo" src={rateLeaderPhoto.src} alt={rateLeaderPhoto.alt} fill sizes="(max-width:759px) 100vw, 45vw" style={imageFocus(rateLeaderPhoto.objectPosition || "center top",rateLeaderPhoto.mobileObjectPosition || rateLeaderPhoto.objectPosition || "center top")} unoptimized/>}<span className={styles.photoShade} aria-hidden="true"/><div><strong>{number(rateLeader.value,1)}%</strong><Link href={rateLeader.href}>{rateLeader.name}<ArrowUpRight size={20} aria-hidden="true"/></Link><p>{rateLeader.detail}</p></div></article>
          <div className={styles.rateMatrix}><ol>{rateRows.slice(1).map((row,index)=><li key={row.name} data-rank={index+2}><Link href={playerHref(row.href)} aria-label={`${row.name}: ${number(row.value,1)} %, ${row.detail}`}><span className={styles.ratePerson}><PlayerAvatar name={row.name} photo={tournamentPlayerPhoto(row.name)} size={42}/><span><strong>{row.name}</strong><small>{row.detail}</small></span></span><b>{number(row.value,1)}%</b><ArrowUpRight size={18} aria-hidden="true"/></Link></li>)}</ol></div>
        </div>
      </section>}

      <section className={`${styles.section} ${styles.dataSection}`} aria-labelledby="td-stories-title">
        <div className={styles.dataSectionInner}>
          <div className={styles.sectionHead}><div><h2 id="td-stories-title">El torneo, visto desde los datos</h2></div></div>
          <div className={styles.dataAtlas}>
          {longestFinal && <article className={styles.dataLead}>{durationPhoto&&<Image className="art-directed-photo" src={durationPhoto.src} alt={durationPhoto.alt} fill sizes="(max-width:759px) 100vw, 55vw" style={imageFocus(durationPhoto.objectPosition||"center top",durationPhoto.mobileObjectPosition||durationPhoto.objectPosition||"center top")} unoptimized/>}<span className={styles.photoShade} aria-hidden="true"/><div><span>La final más larga documentada</span><strong>{Math.floor((longestFinal.context?.minutes || 0) / 60)} h {(longestFinal.context?.minutes || 0) % 60} min</strong><p>{longestFinal.player1.name} contra {longestFinal.player2.name} · {longestFinal.year}</p><Link href={`/match/${longestFinal.match_id}`}>Ver partido <ArrowRight size={16} aria-hidden="true"/></Link></div></article>}
          <div className={styles.dataLedger}>
            {[
              ["Partidos registrados",number(registered.length)],
              ["Ediciones disponibles",number(distinctEditions)],
              [selectedTour==='wta'?"Jugadoras distintas":"Jugadores distintos",number(distinctPlayers)],
              ["Finales publicadas",number(finals.length)],
              [selectedTour==='wta'?"Campeonas distintas":"Campeones distintos",number(distinctChampions)],
              ["Sets por partido",number(registered.length?matchSets/registered.length:0,1)],
              ["Juegos por partido",number(registered.length?matchGames/registered.length:0,1)],
              ["Finales al decisivo",number(decidingFinals)],
            ].map(([label,value],index)=><div key={label} data-stat={index+1}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
          {recurringFinal&&<article className={styles.dataRivalry}><div className={styles.dataFaces}><PlayerAvatar name={recurringFinal.names[0]} photo={tournamentPlayerPhoto(recurringFinal.names[0])} size={58}/><PlayerAvatar name={recurringFinal.names[1]} photo={tournamentPlayerPhoto(recurringFinal.names[1])} size={58}/></div><span>La final que vuelve</span><strong>{recurringFinal.names[0]} <i>contra</i> {recurringFinal.names[1]}</strong><p>{number(recurringFinal.count)} enfrentamientos por el título.</p></article>}
          {latestFinal&&latestChampion&&<article className={styles.dataLatest}>{latestChampionPhoto&&<Image className="art-directed-photo" src={latestChampionPhoto.src} alt={latestChampionPhoto.alt} fill sizes="(max-width:759px) 100vw, 45vw" style={imageFocus(latestChampionPhoto.objectPosition||"center top",latestChampionPhoto.mobileObjectPosition||latestChampionPhoto.objectPosition||"center top")} unoptimized/>}<span className={styles.photoShade} aria-hidden="true"/><div><span>Última final registrada · {latestFinal.year}</span><strong>{latestChampion}</strong><p>{scoreFor(latestFinal,latestChampion)}</p><Link href={editionHref(latestFinal.year)}>Abrir edición <ArrowRight size={16} aria-hidden="true"/></Link></div></article>}
          </div>
        </div>
      </section>
    </div>
  );
}
