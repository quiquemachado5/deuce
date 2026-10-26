import Link from 'next/link';
import { calendarOrder } from '@/lib/presentation-calendar';
import { latestTournamentCourt } from '@/lib/tournament-presentation';
import { preparedArchive } from '@/lib/revista/read-records';
import { courtPhoto } from '@/lib/imagery';
import { tournamentName } from '@/lib/labels';
import { number, surfaceLabel } from '@/lib/cuaderno/model';
import { categoryYears, tournamentDirectory } from '@/lib/tournament-directory';
import { Pagination } from '@/components/nocturno/Row';
import { ArchivePage, ArchiveGrid } from '@/components/deuce/ArchivePage';
import { winnerName, roundPosition } from '@/lib/editorial';
type Query = { categoria?: string; page?: string };
type Props = { searchParams: Promise<Query> };
const primaryCategories = ["Grand Slam", "Masters 1000", "ATP 500", "ATP 250"] as const;
const primaryLabel = (category: string) => category === "Grand Slam" ? "Grand Slams" : category === "Challenger" ? "Challengers" : category === "ATP Tour · nivel no especificado" ? "Otros torneos ATP" : category;
const categoryUrl = (category: string, page = 1) =>
  `/tournaments?categoria=${encodeURIComponent(category)}${page > 1 ? `&page=${page}` : ""}`;

export async function generateMetadata({ searchParams }: Props) {
  const { categoria, page } = await searchParams;
  const pageNumber = Number(page);
  const title = categoria ? `${primaryLabel(categoria)} · Torneos — DEUCE` : "Torneos — DEUCE";
  const description = "Grand Slams, Masters y torneos ATP del archivo, separados por categoría y edición.";
  return {
    title,
    description,
    alternates: { canonical: categoria ? categoryUrl(categoria, Number.isFinite(pageNumber) ? Math.max(1, Math.floor(pageNumber)) : 1) : "/tournaments" },
    openGraph: { title, description, url: categoria ? categoryUrl(categoria) : "/tournaments" },
    twitter: { card: "summary_large_image", title, description },
  };
}


export default async function Tournaments({searchParams}:Props) {
  const [query,matches]=await Promise.all([searchParams,preparedArchive()]);
  const entries=calendarOrder(tournamentDirectory(matches)).sort((a,b)=>{
    const rank=(entry:typeof a)=>entry.canonical ? entry.categories.includes('Grand Slam')?0:entry.categories.includes('Masters 1000')?1:2:3;
    return rank(a)-rank(b);
  });
  const chosen=query.categoria&&primaryCategories.some(category=>category===query.categoria)?query.categoria:null;
  const selected=chosen?entries.filter(entry=>entry.categories.includes(chosen)):entries.filter(entry=>primaryCategories.slice(0,3).some(category=>entry.categories.includes(category)));
  const pages=Math.max(1,Math.ceil(selected.length/25));
  const page=Math.min(pages,Math.max(1,Math.floor(Number(query.page)||1)));
  const primaryLevelBySlug = new Map(entries.map(entry => [entry.slug, primaryCategories.slice(0, 3).find(level => entry.categories.includes(level))]));
  const cards=(chosen?selected.slice((page-1)*25,page*25):selected).map(entry=>{
    const activeCategory=chosen||primaryLevelBySlug.get(entry.slug);
    const filtered=activeCategory?entry.matches.filter(match=>match.category===activeCategory):entry.matches;
    const court=latestTournamentCourt(filtered),photo=entry.canonical?courtPhoto(entry.name):null;
    const years=activeCategory?categoryYears(entry,activeCategory):[...new Set(filtered.map(match=>match.year))].sort((a,b)=>b-a);
    const latestFinal=filtered.filter(match=>roundPosition(match.round)===7).sort((a,b)=>b.year-a.year||b.score_summary.timestamp.localeCompare(a.score_summary.timestamp))[0];
    const champion=latestFinal?winnerName(latestFinal):null;
    return {surface:court.surface,id:entry.slug,title:tournamentName(entry.name),image:photo?.src,alt:photo?.alt,imagePosition:'center',
      eyebrow:activeCategory?primaryLabel(activeCategory):entry.categories.map(primaryLabel).join(' · '),
      meta:`${champion?`Campeón ${latestFinal.year}: ${champion} · `:''}${surfaceLabel[court.surface]}${court.indoor === true?' · Bajo techo':''} · ${number(years.length)} ediciones · ${number(filtered.length)} partidos`,
      href:`/torneos/${entry.slug}${chosen?'?categoria='+encodeURIComponent(chosen):''}`};
  });
  return <ArchivePage title="Torneos" className="tournament-directory">
    <div className="archive-filter-shell archive-filter-shell--nav deuce-content"><nav className="deuce-tabs" aria-label="Categorías de torneos"><Link href="/tournaments" aria-current={!chosen?'page':undefined}>Principales</Link>{primaryCategories.map(category=><Link key={category} href={categoryUrl(category)} aria-current={chosen===category?'page':undefined}>{primaryLabel(category)}</Link>)}</nav></div>
    <p className="deuce-count deuce-content" role="status">{number(selected.length)} torneos {chosen?`de ${primaryLabel(chosen)}`:'entre Grand Slams, Masters 1000 y ATP 500'}</p>
    {chosen?<ArchiveGrid cards={cards}/>:<div className="tournament-category-groups">{primaryCategories.slice(0,3).map(category=>{const group=cards.filter(card=>primaryLevelBySlug.get(card.id)===category);return group.length?<section key={category} aria-labelledby={`group-${category.replace(' ','-')}`}><div className="tournament-group-heading"><h2 id={`group-${category.replace(' ','-')}`}>{primaryLabel(category)}</h2><Link href={categoryUrl(category)}>Ver los {number(entries.filter(entry=>entry.categories.includes(category)).length)} torneos ↗</Link></div><ArchiveGrid cards={group}/></section>:null})}</div>}
    {!selected.length&&<p className="deuce-content">No hay torneos publicados de esta categoría en esta copia del archivo.</p>}
    {chosen&&<Pagination page={page} total={selected.length} href={next=>categoryUrl(chosen,next)}/>}
  </ArchivePage>;
}
