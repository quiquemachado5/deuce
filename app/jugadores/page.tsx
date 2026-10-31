import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import { ArrowRight, ArrowUpRight, Trophy } from 'lucide-react';
import { comparisonHref, playerSlug, rivalryDirectory } from '@/lib/explore';
import { preparedGeneration } from '@/lib/revista/read-records';
import { number, description } from '@/lib/cuaderno/model';
import { Pagination } from '@/components/nocturno/Row';
import { normalizeText } from '@/lib/quality';
import { playerDirectoryPhoto, playerPhoto } from '@/lib/player-imagery';
import PairPicker from '@/components/analytics/PairPicker';
import TournamentFilters from '@/components/TournamentFilters';
import styles from './players.module.css';

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const tour=(await searchParams).tour==='wta'?'wta':'atp';
  const title=`Jugadoras y jugadores ${tour.toUpperCase()} — DEUCE`;
  const canonical=tour==='wta'?'/jugadores?tour=wta':'/jugadores';
  return {title,description,alternates:{canonical},openGraph:{title,description,url:canonical}};
}

function Initials({ name }: { name: string }) {
  return <span className={styles.initials} aria-hidden="true">{name.split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span>;
}

export default async function Players({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string; tipo?: string; tour?: string; orden?: string }>;
}) {
  const query = await searchParams;
  query.tour = query.tour === 'wta' ? 'wta' : 'atp';
  const pairs = query.tipo === 'enfrentamientos' || query.tipo === 'parejas';
  if (pairs) redirect('/comparar');
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
    photo: playerDirectoryPhoto(record.name),
    href: `/jugadores/${playerSlug(record.name)}${query.tour === 'wta' ? '?tour=wta' : ''}`,
    winRate: record.played ? 100 * record.wins / record.played : 0,
  }));
  const visibleDuels = duels.slice(pageStart, pageStart + 25);
  const url = (params: Record<string, string>) => {
    const next = new URLSearchParams();
    Object.entries({ ...query, ...params }).forEach(([key, value]) => {
      if (value && value !== 'all' && !(key === 'page' && value === '1')) next.set(key, value);
    });
    const search = next.toString();
    return `/jugadores${search ? `?${search}` : ''}`;
  };

  return <div className={`view-root player-directory ${styles.page}`}>
    <header className={`inner-title ${styles.intro}`}>
      <h1>{query.tour === 'wta' ? 'Jugadoras' : 'Jugadores'}</h1>
      <div className="inner-title-tools"><TournamentFilters ariaLabel="Circuitos de jugadores" items={[
        {href:url({tour:'atp',page:'1'}),label:'ATP',active:query.tour==='atp'},
        {href:url({tour:'wta',page:'1'}),label:'WTA',active:query.tour==='wta'},
      ]}/></div>
    </header>

    <div className={styles.content}>
      <form className={styles.directoryTools} action="/jugadores" method="get" role="search">
        <label>
          <span>Buscar en el directorio</span>
          <input name="q" type="search" defaultValue={query.q || ''} placeholder={query.tour === 'wta' ? 'Nombre de jugadora' : 'Nombre de jugador'} />
        </label>
        <label>
          <span>Ordenar</span>
          <select name="orden" defaultValue={order}>
            <option value="relevance">Trayectoria</option>
            <option value="wins">Victorias</option>
            <option value="name">Nombre</option>
          </select>
        </label>
        {query.tour === 'wta' && <input type="hidden" name="tour" value="wta" />}
        <button type="submit">Aplicar</button>
        {(query.q || order !== 'relevance') && <Link className={styles.directoryClear} href={query.tour === 'wta' ? '/jugadores?tour=wta' : '/jugadores'}>Limpiar</Link>}
      </form>
      <p className={styles.directoryStatus} aria-live="polite">{number(total)} {query.tour === 'wta' ? (total === 1 ? 'jugadora' : 'jugadoras') : (total === 1 ? 'jugador' : 'jugadores')} · página {number(page)} de {number(Math.max(1, Math.ceil(total / 25)))}</p>
      {!pairs && term && <p className="sr-only" aria-live="polite">{number(total)} {total === 1 ? 'jugador encontrado' : 'jugadores encontrados'}.</p>}

      {!pairs && visiblePlayers.length > 0 && <section className={styles.playerGrid} aria-label={term ? 'Resultados de jugadores' : 'Directorio de jugadores'}>
        {visiblePlayers.map((player, index) => <Link className={`${styles.playerCard} ${styles.cardSwapPrototype}`} href={player.href} prefetch={false} key={player.record.name}>
          <div className={styles.photo} style={player.photo ? {
            '--photo-position': player.photo.objectPosition || 'center top',
            '--photo-mobile-position': player.photo.mobileObjectPosition || player.photo.objectPosition || 'center top',
          } as CSSProperties : undefined}>
            {player.photo
              ? <Image src={player.photo.src} alt={player.photo.alt} fill priority={index < 3} sizes="(max-width: 360px) 140px, (max-width: 640px) 150px, (max-width: 1020px) 50vw, 390px"/>
              : <Initials name={player.record.name}/>}
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
                const photo = playerPhoto(name);
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
        ? <div className={styles.empty}><h2>El archivo WTA todavía no tiene temporadas publicadas</h2><p>Esta sección se activará cuando haya partidos WTA validados en la copia disponible.</p><Link href="/cobertura">Consultar cobertura</Link><Link className={styles.secondaryEmptyLink} href="/jugadores">Ver jugadores ATP</Link></div>
        : !total && <div className={styles.empty}><h2>No hay resultados</h2><p>No encontramos {pairs ? 'enfrentamientos' : query.tour === 'wta' ? 'jugadoras' : 'jugadores'} con esta búsqueda.</p><Link href={pairs ? '/jugadores?tipo=enfrentamientos' : query.tour === 'wta' ? '/jugadores?tour=wta' : '/jugadores'}>Quitar filtros</Link></div>}
    </div>
    <Pagination page={page} total={total} href={next => url({ page: String(next) })}/>
  </div>;
}
