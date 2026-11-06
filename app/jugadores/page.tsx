import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Search, Trophy } from 'lucide-react';
import { comparisonHref, playerSlug, rivalryDirectory } from '@/lib/explore';
import { preparedGeneration } from '@/lib/revista/read-records';
import { number } from '@/lib/cuaderno/model';
import { Pagination } from '@/components/nocturno/Row';
import { normalizeText } from '@/lib/quality';
import { playerDirectoryPhoto, playerPhoto } from '@/lib/player-imagery';
import PairPicker from '@/components/analytics/PairPicker';
import { robotsForUnavailableTour } from '@/lib/seo-metadata';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import EditorialPhoto from '@/components/EditorialPhoto';
import styles from './players.module.css';

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const [query,generation]=await Promise.all([searchParams,preparedGeneration()]);
  const tour=query.tour==='wta'?'wta':'atp';
  const title=`${tour==='wta'?'Jugadoras':'Jugadores'} ${tour.toUpperCase()} — DEUCE`;
  const description=tour==='wta'&&generation.manifest.summary.tours.wta===0
    ? 'El directorio WTA de DEUCE está en preparación. Consulta mientras tanto los jugadores y partidos ATP publicados.'
    : `${tour==='wta'?'Jugadoras':'Jugadores'} ${tour.toUpperCase()} del archivo DEUCE, con temporadas, resultados y rendimiento documentados.`;
  const canonical=tour==='wta'?'/jugadores?tour=wta':'/jugadores';
  return {title,description,alternates:{canonical},openGraph:{title,description,url:canonical},robots:robotsForUnavailableTour(generation.manifest.summary,tour)};
}

