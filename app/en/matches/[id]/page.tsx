import Link from 'next/link';
import { notFound } from 'next/navigation';
import { preparedCompactSelection, preparedSearchProducts } from '@/lib/revista/read-records';
import { playerSlug } from '@/lib/explore';
import { StructuredData } from '@/components/StructuredData';
import { breadcrumbJsonLd, matchJsonLd } from '@/lib/seo-metadata';
import styles from '../../archive.module.css';

const surfaceName={hard:'Hard court',clay:'Clay',grass:'Grass',carpet:'Carpet',unknown:'Surface not documented'} as const;
const playerHref=(name:string,tour:'atp'|'wta')=>`/en/players/${playerSlug(name)}${tour==='wta'?'?tour=wta':''}`;

export async function generateMetadata({params}:{params:Promise<{id:string}>}){
  const{id}=await params,[match]=await preparedCompactSelection({ids:[id]});
  return{title:match?`${match.player1.name} vs ${match.player2.name}, ${match.tournament} ${match.year} — DEUCE`:`Match ${id} — DEUCE`,description:match?`${match.tournament} ${match.year}, ${match.round}: ${match.player1.name} vs ${match.player2.name}, ${match.final_score}.`:undefined,alternates:{canonical:`/en/matches/${id}`,languages:{es:`/match/${id}`,en:`/en/matches/${id}`}}};
}

export default async function EnglishMatch({params}:{params:Promise<{id:string}>}){
  const{id}=await params;
  const [[match],products]=await Promise.all([preparedCompactSelection({ids:[id]}),preparedSearchProducts()]);
  if(!match)notFound();
  const tour=match.tour||'atp';
  const event=products.tournaments.find(row=>row.tour===tour&&row.name===match.tournament);
  const exactDate=match.context?.dateLabel==='Fecha del partido'&&match.context.date
    ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${match.context.date.slice(0,10)}T12:00:00Z`))
    : undefined;
  const winner=match.winner===1?match.player1.name:match.winner===2?match.player2.name:null;
  return <main className={styles.page} lang="en">
    <StructuredData value={[matchJsonLd(match,{language:'en'}),breadcrumbJsonLd([{name:'Home',path:'/en'},{name:'Matches',path:'/en/matches'},{name:`${match.player1.name} – ${match.player2.name}`,path:`/en/matches/${id}`}])]} />
    <header className={styles.heading}><div><p>{tour.toUpperCase()} · {match.category}</p><h1>{match.tournament}</h1></div><Link href="/en/matches">Back to matches</Link></header>
    <section className={styles.scoreboard} aria-label={`${match.player1.name} versus ${match.player2.name}. ${winner?`${winner} won.`:''}`}>
      {[match.player1,match.player2].map((player,side)=><div className={styles.scorePlayer} data-winner={match.winner===side+1?'':undefined} key={player.name}><Link href={playerHref(player.name,tour)}>{player.name}</Link><div className={styles.sets}>{match.score_summary.games.map((set,index)=><span data-won={set[side]>set[1-side]?'':undefined} key={index}>{set[side]}{match.score_summary.points[index]&&<sup>{match.score_summary.points[index]}</sup>}</span>)}</div>{match.winner===side+1&&<b>Winner</b>}</div>)}
      {!match.score_summary.games.length&&<strong className={styles.finalScore}>{match.final_score}</strong>}
    </section>
    <dl className={styles.context}><div><dt>Round</dt><dd>{match.round}</dd></div><div><dt>Season</dt><dd>{match.year}</dd></div><div><dt>Surface</dt><dd>{surfaceName[match.surface]}</dd></div><div><dt>Date</dt><dd>{exactDate||'Exact date not documented'}</dd></div></dl>
    <nav className={styles.entityLinks} aria-label="Explore related archive pages"><Link href={playerHref(match.player1.name,tour)}>{match.player1.name} career ↗</Link><Link href={playerHref(match.player2.name,tour)}>{match.player2.name} career ↗</Link>{event&&<Link href={`/en/tournaments/${event.slug}${tour==='wta'?'?tour=wta':''}`}>{event.name} archive ↗</Link>}</nav>
  </main>;
}
