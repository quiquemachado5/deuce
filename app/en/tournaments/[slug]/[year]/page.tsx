import Link from 'next/link';
import { notFound } from 'next/navigation';
import { preparedCompactSelection, preparedEditionProducts } from '@/lib/revista/read-records';
import { roundPosition } from '@/lib/editorial';
import { playerSlug } from '@/lib/explore';
import { StructuredData } from '@/components/StructuredData';
import { absoluteSiteUrl, breadcrumbJsonLd } from '@/lib/seo-metadata';
import styles from '../../../archive.module.css';

type Props={params:Promise<{slug:string;year:string}>;searchParams:Promise<{tour?:string}>};
const circuit=(value?:string)=>value==='wta'?'wta' as const:'atp' as const;
const queryFor=(tour:'atp'|'wta')=>tour==='wta'?'?tour=wta':'';

async function edition(slug:string,year:number,tour:'atp'|'wta'){
  const products=await preparedEditionProducts();
  return Object.values(products.editions)
    .filter(item=>item.slug===slug&&item.year===year&&item.tour===tour)
    .sort((a,b)=>b.matchIds.length-a.matchIds.length)[0];
}

export async function generateMetadata({params,searchParams}:Props){
  const {slug,year}=await params,query=await searchParams,tour=circuit(query.tour),item=await edition(slug,Number(year),tour);
  const canonical=`/en/tournaments/${slug}/${year}${queryFor(tour)}`;
  return {title:item?`${item.tournament} ${year} ${tour.toUpperCase()} — DEUCE`:`Tournament edition ${year} — DEUCE`,description:item?`${item.matchIds.length} documented matches, champion and final from the ${item.tournament} ${year} ${tour.toUpperCase()} edition.`:undefined,alternates:{canonical,languages:{es:`/torneos/${slug}/${year}${tour==='wta'?'?cuadro=wta':''}`,en:canonical}}};
}

export default async function EnglishTournamentEdition({params,searchParams}:Props){
  const {slug,year:yearValue}=await params,query=await searchParams,year=Number(yearValue),tour=circuit(query.tour);
  if(!/^\d{4}$/.test(yearValue))notFound();
  const item=await edition(slug,year,tour);if(!item)notFound();
  const matches=await preparedCompactSelection({ids:item.matchIds});
  const final=matches.find(match=>roundPosition(match.round)===7);
  const name=item.tournament,suffix=queryFor(tour);
  const browse=new URLSearchParams({...(tour==='wta'?{tour}:{tour:'atp'}),year:String(year),q:name}).toString();
  const profile=(player:string)=>`/en/players/${playerSlug(player)}${suffix}`;
  const jsonLd={
    '@context':'https://schema.org','@type':'EventSeries',name:`${name} ${year} ${tour.toUpperCase()}`,
    url:absoluteSiteUrl(`/en/tournaments/${slug}/${year}${suffix}`),sport:'Tennis',
    organizer:{'@type':'SportsOrganization',name:tour.toUpperCase()},
    ...(item.champion?{winner:{'@type':'Person',name:item.champion,url:absoluteSiteUrl(profile(item.champion))}}:{}),
    subEvent:matches.slice(0,20).map(match=>({'@type':'SportsEvent',name:`${match.player1.name} – ${match.player2.name}`,url:absoluteSiteUrl(`/en/matches/${match.match_id}`)})),
  };
  return <main className={styles.page} lang="en">
    <StructuredData value={[jsonLd,breadcrumbJsonLd([{name:'Home',path:'/en'},{name:'Tournaments',path:'/en/tournaments'},{name,path:`/en/tournaments/${slug}${suffix}`},{name:String(year),path:`/en/tournaments/${slug}/${year}${suffix}`}])]} />
    <header className={styles.heading}><div><p>{tour.toUpperCase()} · {item.category}</p><h1>{name} {year}</h1></div><Link href={`/en/tournaments/${slug}${suffix}`}>Tournament history</Link></header>
    <section className={styles.editionSummary} aria-label="Edition summary">
      <article><span>Champion</span>{item.champion?<Link href={profile(item.champion)}>{item.champion}</Link>:<strong>Not documented</strong>}</article>
      <article><span>Matches</span><strong>{item.matchIds.length.toLocaleString('en-GB')}</strong></article><article><span>Players</span><strong>{item.players.toLocaleString('en-GB')}</strong></article><article><span>Games</span><strong>{item.games.toLocaleString('en-GB')}</strong></article>
    </section>
    {final&&<section className={styles.editionFinal} aria-labelledby="edition-final-title"><div><span>Final</span><h2 id="edition-final-title">{final.player1.name} <i>vs</i> {final.player2.name}</h2><p>{final.final_score}</p></div><Link href={`/en/matches/${final.match_id}`}>Open final ↗</Link></section>}
    <div className={styles.editionBrowse}><p>{item.deciding.toLocaleString('en-GB')} deciding-set matches · {item.comebacks.toLocaleString('en-GB')} comeback wins · {item.tiebreaks.toLocaleString('en-GB')} tie-breaks.</p><Link href={`/en/matches?${browse}`}>Browse all {item.matchIds.length.toLocaleString('en-GB')} matches ↗</Link></div>
  </main>;
}
