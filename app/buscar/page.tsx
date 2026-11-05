import Link from 'next/link';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { normalizeText } from '@/lib/quality';
import { tournamentName } from '@/lib/labels';
import { browserRounds } from '@/lib/match-browser';
import { matchSearchUrl, type MatchQuery } from '@/lib/match-search-url';
import { number } from '@/lib/cuaderno/model';
import EditionMatchGroups, { type MatchEdition } from '@/components/EditionMatchGroups';
import MatchSearchBar from '@/components/MatchSearchBar';
import PlayerAvatar from '@/components/PlayerAvatar';
import { MatchArchivePage } from '@/components/deuce/MatchArchivePage';
import { toMatchRecord } from '@/data/map-match';
import { matchSearchIntent } from '@/lib/search-intent';
import EmptyState from '@/components/EmptyState';
import { preparedManifest, preparedMatchBrowser } from '@/lib/revista/read-records';
import { queryMatchBrowser, type MatchBrowserCircuit, type MatchBrowserEvent } from '@/lib/match-browser-snapshot';
import { approximateName, canonicalSearchText } from '@/lib/search-text';
import { playerSlug } from '@/lib/explore';
import { noIndexFollow, robotsForUnavailableTour } from '@/lib/seo-metadata';
import { PUBLICATION_CATEGORIES } from '@/lib/publication-scope';
import styles from './search.module.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<MatchQuery> }) {
  const [raw,manifest] = await Promise.all([searchParams,preparedManifest()]);
  const tour=raw.tour==='wta'?'wta':raw.tour==='all'?'all':'atp';
  const filtered=Object.entries(raw).some(([key,value])=>key!=='tour'&&Boolean(value));
  const title=`${raw.q ? `${raw.q} · ` : ''}Partidos ${tour==='all'?'ATP y WTA':tour.toUpperCase()} — DEUCE`;
  const canonical=tour==='wta'?'/buscar?tour=wta':tour==='all'?'/buscar?tour=all':'/buscar';
  const unavailableTour=tour==='all'?undefined:robotsForUnavailableTour(manifest.summary,tour);
  return {
    title,
    description: tour === 'all'
      ? 'Busca jugadores, jugadoras, torneos y resultados publicados de ATP y WTA.'
      : tour === 'wta'
      ? 'Busca jugadoras, torneos y resultados WTA por temporada, superficie y ronda.'
      : 'Busca jugadores y torneos ATP. Recorre el archivo por temporada, superficie y ronda.',
    alternates: { canonical },
    openGraph:{title,url:canonical},
    robots: filtered ? noIndexFollow : unavailableTour,
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<MatchQuery> }) {
  const raw = await searchParams;
  const query: MatchQuery = Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === 'string' && value !== 'all'));
  if (raw.year === 'all') query.year = 'all';
  if (raw.tour === 'all') query.tour = 'all';
  const surfaceAliases: Record<string, string> = { tierra: 'clay', hierba: 'grass', dura: 'hard', moqueta: 'carpet' };
  const rawSurface = typeof raw.surface === 'string' ? raw.surface.trim() : '';
  const normalizedSurface = rawSurface ? surfaceAliases[normalizeText(rawSurface)] || rawSurface.toLowerCase() : '';
  const allowedSurfaces = new Set(['clay', 'grass', 'hard', 'carpet', 'unknown']);
  const invalidSurface = normalizedSurface && !allowedSurfaces.has(normalizedSurface) ? rawSurface : '';
  const translatedSurface = rawSurface && normalizedSurface !== rawSurface.toLowerCase() && !invalidSurface ? rawSurface : '';
  if (invalidSurface) delete query.surface;
  else if (normalizedSurface) query.surface = normalizedSurface;
  query.q = (query.q || query.player || '').trim().slice(0, 180);
  if (query.round) query.round = ({ Octavos: 'Octavos de final', Cuartos: 'Cuartos de final', Semifinal: 'Semifinales', RR: 'Fase de grupos', BR: 'Partido por el bronce', ER: 'Rondas iniciales' } as Record<string, string>)[query.round] || query.round;
  const tour: 'atp' | 'wta' | 'all' = query.tour === 'wta' ? 'wta' : query.tour === 'all' ? 'all' : 'atp';
  query.tour = tour;
  const browser = await preparedMatchBrowser(tour);
  const selectedCircuits = (tour === 'all' ? ['atp', 'wta'] : [tour]) as Array<'atp' | 'wta'>;
  const circuitData = selectedCircuits.map(circuit => ({ circuit, ...browser.index.circuits[circuit] }));
  const years = [...new Set(circuitData.flatMap(circuit => circuit.years))].sort((a, b) => b - a);
  const surfaces = [...new Set(circuitData.flatMap(circuit => circuit.surfaces))].filter(surface => allowedSurfaces.has(surface));
  const availableRoundSet = new Set(circuitData.flatMap(circuit => circuit.rounds));
  const rounds=[...browserRounds.filter(round=>availableRoundSet.has(round)),...availableRoundSet].filter((round,index,all)=>all.indexOf(round)===index);
  const events = new Map<string, MatchBrowserEvent & { circuit: 'atp' | 'wta' }>();
  for (const { circuit, events: circuitEvents } of circuitData) for (const event of circuitEvents) {
    const key = `${circuit}:${event.slug}`;
    events.set(key, { ...event, circuit });
  }
  const tournament = [...events.values()].find(entry => entry.slug === query.tournament);
  const slugs = new Map([...events.values()].map(entry => [`${entry.circuit}:${entry.name}`, entry.slug]));
  const rejectedCapabilities:string[]=[];
  const capability = (key: keyof MatchBrowserCircuit['capabilities']) => circuitData.some(circuit => circuit.capabilities[key]);
  if(query.data==='measures'&&!capability('statistics')){delete query.data;rejectedCapabilities.push('estadísticas de partido');}
  if(query.data==='points'&&!capability('points')){delete query.data;rejectedCapabilities.push('punto a punto');}
  if(query.fiveSets==='true'&&!capability('fiveSets')){delete query.fiveSets;rejectedCapabilities.push('partidos a cinco sets');}
  if(query.surface&&!surfaces.includes(query.surface as typeof surfaces[number])){rejectedCapabilities.push(`partidos en ${rawSurface||query.surface}`);delete query.surface;}
  if(query.round&&!rounds.some(round=>normalizeText(round)===normalizeText(query.round!))){rejectedCapabilities.push(`la ronda ${query.round}`);delete query.round;}
  if (query.year && query.year !== 'all' && !years.includes(Number(query.year))) delete query.year;
  const publishedCategories = new Set(selectedCircuits.flatMap(circuit => [...PUBLICATION_CATEGORIES[circuit]]));
  const categories = [...new Set(circuitData.flatMap(circuit => circuit.categories))].filter(category => publishedCategories.has(category)).sort((a, b) => {
    const priority = ['Grand Slam', 'Masters 1000', 'WTA 1000', 'ATP 500', 'WTA 500', 'ATP 250', 'WTA 250'];
    return (priority.indexOf(a) < 0 ? 99 : priority.indexOf(a)) - (priority.indexOf(b) < 0 ? 99 : priority.indexOf(b)) || a.localeCompare(b, 'es');
  });
  if (query.category && !categories.includes(query.category)) delete query.category;
  if (query.tournament && !tournament) delete query.tournament;
  const selectedYear = query.year && query.year !== 'all' ? Number(query.year) : null;
  const requestedLimit = Number(query.limit);
  const dailyLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.max(2, Math.floor(requestedLimit)) : 2;
  const seasonLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.max(3, Math.floor(requestedLimit)) : 3;
  const result = queryMatchBrowser(browser.partitions, {
    q: query.q,
    year: selectedYear,
    fromYear: query.fromYear ? Number(query.fromYear) : undefined,
    toYear: query.toYear ? Number(query.toYear) : undefined,
    surface: query.surface,
    tournament: tournament?.name,
    category: query.category,
    round: query.round,
    age: query.age ? Number(query.age) : undefined,
    fiveSets: query.fiveSets === 'true',
    data: query.data === 'measures' || query.data === 'points' ? query.data : undefined,
  }, dailyLimit, seasonLimit);
  const groups: MatchEdition[] = result.editions.map(edition => {
    const matchTour = edition.matches[0]?.tour || 'atp';
    const year = edition.matches[0]?.year;
    return { key: `${matchTour}|${edition.key}`, href: `/torneos/${slugs.get(`${matchTour}:${edition.hrefName}`)}/${year}${matchTour === 'wta' ? '?cuadro=wta' : ''}`, matches: edition.matches, totalMatches: edition.totalMatches };
  });
  const matchDates = result.matchDates, editionYears = result.editionYears, visibleDailyMatches = result.dailyMatches;
  const searchTerms = canonicalSearchText(query.q || '').split(/\s+/).filter(Boolean);
  const includesSearch = (value: string) => searchTerms.every(term => canonicalSearchText(value).includes(term));
  const playerCandidates = circuitData.flatMap(({ circuit, players }) => players.map(player => ({ ...player, circuit })));
  const exactPlayers = query.q ? playerCandidates.filter(player => includesSearch(player.name)) : [];
  const matchedPlayers = exactPlayers.length ? exactPlayers : query.q ? playerCandidates.filter(player => approximateName(query.q!, player.name)) : [];
  const players = matchedPlayers.slice(0, 4).map(player => ({
    href: `/jugadores/${playerSlug(player.name)}${player.circuit === 'wta' ? '?tour=wta' : ''}`,
    name: player.name,
    group: 'Jugadores',
  }));
  const recordPieces = tour === 'wta'
    ? (browser.manifest.circuitPieces?.wta || []).map(piece => ({ piece, circuit: 'wta' as const }))
    : tour === 'all'
      ? [...browser.manifest.pieces.map(piece => ({ piece, circuit: 'atp' as const })), ...(browser.manifest.circuitPieces?.wta || []).map(piece => ({ piece, circuit: 'wta' as const }))]
      : browser.manifest.pieces.map(piece => ({ piece, circuit: 'atp' as const }));
  const related = query.q ? [
    ...recordPieces.filter(({ piece }) => includesSearch(`${piece.title} ${piece.id}`)).slice(0, 4).map(({ piece, circuit }) => ({ href: `/records?dato=${piece.id}${circuit === 'wta' ? '&tour=wta' : ''}`, name: piece.title })),
    ...[...events.values()].filter(event => includesSearch(`${event.name} ${tournamentName(event.name)}`)).slice(0, 3).map(event => ({ href: `/torneos/${event.slug}${event.circuit === 'wta' ? '?cuadro=wta' : ''}`, name: tournamentName(event.name) })),
  ] : [];
  const chips = [
    selectedYear ? { key: 'year', label: `Temporada ${selectedYear}`, clearValue: query.year ? undefined : 'all' } : null,
    query.surface ? { key: 'surface', label: ({ clay: 'Tierra', grass: 'Hierba', hard: 'Dura', carpet: 'Moqueta' } as Record<string,string>)[query.surface] || query.surface } : null,
    query.category ? { key: 'category', label: query.category } : null,
    query.round ? { key: 'round', label: query.round } : null,
    query.age ? {key:'age',label:`${query.age} años al jugar`} : null,
    query.fromYear ? {key:'fromYear',label:`Desde ${query.fromYear}`} : null,
    query.toYear ? {key:'toYear',label:`Hasta ${query.toYear}`} : null,
    query.tournament ? { key: 'tournament', label: tournament ? tournamentName(tournament.name) : query.tournament } : null,
    query.fiveSets === 'true' ? { key: 'fiveSets', label: 'Cinco sets' } : null,
    query.data === 'measures' ? { key: 'data', label: 'Con medidas' } : query.data === 'points' ? { key: 'data', label: 'Con puntos' } : null,
  ].filter((chip): chip is { key: string; label: string; clearValue?: string } => Boolean(chip));
  const circuitHref=(nextTour:'atp'|'wta')=>matchSearchUrl(query,{
    tour:nextTour,
    year:undefined,
    category:undefined,
    tournament:undefined,
    surface:undefined,
    round:undefined,
    age:undefined,
    fromYear:undefined,
    toYear:undefined,
    fiveSets:undefined,
    data:undefined,
    limit:undefined,
  });
  const searchTools=<MatchSearchBar circuits={[
    {href:circuitHref('atp'),label:'ATP',active:tour==='atp'},
    {href:circuitHref('wta'),label:'WTA',active:tour==='wta'},
  ]} query={query} categories={categories} rounds={rounds} surfaces={surfaces} years={years} activeYear={selectedYear} />;
  return <div className={`deuce-search view-root ${styles.searchPage}`}>
    <header className={`inner-title ${styles.searchIntro}`}><h1>Partidos</h1><div className="inner-title-tools">{searchTools}</div></header>
    {!!query.q && <form className={styles.visibleQuery} action="/buscar" method="get" role="search">
      <label htmlFor="visible-match-query">Búsqueda actual</label>
      <div><input id="visible-match-query" name="q" type="search" defaultValue={query.q} /><button type="submit">Buscar</button><Link href={matchSearchUrl(query, { q: undefined, limit: undefined })}>Borrar búsqueda</Link></div>
      {Object.entries(query).filter(([key, value]) => key !== 'q' && key !== 'limit' && !(key === 'tour' && value === 'atp') && Boolean(value)).map(([key, value]) => <input type="hidden" name={key} value={value} key={key} />)}
    </form>}
    {chips.length > 0 && <nav className={styles.activeChips} aria-label="Filtros activos">{chips.map(chip => <Link key={chip.key} href={matchSearchUrl(query, { [chip.key]: chip.clearValue, limit: undefined })} aria-label={`Quitar filtro ${chip.label}`}>{chip.label}<span aria-hidden="true">×</span></Link>)}</nav>}
    {tour==='all'&&<p className={styles.queryNotice} role="status">Resultados publicados de ATP y WTA. Elige un circuito para continuar solo en su archivo.</p>}
    {invalidSurface && <p className={styles.queryNotice} role="status">«{invalidSurface}» no es una superficie válida. Mostramos el archivo sin ese filtro.</p>}
    {translatedSurface && <p className={styles.queryNotice} role="status">El filtro «{translatedSurface}» se ha aplicado correctamente.</p>}
    {rejectedCapabilities.length>0&&<p className={styles.queryNotice} role="status">Se ha aplicado la combinación de filtros compatible más cercana.</p>}
    {!!query.q && matchSearchIntent(query.q).labels.length > 0 && <p className="archive-freshness">Interpretamos: {matchSearchIntent(query.q).labels.join(' · ')}</p>}
    {query.scope !== 'matches' && players.length > 0 && <section className={styles.playerResults} aria-label={tour==='wta'?'Jugadoras encontradas':tour==='all'?'Tenistas encontrados':'Jugadores encontrados'}>{players.map(player => <Link className={styles.playerResult} href={player.href} key={player.href}>
      <PlayerAvatar tour={player.href.includes('tour=wta')?'wta':'atp'} name={player.name} size={60} /><span><strong>{player.name}</strong><small>{players.length === 1 ? `${number(result.total)} partidos` : tour==='wta'?'Ver ficha de la jugadora':tour==='all'?'Ver ficha':'Ver ficha del jugador'}</small></span><ArrowUpRight size={18} aria-hidden="true" />
    </Link>)}</section>}
    {related.length > 0 && <nav className={styles.relatedResults} aria-label="También en el archivo">{related.map(item => <Link href={item.href} key={item.href}>{item.name}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>}

    <section className={styles.season} aria-labelledby="match-season-title">
      <h2 className="nc-sr" id="match-season-title">{selectedYear ? `Partidos de ${selectedYear}` : 'Partidos por torneo'}</h2>
      {query.vista === 'torneos' ? <EditionMatchGroups editions={groups} query={query} showYears /> : <MatchArchivePage matches={visibleDailyMatches.map(toMatchRecord)}/>}
      {!result.total && <EmptyState
        title="No encontramos partidos"
        description={tour === 'wta' && !years.length ? 'No mostramos resultados ATP como si fueran WTA. Puedes consultar la cobertura o continuar en el archivo ATP.' : 'Prueba otro nombre o quita alguno de los filtros de la búsqueda.'}
        resetHref={tour === 'wta' && !years.length ? '/buscar' : matchSearchUrl({}, { q: query.q,tour })}
      />}
      {!result.total && <nav className="archive-suggestions" aria-label="Alternativas de búsqueda">{chips.map(chip => <Link key={chip.key} href={matchSearchUrl(query,{[chip.key]:chip.clearValue})}>Quitar {chip.label}</Link>)}{tour === 'wta' && !years.length ? <><Link href="/buscar">Cambiar a ATP</Link><Link href="/cobertura">Consultar cobertura</Link></> : <><Link href={matchSearchUrl({}, {tour})}>Empezar de nuevo</Link><Link href={tour === 'wta' ? '/buscar?q=Swiatek+Sabalenka&tour=wta' : '/buscar?q=Nadal+Federer+Wimbledon+2008'}>{tour === 'wta' ? 'Swiatek · Sabalenka' : 'Nadal · Federer · Wimbledon 2008'}</Link></>}</nav>}
      {(query.vista === 'torneos' ? editionYears.length > seasonLimit : matchDates.length > dailyLimit) && <div className={styles.loadMore}><Link href={matchSearchUrl(query, { limit: String((query.vista === 'torneos' ? seasonLimit : dailyLimit) + (query.vista === 'torneos' ? 2 : 1)) })} scroll={false}>{query.vista === 'torneos' ? 'Cargar temporadas anteriores' : 'Cargar días anteriores'}<ChevronDown size={16} aria-hidden="true" /></Link></div>}
    </section>
  </div>;
}
