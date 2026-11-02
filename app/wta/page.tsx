import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowUpRight, Search} from 'lucide-react';
import {number} from '@/lib/cuaderno/model';
import {wtaSnapshot, type WtaSnapshotMatch} from '@/lib/wta-snapshot';
import styles from './wta.module.css';

const title = 'WTA — Jugadoras, torneos y partidos | DEUCE';
const description = 'Explora la instantánea WTA incorporada a DEUCE: jugadoras, equipos de dobles, torneos y partidos, con su cobertura y límites documentados.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {canonical: '/wta'},
  openGraph: {title, description, url: '/wta', type: 'website', images: ['/opengraph-image']},
  twitter: {card: 'summary_large_image', title, description, images: ['/opengraph-image']},
};

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const queryValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
const surface = (value: string | null) => ({hard: 'Dura', clay: 'Tierra', grass: 'Hierba', carpet: 'Moqueta'}[value || ''] || value || 'Sin superficie');
const category = (value: string | null, tier: string | null) => (tier || value || 'WTA').replaceAll('_', ' ').toUpperCase();
const country = (value: string | null) => value ? value.toUpperCase() : '—';
const date = (value: string) => new Date(value).toLocaleString('es-ES', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid'});

function MatchCard({match}: {match: WtaSnapshotMatch}) {
  const live = match.status === 'live';
  const games = match.score?.games?.map(value => value.at(-1) ?? 0);
  return <article className={styles.match} data-live={live || undefined}>
    <header><span>{live ? 'En directo al capturar' : date(match.scheduled_time)}</span><strong>{match.tournament}</strong></header>
    <div><p><b>{match.players.p1.name}</b>{match.players.p1.ranking && <small>#{match.players.p1.ranking}</small>}</p><p><b>{match.players.p2.name}</b>{match.players.p2.ranking && <small>#{match.players.p2.ranking}</small>}</p></div>
    {live && games && <strong className={styles.score}>{games.join('–')}{match.score?.points?.length ? <small>{match.score.points.join('–')}</small> : null}</strong>}
    <footer><span>{match.round_code || match.round || 'Ronda pendiente'}</span><span>{match.is_doubles ? 'Dobles' : 'Individual'}</span><span>{surface(match.surface)}</span></footer>
  </article>;
}

export default async function WtaPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const [data, params] = await Promise.all([wtaSnapshot(), searchParams]);
  const query = queryValue(params.q).trim().slice(0, 80);
  const needle = normalized(query);
  const players = data.players.filter(player => !needle || normalized(`${player.name} ${player.country || ''}`).includes(needle));
  const doubles = data.doubles.filter(team => !needle || normalized(`${team.name} ${team.country || ''}`).includes(needle));
  const tournaments = data.tournaments.filter(tournament => !needle || normalized(`${tournament.name} ${tournament.city || ''} ${tournament.country || ''} ${tournament.category || ''} ${tournament.tier || ''}`).includes(needle));
  const visiblePlayers = players.slice(0, 80);
  const visibleTournaments = tournaments.slice(0, 36);
  const captured = new Date(data.summary.generado).toLocaleString('es-ES', {dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid'});
  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}><span>DEUCE · Circuito femenino</span><h1>WTA, dentro del archivo.</h1><p>Una muestra consultable de jugadoras, dobles, torneos y partidos. Publicamos también sus límites para que un dato ausente nunca parezca un cero.</p><div><a className={styles.download} href="#directorio">Explorar muestra WTA</a><Link className={styles.secondary} href="/cobertura">Ver cobertura</Link></div></div>
      <aside className={styles.status}><span>Descarga BASIC en curso</span><strong>{captured}</strong><p>El histórico está habilitado. DEUCE lo recorre por temporadas y niveles con el mismo método rápido utilizado para el archivo ATP.</p></aside>
    </header>

    <dl className={styles.metrics}>
      <div><dt>Jugadoras</dt><dd>{number(data.summary.jugadoras_individuales)}</dd><small>perfiles individuales</small></div>
      <div><dt>Dobles</dt><dd>{number(data.summary.parejas_dobles)}</dd><small>equipos identificados</small></div>
      <div><dt>Torneos</dt><dd>{number(data.summary.torneos_unicos)}</dd><small>IDs únicos WTA y WTA 125</small></div>
      <div><dt>Partidos</dt><dd>{number(data.summary.partidos_recopilados)}</dd><small>históricos, resultados y agenda</small></div>
    </dl>

    <section className={styles.matches} aria-labelledby="wta-matches-title">
      <header><span>Captura del circuito</span><h2 id="wta-matches-title">Partidos encontrados.</h2><p>Ocho ejemplos de los 41 partidos capturados. Sus estados corresponden al momento de la descarga; no se presentan como marcadores actuales.</p></header>
      <div>{data.matches.slice(0, 8).map(match => <MatchCard key={match.id} match={match}/>)}</div>
    </section>

    <section className={styles.directory} id="directorio" aria-labelledby="wta-directory-title">
      <header><div><span>Directorio incorporado</span><h2 id="wta-directory-title">{number(data.players.length)} jugadoras de muestra.</h2></div><form action="/wta" role="search"><label htmlFor="wta-query">Buscar en la muestra publicada</label><div><Search size={18} aria-hidden="true"/><input id="wta-query" name="q" type="search" defaultValue={query} placeholder="Nombre, país o torneo"/><button type="submit">Buscar</button></div></form></header>
      <p className={styles.resultCount}>{query ? `${number(players.length)} jugadoras encontradas para “${query}”` : `Las ${number(data.summary.jugadoras_individuales)} jugadoras permanecen contabilizadas; se publican las 80 primeras por ranking.`}</p>
      <div className={styles.tableWrap} role="region" aria-label="Directorio de jugadoras WTA" tabIndex={0}><table><thead><tr><th>Ranking</th><th>Jugadora</th><th>País</th><th>Mano</th><th>Puntos</th></tr></thead><tbody>{visiblePlayers.map(player => <tr key={player.id}><td>{player.ranking ? `#${number(player.ranking)}` : '—'}</td><th scope="row">{player.name}</th><td>{country(player.country)}</td><td>{player.hand || '—'}</td><td>{player.ranking_points === null ? '—' : number(player.ranking_points)}</td></tr>)}</tbody></table>{!visiblePlayers.length && <p className={styles.empty}>No hay jugadoras que coincidan con esta búsqueda.</p>}</div>
    </section>

    <section className={styles.doubles} aria-labelledby="wta-doubles-title"><header><span>Equipos de dobles</span><h2 id="wta-doubles-title">{query ? `${number(doubles.length)} coincidencias.` : '24 parejas de muestra.'}</h2><p>La captura completa identificó {number(data.summary.parejas_dobles)} equipos. Aquí se presenta una selección alfabética.</p></header><ul>{doubles.map(team => <li key={team.id}>{team.name}</li>)}</ul>{!doubles.length && <p className={styles.empty}>No hay parejas que coincidan con esta búsqueda.</p>}</section>

    <section className={styles.tournaments} aria-labelledby="wta-tournaments-title">
      <header><span>WTA y WTA 125</span><h2 id="wta-tournaments-title">{query ? `${number(tournaments.length)} torneos encontrados.` : `${number(data.tournaments.length)} fichas de muestra.`}</h2><p>Los {number(data.summary.torneos_unicos)} identificadores descargados forman {number(data.aggregate.catalog_entries)} fichas consolidadas; aquí se publica una selección.</p></header>
      <div>{visibleTournaments.map(tournament => <article key={tournament.id}><span>{category(tournament.category, tournament.tier)}</span><h3>{tournament.name}</h3><dl><div><dt>Superficie</dt><dd>{surface(tournament.surface)}</dd></div><div><dt>Sede</dt><dd>{[tournament.city, country(tournament.country) === '—' ? null : country(tournament.country)].filter(Boolean).join(' · ') || 'Sin sede publicada'}</dd></div></dl></article>)}</div>
      {!visibleTournaments.length && <p className={styles.empty}>No hay torneos que coincidan con esta búsqueda.</p>}
    </section>

    <section className={styles.provenance} aria-labelledby="wta-source-title"><div><span>Alcance y procedencia</span><h2 id="wta-source-title">Datos útiles, límites visibles.</h2></div><div><p>{data.summary.alcance}</p><p>El plan BASIC permite consultar el histórico y la captura local ya conserva {number(data.summary.datasets.archivo_resultados_wta || 0)} filas históricas, además de los resultados modernos. La descarga principal está segmentada como ATP para terminar en pocas jornadas y evita una llamada individual innecesaria por cada partido. DEUCE publica una muestra transformada y totales agregados; el volcado bruto permanece en el entorno de trabajo conforme a las condiciones del proveedor.</p><a href="https://livetennisapi.com/terms">Condiciones de Live Tennis API <ArrowUpRight size={16} aria-hidden="true"/></a></div></section>
  </div>;
}
