import Link from 'next/link';
import { calendarOrder } from '@/lib/presentation-calendar';
import { latestTournamentCourt } from '@/lib/tournament-presentation';
import { preparedArchive } from '@/lib/revista/read-records';
import { courtPhoto } from '@/lib/imagery';
import { tournamentName } from '@/lib/labels';
import { surfaceLabel } from '@/lib/cuaderno/model';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { Pagination } from '@/components/nocturno/Row';
import { ArchivePage } from '@/components/deuce/ArchivePage';
import TournamentGallery, { type TournamentGalleryCard } from '@/components/TournamentGallery';
import TournamentFilters from '@/components/TournamentFilters';
import { winnerName, roundPosition } from '@/lib/editorial';
import { TOURNAMENTS } from '@/lib/types';
import { ArrowRight } from 'lucide-react';
import styles from './tournament-directory.module.css';
type Query = { categoria?: string; page?: string };
type Props = { searchParams: Promise<Query> };
const primaryCategories = ["Grand Slam", "Masters 1000", "ATP 500", "ATP 250"] as const;
const primaryLabel = (category: string) => category === "Grand Slam" ? "Grand Slams" : category;
const categoryUrl = (category: string, page = 1) => `/torneos?categoria=${encodeURIComponent(category)}${page > 1 ? `&page=${page}` : ""}`;
const canonicalLevel = new Map<string,string>(TOURNAMENTS.map(tournament => [tournament.slug, tournament.category]));

function latestPlayed(entry: ReturnType<typeof tournamentDirectory>[number], category: string) {
  return entry.matches.filter(match=>match.category===category).reduce((latest,match)=>{
    const exact=Date.parse(match.context?.date||match.score_summary.timestamp);
    return Math.max(latest,Number.isFinite(exact)?exact:Date.UTC(match.year,0,1));
  },0);
}

export async function generateMetadata({ searchParams }: Props) {
  const { categoria, page } = await searchParams, pageNumber = Number(page);
  const title = categoria ? `${primaryLabel(categoria)} · Torneos — DEUCE` : "Torneos — DEUCE";
  const description = "Grand Slams, Masters y torneos ATP del archivo, separados por categoría y edición.";
  const canonical=categoria ? categoryUrl(categoria, Number.isFinite(pageNumber) ? Math.max(1, Math.floor(pageNumber)) : 1) : "/torneos";
  return {title,description,alternates:{canonical},openGraph:{title,description,url:canonical},twitter:{card:"summary_large_image",title,description}};
}

export default async function TournamentDirectory({searchParams}:Props) {
  const [query,matches]=await Promise.all([searchParams,preparedArchive()]);
  const latestArchiveYear=matches.reduce((latest,match)=>Math.max(latest,match.year),0);
  const entries=calendarOrder(tournamentDirectory(matches)).sort((a,b)=>{const rank=(entry:typeof a)=>entry.canonical?entry.categories.includes('Grand Slam')?0:entry.categories.includes('Masters 1000')?1:2:3;return rank(a)-rank(b);});
  const chosen=query.categoria&&primaryCategories.some(category=>category===query.categoria)?query.categoria:null;
  const belongsToCurrentLevel=(entry:typeof entries[number],level:string)=>{
    if(level==='Grand Slam'||level==='Masters 1000')return canonicalLevel.get(entry.slug)===level;
    return entry.categories.includes(level)&&entry.latestYear>=latestArchiveYear-1;
  };
  const selected=chosen?entries.filter(entry=>belongsToCurrentLevel(entry,chosen)):entries.filter(entry=>primaryCategories.some(category=>belongsToCurrentLevel(entry,category)));
  const pages=Math.max(1,Math.ceil(selected.length/25)),page=Math.min(pages,Math.max(1,Math.floor(Number(query.page)||1)));
  const primaryLevelBySlug=new Map(entries.map(entry=>[entry.slug,primaryCategories.find(level=>belongsToCurrentLevel(entry,level))]));
  const entryBySlug=new Map(entries.map(entry=>[entry.slug,entry]));
  const cards:TournamentGalleryCard[]=(chosen?selected.slice((page-1)*25,page*25):selected).map(entry=>{
    const activeCategory=chosen||primaryLevelBySlug.get(entry.slug);
    const filtered=activeCategory?entry.matches.filter(match=>match.category===activeCategory):entry.matches;
    const court=latestTournamentCourt(filtered);
    const latestFinal=filtered.filter(match=>roundPosition(match.round)===7).sort((a,b)=>b.year-a.year||b.score_summary.timestamp.localeCompare(a.score_summary.timestamp))[0];
    const champion=latestFinal?winnerName(latestFinal):null;
    const venuePhoto=courtPhoto(entry.name);
    return {surface:court.surface,id:entry.slug,title:tournamentName(entry.name),image:venuePhoto?.src,alt:venuePhoto?.alt,imagePosition:venuePhoto?.objectPosition||'center top',imagePositionMobile:venuePhoto?.mobileObjectPosition||venuePhoto?.objectPosition||'center top',champion,championYear:latestFinal?.year,court:surfaceLabel[court.surface],href:`/torneos/${entry.slug}${chosen?'?categoria='+encodeURIComponent(chosen):''}`};
  });
  const tools=<TournamentFilters items={[{href:'/torneos',label:'Principales',active:!chosen},...primaryCategories.map(category=>({href:categoryUrl(category),label:primaryLabel(category),active:chosen===category}))]}/>;
  const orderedCards=chosen?cards.sort((a,b)=>latestPlayed(entryBySlug.get(b.id)!,chosen)-latestPlayed(entryBySlug.get(a.id)!,chosen)):cards;
  return <ArchivePage title="Torneos" className={styles.page} tools={tools}><div className={styles.content}>
    {chosen?<section className={styles.selected} aria-labelledby="selected-tournaments"><div className={styles.groupHeader}><h2 id="selected-tournaments">{primaryLabel(chosen)}</h2><span className={styles.count}>{selected.length} torneos</span></div><TournamentGallery cards={orderedCards} variant={chosen==='Grand Slam'?'majors':chosen==='ATP 250'?'compact':'rail'} label={primaryLabel(chosen)}/></section>:<div className={styles.groups}>{primaryCategories.map((category,index)=>{const group=cards.filter(card=>primaryLevelBySlug.get(card.id)===category).sort((a,b)=>latestPlayed(entryBySlug.get(b.id)!,category)-latestPlayed(entryBySlug.get(a.id)!,category));return group.length?<section className={styles.group} key={category} aria-labelledby={`group-${category.replace(' ','-')}`}><div className={styles.groupHeader}><h2 id={`group-${category.replace(' ','-')}`}>{primaryLabel(category)}</h2><Link className={styles.allLink} href={categoryUrl(category)}><span>Ver todos</span><ArrowRight size={16} aria-hidden="true"/></Link></div><TournamentGallery cards={group} variant={index===0?'majors':index===1?'rail':'compact'} label={primaryLabel(category)}/></section>:null})}</div>}
    {!selected.length?<div className={styles.empty}><h2>Sin torneos en esta categoría</h2><p>Prueba otra categoría o vuelve a los torneos principales.</p><Link href="/torneos">Ver torneos principales</Link></div>:null}
    {chosen?<Pagination page={page} total={selected.length} href={next=>categoryUrl(chosen,next)}/>:null}
  </div></ArchivePage>;
}