function Initials({ name }: { name: string }) {
  return <span className={styles.initials} aria-hidden="true">{name.split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span>;
}

export default async function Players({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string; tipo?: string; tour?: string; orden?: string }>;
}) {
  const query = { ...await searchParams };
  query.tour = query.tour === 'wta' ? 'wta' : 'atp';
  const pairs = query.tipo === 'enfrentamientos' || query.tipo === 'parejas';
  if (pairs) redirect(query.tour === 'wta' ? '/comparar?tour=wta' : '/comparar');
  const generation = await preparedGeneration();
  const [recordSource, pairSource] = await Promise.all([
    pairs ? Promise.resolve([]) : generation.records(),
    pairs ? generation.matches() : Promise.resolve([]),
  ]);
  const term = normalizeText((query.q || '').trim());
  const order = ['name', 'wins'].includes(query.orden || '') ? query.orden : 'relevance';
  const players = recordSource
    .filter(record => normalizeText(record.name).includes(term) && (record.tour || 'atp') === query.tour)
    .sort((a, b) => {
      if (order === 'name') return a.name.localeCompare(b.name, 'es');
      if (order === 'wins') return b.wins - a.wins || a.name.localeCompare(b.name, 'es');
      const primary = b.grandSlamFinalsWon - a.grandSlamFinalsWon;
      return primary || b.wins - a.wins || a.name.localeCompare(b.name, 'es');
    });
  const duels = pairs ? rivalryDirectory(pairSource).filter(pair => normalizeText(pair.names.join(' ')).includes(term)) : [];
  const total = pairs ? duels.length : players.length;
  const page = Math.max(1, Math.min(Math.ceil(total / 25) || 1, Number(query.page) || 1));
  const pageStart = (page - 1) * 25;
  const visiblePlayers = players.slice(pageStart, pageStart + 25).map(record => ({
    record,
    photo: playerDirectoryPhoto(record.name,query.tour==='wta'?'wta':'atp'),
    href: `/jugadores/${playerSlug(record.name)}${query.tour === 'wta' ? '?tour=wta' : ''}`,
    winRate: record.played ? 100 * record.wins / record.played : 0,
  }));
  const visibleDuels = duels.slice(pageStart, pageStart + 25);
  const url = (params: Record<string, string>) => {
    const next = new URLSearchParams();
    Object.entries({ ...query, ...params }).forEach(([key, value]) => {
      if (value && value !== 'all' && !(key === 'page' && value === '1') && !(key === 'tour' && value === 'atp')) next.set(key, value);
    });
    const search = next.toString();
    return `/jugadores${search ? `?${search}` : ''}`;
  };

  return <div className={`view-root player-directory ${styles.page}`}>
    <header className={`inner-title ${styles.intro}`}>
      <h1>{query.tour === 'wta' ? 'Jugadoras' : 'Jugadores'}</h1>
      <div className={styles.introTools}>
        <ArchiveFilterBar
          circuitLabel={query.tour==='wta'?'Circuito de jugadoras':'Circuito de jugadores'}
          panelTitle={query.tour==='wta'?'Filtrar jugadoras':'Filtrar jugadores'}
          activeCount={[query.q, order !== 'relevance' ? order : ''].filter(Boolean).length}
          circuits={[
            {href:url({tour:'atp',page:'1'}),label:'ATP',active:query.tour==='atp'},
            {href:url({tour:'wta',page:'1'}),label:'WTA',active:query.tour==='wta'},
          ]}
        >
            <form key={`${query.tour}|${query.q || ''}|${order}`} className={styles.filterPanel} action="/jugadores" method="get" role="search">
              <label className={styles.directorySearch}>
                <span>Buscar {query.tour === 'wta' ? 'jugadora' : 'jugador'}</span>
                <span className={styles.searchField}><Search size={18} aria-hidden="true"/><input name="q" type="search" defaultValue={query.q || ''} placeholder="Nombre" /></span>
              </label>
              <label className={styles.sortField}>
                <span>Ordenar</span>
                <select name="orden" defaultValue={order} aria-label="Ordenar directorio">
                  <option value="relevance">Trayectoria</option>
                  <option value="wins">Victorias</option>
                  <option value="name">Nombre</option>
                </select>
              </label>
              {query.tour === 'wta' && <input type="hidden" name="tour" value="wta" />}
              <div className={styles.filterActions}>
                <button type="submit"><Search size={15} aria-hidden="true"/>Buscar</button>
                {(query.q || order !== 'relevance') && <Link className={styles.directoryClear} href={query.tour === 'wta' ? '/jugadores?tour=wta' : '/jugadores'}>Limpiar</Link>}
              </div>
            </form>
        </ArchiveFilterBar>
      </div>
    </header>

    <div className={styles.content}>
      {!pairs && term && <p className="sr-only" aria-live="polite">{number(total)} {query.tour==='wta'?(total===1?'jugadora encontrada':'jugadoras encontradas'):(total === 1 ? 'jugador encontrado' : 'jugadores encontrados')}.</p>}

      {!pairs && visiblePlayers.length > 0 && <section className={styles.playerGrid} aria-label={term?(query.tour==='wta'?'Resultados de jugadoras':'Resultados de jugadores'):(query.tour==='wta'?'Directorio de jugadoras':'Directorio de jugadores')}>
        {visiblePlayers.map((player, index) => <Link className={`${styles.playerCard} ${styles.cardSwapPrototype}`} data-has-photo={player.photo?'true':'false'} href={player.href} prefetch={false} key={player.record.name}>
          <div className={styles.photo}>
            <EditorialPhoto
              src={player.photo?.src}
              alt={player.photo?.alt || player.record.name}
              label={player.record.name}
              priority={index < 3}
              sizes="(max-width: 360px) 140px, (max-width: 640px) 150px, (max-width: 1020px) 50vw, 390px"
              objectPosition={player.photo?.objectPosition || 'center top'}
              mobileObjectPosition={player.photo?.mobileObjectPosition || player.photo?.objectPosition || 'center top'}
            />
            <span className={styles.photoShade}/>
            {player.record.grandSlamFinalsWon > 0 && <span className={styles.photoSlamCount} aria-label={`${number(player.record.grandSlamFinalsWon)} Grand Slams`}><Trophy size={18} aria-hidden="true"/><b>{number(player.record.grandSlamFinalsWon)}</b></span>}
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle}>
              <h2>{player.record.name}</h2>
              <span className={styles.profileAction} aria-hidden="true"><ArrowRight size={20} strokeWidth={2.4}/></span>
            </div>
            <dl className={styles.stats}>
              <div><dt>Victorias</dt><dd>{number(player.record.wins)}</dd></div>
              <div><dt>Partidos</dt><dd>{number(player.record.played)}</dd></div>
              <div><dt>En este archivo</dt><dd>{number(player.winRate, 1)} %</dd></div>
            </dl>
          </div>
        </Link>)}
      </section>}

      {pairs && <>
        <div className={styles.pairHead}><div><h2>Enfrentamientos</h2><p>Cara a cara en partidos terminados del archivo.</p></div><span>{number(total)} cruces</span></div>
        <details className={styles.pairPicker}><summary>Elegir dos jugadores</summary><PairPicker/></details>
        {term && <Link className={styles.clearLink} href="/jugadores?tipo=enfrentamientos">Quitar búsqueda <ArrowUpRight size={15} aria-hidden="true"/></Link>}
        {visibleDuels.length > 0 && <section className={styles.duelGrid} aria-label="Enfrentamientos">
          {visibleDuels.map(pair => {
            const leaderIndex = pair.wins[0] === pair.wins[1] ? -1 : pair.wins[0] > pair.wins[1] ? 0 : 1;
            return <Link className={styles.duel} href={comparisonHref(pair.names[0],pair.names[1])} key={pair.slug}>
              <div className={styles.duelTop}><span>Cara a cara</span><small>{number(pair.matches.length)} partidos</small></div>
              {pair.names.map((name, playerIndex) => {
                const photo = playerPhoto(name,query.tour==='wta'?'wta':'atp');
                return <div className={styles.duelPlayer} data-leader={leaderIndex === playerIndex ? '' : undefined} key={name}>
                  <span className={styles.avatar}>{photo ? <Image src={photo.thumbnail || photo.src} alt="" fill sizes="48px" style={{ objectPosition: photo.mobileObjectPosition || photo.objectPosition || 'center top' }}/> : <Initials name={name}/>}</span>
                  <strong>{name}</strong><b>{number(pair.wins[playerIndex])}</b>
                </div>;
              })}
              <span className={styles.duelAction}>Ver cara a cara <ArrowUpRight size={15} aria-hidden="true"/></span>
            </Link>;
          })}
        </section>}
      </>}

      {!total && query.tour === 'wta' && !term
        ? <div className={styles.empty}><h2>No hay jugadoras en esta selección</h2><p>Prueba otra temporada o consulta el circuito ATP.</p><Link className={styles.secondaryEmptyLink} href="/jugadores">Ver jugadores ATP</Link></div>
        : !total && <div className={styles.empty}><h2>No hay resultados</h2><p>No encontramos {pairs ? 'enfrentamientos' : query.tour === 'wta' ? 'jugadoras' : 'jugadores'} con esta búsqueda.</p><Link href={pairs ? '/jugadores?tipo=enfrentamientos' : query.tour === 'wta' ? '/jugadores?tour=wta' : '/jugadores'}>Quitar filtros</Link></div>}
    </div>
    <Pagination page={page} total={total} href={next => url({ page: String(next) })} mobileJumps/>
  </div>;
}
