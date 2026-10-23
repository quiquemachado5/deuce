import Link from 'next/link';
import { calendarOrder } from '@/lib/presentation-calendar';
import { latestTournamentCourt } from '@/lib/tournament-presentation';
import { preparedArchive } from '@/lib/revista/read-records';
import { courtPhoto } from '@/lib/imagery';
import { tournamentName } from '@/lib/labels';
import { number, surfaceLabel } from '@/lib/cuaderno/model';
import { categoryLabel, categoryYears, tournamentDirectory } from '@/lib/tournament-directory';
import { Pagination } from '@/components/nocturno/Row';
import { ArchivePage, ArchiveGrid } from '@/components/deuce/ArchivePage';
type Query = { categoria?: string; page?: string };
type Props = { searchParams: Promise<Query> };
const orderedCategories = [
  "Grand Slam", "Masters 1000", "ATP 500", "ATP 250",
  "ATP Tour histórico", "ATP Tour", "ATP Tour · nivel no especificado", "Precursores de Masters",
];
const primaryCategories = ["Grand Slam", "Masters 1000", "ATP 500", "ATP 250", "Challenger"] as const;
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
  const categories=[...new Set([...primaryCategories,...entries.flatMap(entry=>entry.categories)])].sort((a,b)=>{
    const ia=orderedCategories.indexOf(a),ib=orderedCategories.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b,'es');
  });
  const chosen=query.categoria&&categories.includes(query.categoria)?query.categoria:null;
  const selected=chosen?entries.filter(entry=>entry.categories.includes(chosen)):entries;
  const pages=Math.max(1,Math.ceil(selected.length/25));
  const page=Math.min(pages,Math.max(1,Math.floor(Number(query.page)||1)));
  const cards=selected.slice((page-1)*25,page*25).map(entry=>{
    const filtered=chosen?entry.matches.filter(match=>match.category===chosen):entry.matches;
    const court=latestTournamentCourt(filtered),photo=entry.canonical?courtPhoto(entry.name):null;
    const years=chosen?categoryYears(entry,chosen):[...new Set(filtered.map(match=>match.year))].sort((a,b)=>b-a);
    return {surface:court.surface,id:entry.slug,title:tournamentName(entry.name),image:photo?.src,alt:photo?.alt,imagePosition:'center',
      eyebrow:chosen?primaryLabel(chosen):entry.categories.map(primaryLabel).join(' · '),
      meta:`${surfaceLabel[court.surface]}${court.indoor === true?' · Bajo techo':''} · ${number(years.length)} ediciones · ${number(filtered.length)} partidos`,
      href:`/torneos/${entry.slug}${chosen?'?categoria='+encodeURIComponent(chosen):''}`};
  });
  return <ArchivePage title="Torneos">
    <nav className="deuce-tabs deuce-content" aria-label="Categorías de torneos"><Link href="/tournaments" aria-current={!chosen?'page':undefined}>Todos</Link>{categories.map(category=><Link key={category} href={categoryUrl(category)} aria-current={chosen===category?'page':undefined}>{categoryLabel(category).replace('ATP Tour · nivel no especificado','Otros torneos ATP')}</Link>)}</nav>
    <p className="deuce-count deuce-content" role="status">{number(selected.length)} torneos</p>
    <ArchiveGrid cards={cards}/>
    {!selected.length&&<p className="deuce-content">No hay torneos publicados de esta categoría en esta copia del archivo.</p>}
    <Pagination page={page} total={selected.length} href={next=>chosen?categoryUrl(chosen,next):`/tournaments?page=${next}`}/>
  </ArchivePage>;
}
