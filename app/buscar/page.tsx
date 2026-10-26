import Link from 'next/link';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { notebook } from '@/lib/cuaderno/data';
import { searchArchive, matchingMatches } from '@/lib/cuaderno/search';
import { normalizeText } from '@/lib/quality';
import { tournamentName } from '@/lib/labels';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { browserCategory, browserRound, browserRounds } from '@/lib/match-browser';
import { matchSearchUrl, type MatchQuery } from '@/lib/match-search-url';
import { chronological } from '@/lib/editorial';
import { number } from '@/lib/cuaderno/model';
import EditionMatchGroups, { type MatchEdition } from '@/components/EditionMatchGroups';
import MatchSearchBar from '@/components/MatchSearchBar';
import PlayerAvatar from '@/components/PlayerAvatar';
import { MatchArchivePage } from '@/components/deuce/MatchArchivePage';
import { toMatchRecord } from '@/data/map-match';
import { matchSearchIntent } from '@/lib/search-intent';
import EmptyState from '@/components/EmptyState';
import styles from './search.module.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<MatchQuery> }) {
  const query = await searchParams;
  return {
    title: `${query.q ? `${query.q} · Partidos` : 'Partidos'} — DEUCE`,
    description: 'Busca jugadores y torneos. Recorre los partidos de tenis por temporada, superficie y ronda desde 1968.',
    alternates: { canonical: matchSearchUrl(query, { limit: undefined }) },
    robots: Object.values(query).some(Boolean) ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<MatchQuery> }) {
  const [raw, data] = await Promise.all([searchParams, notebook()]);
  const query: MatchQuery = Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === 'string' && value !== 'all'));
  query.q = (query.q || query.player || '').trim().slice(0, 180);
  if (query.round) query.round = ({ Octavos: 'Octavos de final', Cuartos: 'Cuartos de final', Semifinal: 'Semifinales', RR: 'Fase de grupos', BR: 'Partido por el bronce', ER: 'Rondas iniciales' } as Record<string, string>)[query.round] || query.round;
  if (query.category && /precursor|histórico|otro torneo/i.test(query.category)) query.category = 'Otros torneos';
  const years = [...new Set(data.matches.map(match => match.year))].sort((a, b) => b - a);
  if (query.year && !years.includes(Number(query.year))) delete query.year;
  const selectedYear = query.year ? Number(query.year) : query.q ? null : years[0];
  const directory = tournamentDirectory(data.matches);
  const tournament = directory.find(entry => entry.slug === query.tournament);
  const slugs = new Map(directory.map(entry => [entry.name, entry.slug]));
  const categories = [...new Set(data.matches.map(browserCategory).filter((category): category is string => Boolean(category)))].sort((a, b) => {
    const priority = ['Grand Slam', 'Masters 1000', 'ATP 500', 'ATP 250', 'ATP Finals', 'Challenger', 'Copa Davis', 'Juegos Olímpicos', 'United Cup', 'Laver Cup', 'Next Gen Finals', 'Otros torneos'];
    return (priority.indexOf(a) < 0 ? 99 : priority.indexOf(a)) - (priority.indexOf(b) < 0 ? 99 : priority.indexOf(b)) || a.localeCompare(b, 'es');
  });
  const filtered = matchingMatches(query.q || '', data.matches).filter(match =>
    (!selectedYear || match.year === selectedYear) &&
    (!query.age || (normalizeText(match.player1.name) === normalizeText(query.q || '') ? Math.floor(match.context?.age1 ?? -1) : normalizeText(match.player2.name) === normalizeText(query.q || '') ? Math.floor(match.context?.age2 ?? -1) : -1) === Number(query.age)) &&
    (!query.fromYear || match.year >= Number(query.fromYear)) && (!query.toYear || match.year <= Number(query.toYear)) &&
    (!query.surface || match.surface === query.surface) &&
    (!query.tournament || tournament?.name === match.tournament) &&
    (!query.category || (browserCategory(match) || 'Otros torneos') === query.category) &&
    (!query.round || normalizeText(browserRound(match)) === normalizeText(query.round)) &&
    (query.fiveSets !== 'true' || match.score_summary.games.length === 5)
  ).sort((a, b) => chronological(b, a));
  const editions = new Map<string, MatchEdition>();
  for (const match of filtered) {
    const key = `${match.year}|${match.tournament}`;
    const edition = editions.get(key) || { key, href: `/${slugs.get(match.tournament)}/${match.year}`, matches: [] };
    edition.matches.push(match);
    editions.set(key, edition);
  }
  const groups = [...editions.values()];
  const requestedLimit = Number(query.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.max(12, Math.floor(requestedLimit)) : 12;
  const suggestions = query.q ? await searchArchive(query.q, { includeMatches: false, data }) : [];
  const players = suggestions.filter(item => item.group === 'Jugadores');
  const related = suggestions.filter(item => ['Torneos', 'Récords', 'Parejas'].includes(item.group));
  const chips = [
    query.age ? {key:'age',label:`${query.age} años al jugar`} : null,
    query.fromYear ? {key:'fromYear',label:`Desde ${query.fromYear}`} : null,
    query.toYear ? {key:'toYear',label:`Hasta ${query.toYear}`} : null,
    query.tournament ? { key: 'tournament', label: tournament ? tournamentName(tournament.name) : query.tournament } : null,
    query.fiveSets === 'true' ? { key: 'fiveSets', label: 'Cinco sets' } : null,
  ].filter((chip): chip is { key: string; label: string } => Boolean(chip));
  return <div className={`deuce-search view-root ${styles.searchPage}`}>
    <header className="inner-title"><h1>Partidos</h1></header>
    <MatchSearchBar query={query} chips={chips} categories={categories} rounds={[...new Set([...browserRounds, ...data.matches.map(browserRound)])].filter(Boolean)} years={years} activeYear={selectedYear} />
    {!!query.q && matchSearchIntent(query.q).labels.length > 0 && <p className="archive-freshness">Interpretamos: {matchSearchIntent(query.q).labels.join(' · ')}</p>}
    {players.length !== 1 && <p className={styles.resultCount} role="status">{number(filtered.length)} partidos · {number(groups.length)} campeonatos{selectedYear ? ` · ${selectedYear}` : ''}</p>}

    {players.length > 0 && <section className={styles.playerResults} aria-label="Jugadores encontrados">{players.map(player => <Link className={styles.playerResult} href={player.href} key={player.href}>
      <PlayerAvatar name={player.name} size={60} /><span><strong>{player.name}</strong><small>{players.length === 1 ? `${number(filtered.length)} partidos` : 'Ver ficha del jugador'}</small></span><ArrowUpRight size={18} aria-hidden="true" />
    </Link>)}</section>}
    {related.length > 0 && <nav className={styles.relatedResults} aria-label="También en el archivo">{related.map(item => <Link href={item.href} key={item.href}>{item.name}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>}

    <section className={styles.season} aria-labelledby="match-season-title">
      <h2 className="nc-sr" id="match-season-title">{selectedYear ? `Partidos de ${selectedYear}` : 'Partidos por torneo'}</h2>
      {query.vista === 'torneos' ? <EditionMatchGroups editions={groups.slice(0, limit)} showYears={!selectedYear} /> : <MatchArchivePage matches={filtered.slice(0,limit).map(toMatchRecord)}/>}
      {!filtered.length && <EmptyState title="No encontramos partidos" description="Prueba otro nombre o quita alguno de los filtros de la búsqueda." resetHref={matchSearchUrl({}, { q: query.q })} />}
      {!filtered.length && <nav className="archive-suggestions" aria-label="Alternativas de búsqueda">{chips.map(chip => <Link key={chip.key} href={matchSearchUrl(query,{[chip.key]:undefined})}>Quitar {chip.label}</Link>)}<Link href="/buscar">Empezar de nuevo</Link><Link href="/buscar?q=Nadal+Federer+Wimbledon+2008">Nadal · Federer · Wimbledon 2008</Link></nav>}
      {(query.vista === 'torneos' ? groups.length : filtered.length) > limit && <div className={styles.loadMore}><Link href={matchSearchUrl(query, { limit: String(limit + 12) })} scroll={false}>Cargar más<ChevronDown size={16} aria-hidden="true" /></Link></div>}
    </section>
  </div>;
}
