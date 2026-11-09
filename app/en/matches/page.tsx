import Link from 'next/link';
import { preparedMatchBrowser } from '@/lib/revista/read-records';
import { queryMatchBrowserPage, type BrowserFilter } from '@/lib/match-browser-snapshot';
import { noIndexFollow } from '@/lib/seo-metadata';
import styles from './matches.module.css';

type Query = { tour?: string; q?: string; page?: string; year?: string; surface?: string; category?: string };

function circuit(query: Query) {
  return query.tour === 'wta' ? 'wta' : query.tour === 'atp' ? 'atp' : 'all';
}

function browseHref(query: Query, updates: Partial<Query>) {
  const next = { ...query, ...updates };
  const params = new URLSearchParams();
  if (next.tour === 'atp' || next.tour === 'wta') params.set('tour', next.tour);
  if (next.q?.trim()) params.set('q', next.q.trim());
  if (next.year) params.set('year', next.year);
  if (next.surface) params.set('surface', next.surface);
  if (next.category) params.set('category', next.category);
  if (next.page && Number(next.page) > 1) params.set('page', next.page);
  const suffix = params.toString();
  return `/en/matches${suffix ? `?${suffix}` : ''}`;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  const query=await searchParams,tour=circuit(query);
  const filtered=Boolean(query.q||query.year||query.surface||query.category);
  const canonical=filtered
    ? (tour==='all'?'/en/matches':`/en/matches?tour=${tour}`)
    : browseHref(query,{page:query.page});
  const spanish=tour==='all'?'/partidos?tour=all':tour==='wta'?'/partidos?tour=wta':'/partidos';
  return {
    title: `${query.q?`${query.q} · `:''}Tennis matches — DEUCE`,
    description: 'Search documented ATP and WTA results by player, tournament and season.',
    alternates: { canonical, languages: { es: spanish, en: canonical } },
    robots: filtered ? noIndexFollow : undefined,
  };
}

export default async function EnglishMatches({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams, tour = circuit(query);
  const page=Math.max(1,Number.parseInt(query.page||'1',10)||1);
  const year=/^\d{4}$/.test(query.year||'')?Number(query.year):undefined;
  const filter: BrowserFilter={
    q:query.q?.trim()||undefined,
    year,
    surface:query.surface||undefined,
    category:query.category||undefined,
  };
  const browser=await preparedMatchBrowser(tour);
  const result=queryMatchBrowserPage(browser.partitions,filter,page,40);
  const pages=Math.max(1,Math.ceil(result.total/result.limit));
  const circuits=tour==='all'?(['atp','wta'] as const):([tour] as const);
  const years=[...new Set(circuits.flatMap(value=>browser.index.circuits[value].years))].sort((a,b)=>b-a);
  const categories=[...new Set(circuits.flatMap(value=>browser.index.circuits[value].categories))].sort();
  return <main className={styles.page} lang="en">
    <header><div><h1>Matches</h1></div><nav aria-label="Circuit">{(['all','atp','wta'] as const).map(value=><Link key={value} aria-current={tour===value?'page':undefined} href={browseHref(query,{tour:value,page:undefined})}>{value==='all'?'ATP + WTA':value.toUpperCase()}</Link>)}</nav></header>
    <form className={styles.filters} action="/en/matches" role="search">
      {tour!=='all'&&<input type="hidden" name="tour" value={tour}/>}<label><span>Player or tournament</span><input name="q" defaultValue={query.q||''} placeholder="e.g. Serena Williams or Wimbledon"/></label>
      <label><span>Season</span><select name="year" defaultValue={query.year||''}><option value="">All years</option>{years.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
      <label><span>Surface</span><select name="surface" defaultValue={query.surface||''}><option value="">All surfaces</option><option value="hard">Hard</option><option value="clay">Clay</option><option value="grass">Grass</option><option value="carpet">Carpet</option></select></label>
      <label><span>Level</span><select name="category" defaultValue={query.category||''}><option value="">All levels</option>{categories.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
      <button type="submit">Search</button>
    </form>
    <div className={styles.resultMeta} aria-live="polite"><strong>{result.total.toLocaleString('en-GB')}</strong> documented {result.total===1?'match':'matches'}{pages>1&&<span> · page {Math.min(page,pages)} of {pages}</span>}</div>
    {result.matches.length?<section aria-label="Match results">{result.matches.map(match=><Link className={styles.match} href={`/en/matches/${match.match_id}`} key={match.match_id}><div><small>{match.tour?.toUpperCase()} · {match.year} · {match.round}</small><strong>{match.tournament}</strong></div><div className={styles.players}><span data-winner={match.winner===1?'':undefined}>{match.player1.name}</span><span data-winner={match.winner===2?'':undefined}>{match.player2.name}</span></div><b>{match.final_score}</b></Link>)}</section>:<p className={styles.empty}>No documented matches match these filters.</p>}
    {pages>1&&<nav className={styles.pagination} aria-label="Match result pages">{page>1?<Link rel="prev" href={browseHref(query,{page:String(page-1)})}>← Previous</Link>:<span/>}<strong>Page {Math.min(page,pages)} of {pages}</strong>{page<pages?<Link rel="next" href={browseHref(query,{page:String(page+1)})}>Next →</Link>:<span/>}</nav>}
  </main>;
}
