import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Trophy } from 'lucide-react';
import PlayerFlag from '@/components/PlayerFlag';
import { imageFocus } from '@/lib/image-focus';
import { comparisonHref, playerSlug } from '@/lib/explore';
import type { MatchRecord } from '@/types/deuce';
import type { Photo } from '@/lib/imagery';
import { number } from '@/lib/cuaderno/model';
import type { PlayerTrendRow } from '@/lib/player-trends';
import { ProfileProposalMotion, ProfilePerformance, ProfileSeasonExplorer, ProfileWinningRun } from '@/components/player/ProfileProposalInteractive';
import type { CareerSeason, RankingPoint } from '@/components/player/PlayerProfileInteractive';
import styles from './player-profile-proposal.module.css';

type Stat = { label: string; value: string; context: string };
type Surface = { key: string; label: string; wins: number; losses: number; played: number; rate: number };
type Insight = { kind: string; label: string; value: string; detail: string; photo: Photo | null };

function categoryOrder(category:string){
  if(category==='Grand Slam')return 0;
  if(/1000/i.test(category))return 1;
  if(/500/i.test(category))return 2;
  if(/250/i.test(category))return 3;
  return 4;
}

export function ProfileProposalHero({ name, country, hand, tour, activity, photo, metrics, preview=false }: {
  name: string; country?: string; hand?: string; tour: string; activity: string; photo: Photo | null; metrics: Stat[]; preview?:boolean;
}) {
  const original = '/jugadores/' + playerSlug(name) + (tour === 'wta' ? '?tour=wta' : '');
  return <ProfileProposalMotion className={styles.opening}>
    <header id="resumen" className={styles.hero}>
      <div className={styles.heroTitle}>
        <div><span className={styles.playerFlag}><PlayerFlag code={country}/></span><h1>{name}</h1></div>
        {preview&&<Link className={styles.original} href={original}>Ver ficha actual <ArrowUpRight size={16} aria-hidden="true"/></Link>}
      </div>
      <div className={styles.portraitStage} data-profile-scene="" data-has-photo={Boolean(photo) || undefined}>
        {photo && <Image fill preload sizes="(max-width:759px) 100vw, 1120px" src={photo.src} alt={photo.alt} style={imageFocus(photo.objectPosition || 'center', photo.mobileObjectPosition || photo.objectPosition || 'center')} />}
        <div className={styles.portraitCaption}><span>{tour.toUpperCase()}</span>{hand && <span>{hand}</span>}<span>{activity} en DEUCE</span></div>
      </div>
      <dl className={styles.ledger} aria-label="Cifras principales del archivo">
        {metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
      </dl>
    </header>
  </ProfileProposalMotion>;
}

export function ProfileProposalChapters({ name, tour, surfaces, insights, categories, seasons, ranking, playerPhoto, winningRun, participationCount }: {
  name: string; tour: 'atp' | 'wta'; surfaces: Surface[]; insights: Insight[]; categories: PlayerTrendRow[];
  seasons: CareerSeason[]; ranking: RankingPoint[]; playerPhoto: Photo | null; winningRun: MatchRecord[]; participationCount?:number;
}) {
  const season = insights.find(item=>item.kind==='season');
  const rival = insights.find(item=>item.kind==='rival');
  const appearances = insights.find(item=>item.kind==='appearances');
  const standout = seasons.find(item=>String(item.year)===season?.value);
  const neighbours=standout?seasons.slice(Math.max(0,seasons.indexOf(standout)-2),Math.min(seasons.length,seasons.indexOf(standout)+3)):[];
  const peak=Math.max(1,...neighbours.map(item=>item.wins));
  return <ProfileProposalMotion className={styles.chapters}>
    <section className={styles.performance} id="rendimiento" aria-labelledby="proposal-performance-title">
      <ProfilePerformance surfaces={surfaces} categories={[...categories].sort((a,b)=>categoryOrder(a.label)-categoryOrder(b.label))}/>
    </section>

    {(season || winningRun.length>1) && <section className={styles.milestones} aria-labelledby="proposal-milestones-title">
      <h2 id="proposal-milestones-title">Los momentos que destacan.</h2>
      <div className={styles.momentGrid}>
        {season && <article className={styles.seasonMoment}>
          <div className={styles.momentHeading}><h3>Mejor temporada</h3><a href="#temporadas" aria-label="Explorar temporadas"><ArrowUpRight size={18}/></a></div>
          <div className={styles.seasonMomentSummary}><strong>{season.value}</strong></div>
          {standout && <figure className={styles.neighbourSeasons}>
            <figcaption>Victorias por temporada</figcaption>
            <div>{neighbours.map(item=><div key={item.year} data-peak={item.year===standout.year||undefined}><span className={styles.barStat}><b>{number(item.wins)}</b>{item.year===standout.year&&item.titles>0&&<small title={number(item.titles)+' títulos'}><Trophy size={12} aria-hidden="true"/><span className={styles.sr}>Títulos: </span>{number(item.titles)}</small>}</span><i style={{height:`${Math.max(4,item.wins/peak*76)}px`}}/><span>{item.year}</span></div>)}</div>
          </figure>}
        </article>}
        {winningRun.length>1&&<ProfileWinningRun key={tour+':'+name} matches={winningRun} name={name}/>}
        {appearances&&participationCount!==undefined&&<article className={styles.compactAppearance} data-photo={Boolean(appearances.photo)||undefined}>{appearances.photo&&<Image src={appearances.photo.src} alt="" fill sizes="(max-width:759px) 50vw, 1px" style={{objectFit:'cover',objectPosition:appearances.photo.objectPosition||'center'}}/>}<h3>Más participaciones</h3><p><strong>{number(participationCount)}</strong></p><span title={appearances.value}>{appearances.value}</span></article>}
      </div>
    </section>}

    {seasons.length > 0 && <section className={styles.seasons} id="temporadas" aria-label="Temporadas y ranking">
      <ProfileSeasonExplorer seasons={seasons} ranking={ranking}/>
    </section>}

    {(rival || appearances) && <section className={styles.archiveStory} aria-labelledby="proposal-archive-title">
      <h2 id="proposal-archive-title">Dentro de su carrera.</h2>
      <div className={styles.careerStories}>
        {rival && <article className={styles.rivalStory}>
          <div className={styles.duelPortraits}>
            {[playerPhoto,rival.photo].map((photo,index)=><div key={index} data-profile-scene="">{photo&&<Image src={photo.src} alt={photo.alt} fill sizes="(max-width:759px) 50vw, 370px" style={imageFocus(photo.objectPosition||'center',photo.mobileObjectPosition||photo.objectPosition||'center')}/>}<span>{index===0?name:rival.value}</span></div>)}
          </div>
          <div className={styles.duelSummary}><div><h3>Su rival más frecuente</h3><p>{rival.detail}</p></div><Link href={comparisonHref(name,rival.value,'cara-a-cara',tour)}>Ver el cara a cara <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
        </article>}
        {appearances && <article className={styles.venueStory} data-profile-scene="">
          {appearances.photo&&<Image src={appearances.photo.src} alt={appearances.photo.alt} fill sizes="(max-width:759px) 100vw, 420px" style={{objectPosition:appearances.photo.objectPosition||'center'}}/>}
          <div><h3>Más participaciones</h3><strong>{appearances.value}</strong><p>{appearances.detail}</p></div>
        </article>}
      </div>
    </section>}


  </ProfileProposalMotion>;
}
