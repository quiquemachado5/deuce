import Link from 'next/link';
import { calendarOrder } from '@/lib/presentation-calendar';
import { latestTournamentCourt } from '@/lib/tournament-presentation';
import { preparedArchive } from '@/lib/revista/read-records';
import { courtPhoto } from '@/lib/imagery';
import { playerPhoto } from '@/lib/player-imagery';
import { tournamentName } from '@/lib/labels';
import { surfaceLabel } from '@/lib/cuaderno/model';
import { categoryYears, tournamentDirectory } from '@/lib/tournament-directory';
import { Pagination } from '@/components/nocturno/Row';
import { ArchivePage } from '@/components/deuce/ArchivePage';
import TournamentShowcase, { type TournamentShowcaseCard } from '@/components/TournamentShowcase';
import { winnerName, roundPosition } from '@/lib/editorial';
import { TOURNAMENTS } from '@/lib/types';
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
  const selected=chosen?entries.filter(entry=>belongsToCurrentLevel(entry,chosen)):entries.filter(entry=>primaryCategories.slice(0,3).some(category=>belongsToCurrentLevel(entry,category)));
  const pages=Math.max(1,Math.ceil(selected.length/25)),page=Math.min(pages,Math.max(1,Math.floor(Number(query.page)||1)));
  const primaryLevelBySlug=new Map(entries.map(entry=>[entry.slug,primaryCategories.slice(0,3).find(level=>belongsToCurrentLevel(entry,level))]));
  const entryBySlug=new Map(entries.map(entry=>[entry.slug,entry]));
  const cards:TournamentShowcaseCard[]=(chosen?selected.slice((page-1)*25,page*25):selected).map(entry=>{
    const activeCategory=chosen||primaryLevelBySlug.get(entry.slug);
    const filtered=activeCategory?entry.matches.filter(match=>match.category===activeCategory):entry.matches;
    const court=latestTournamentCourt(filtered);
    const years=activeCategory?categoryYears(entry,activeCategory):[...new Set(filtered.map(match=>match.year))].sort((a,b)=>b-a);
    const latestFinal=filtered.filter(match=>roundPosition(match.round)===7).sort((a,b)=>b.year-a.year||b.score_summary.timestamp.localeCompare(a.score_summary.timestamp))[0];
    const champion=latestFinal?winnerName(latestFinal):null;
    const venuePhoto=entry.canonical?courtPhoto(entry.name):null;
    const championPhoto=!venuePhoto&&champion?playerPhoto(champion):null;
    const photo=venuePhoto||championPhoto;
    return {surface:court.surface,id:entry.slug,title:tournamentName(entry.name),image:photo?.src,alt:venuePhoto?.alt||(champion?`${champion}, campeón de la última edición registrada de ${tournamentName(entry.name)}`:photo?.alt),imagePosition:photo?.objectPosition||'center top',imagePositionMobile:photo?.mobileObjectPosition||photo?.objectPosition||'center top',champion,championYear:latestFinal?.year,editions:years.length,court:surfaceLabel[court.surface],href:`/torneos/${entry.slug}${chosen?'?categoria='+encodeURIComponent(chosen):''}`};
  });
  const tools=<div className="archive-filter-shell archive-filter-shell--nav"><nav className="deuce-tabs" aria-label="Categorías de torneos"><Link href="/torneos" aria-current={!chosen?'page':undefined}>Principales</Link>{primaryCategories.map(category=><Link key={category} href={categoryUrl(category)} aria-current={chosen===category?'page':undefined}>{primaryLabel(category)}</Link>)}</nav></div>;
  return <ArchivePage title="Torneos" className="tournament-directory" tools={tools}>{chosen?<div className="tournament-selected-showcase"><TournamentShowcase cards={cards.sort((a,b)=>latestPlayed(entryBySlug.get(b.id)!,chosen)-latestPlayed(entryBySlug.get(a.id)!,chosen))} variant={chosen==='Grand Slam'?'majors':chosen==='ATP 250'?'compact':'rail'} label={primaryLabel(chosen)}/></div>:<div className="tournament-category-groups">{primaryCategories.slice(0,3).map((category,index)=>{const group=cards.filter(card=>primaryLevelBySlug.get(card.id)===category).sort((a,b)=>latestPlayed(entryBySlug.get(b.id)!,category)-latestPlayed(entryBySlug.get(a.id)!,category));return group.length?<section key={category} aria-labelledby={`group-${category.replace(' ','-')}`}><div className="tournament-group-heading"><h2 id={`group-${category.replace(' ','-')}`}>{primaryLabel(category)}</h2><Link className="deuce-cta" href={categoryUrl(category)}>Ver todos</Link></div><TournamentShowcase cards={group} variant={index===0?'majors':index===1?'rail':'compact'} label={primaryLabel(category)}/></section>:null})}</div>}{!selected.length&&<div className="deuce-empty deuce-content"><h2>Sin torneos en esta categoría</h2><p>Prueba otra categoría o vuelve a los torneos principales.</p><Link href="/torneos">Ver torneos principales</Link></div>}{chosen&&<Pagination page={page} total={selected.length} href={next=>categoryUrl(chosen,next)}/>}</ArchivePage>;
}
