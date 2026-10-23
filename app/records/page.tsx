import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { number } from '@/lib/cuaderno/model';
import { recordView } from '@/lib/revista/read-records';
import { description, groupDescriptions } from '@/lib/revista/records';
import type { RecordMeta } from '@/lib/revista/snapshot';
import { RecordEras, recordValue } from '@/components/nocturno/RecordsViews';
import { TOURNAMENTS } from '@/lib/types';
import { tournamentName } from '@/lib/labels';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import { recordFilters, recordsUrl, type RecordQuery } from '@/lib/records-url';
import { evidenceHref } from '@/lib/record-evidence';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import ShareLinkButton from '@/components/ShareLinkButton';
import RecordsControls, { type RecordFilter } from '@/components/RecordsControls';
import RecordsTable, { RecordsPagination } from '@/components/RecordsTable';
import styles from './records.module.css';

const families = [
  ['Títulos y finales', 'Títulos y finales'], ['Victorias', 'Victorias'],
  ['Remontadas', 'Remontadas y forma del partido'], ['Presión', 'Presión'],
  ['Tiempo y edad', 'Tiempo, edad y calendario'], ['Por torneo', 'Un torneo'],
  ['Parejas', 'Parejas'], ['Medidas de partido', 'Medidas de partido'],
  ['Superficies', 'Superficies'], ['Saque', 'Saque'], ['Resto', 'Resto'], ['Golpes', 'Golpes'],
] as const;

function CatalogueEntry({ piece, query }: { piece: RecordMeta; query: RecordQuery }) {
  return <Link className={styles.catalogueRow} href={recordsUrl(recordFilters(query), { dato: piece.id })} prefetch={false}>
    <span className={styles.metricTitle}>{piece.title}</span>
    <span className={styles.metricLeader}>{piece.leader?.name || 'Sin muestra suficiente'}{piece.percent && piece.leader && <small>{number(piece.leader.sample)} casos</small>}</span>
    <strong className={styles.metricValue}>{piece.leader ? recordValue(piece.leader, piece.percent, piece.id === 'tal-dia-como-hoy') : ''}</strong>
    <ChevronRight size={16} aria-hidden="true" />
  </Link>;
}

function RecordIndex({ manifest, query }: { manifest: Awaited<ReturnType<typeof recordView>>['manifest']; query: RecordQuery }) {
  return <div className={`nc-wrap ${styles.page}`}>
    <header className={styles.heading}><h1>Récords</h1></header>
    <nav className={styles.periods} aria-label="Periodo de las estadísticas">
      <Link href={recordsUrl(recordFilters(query), { era: undefined })} aria-current={query.era !== 'last20' ? 'page' : undefined}>Era Abierta<span> · 1968–actualidad</span></Link>
      <Link href={recordsUrl(recordFilters(query), { era: 'last20' })} aria-current={query.era === 'last20' ? 'page' : undefined}>Últimos 20 años</Link>
    </nav>
    <p className={styles.archiveCount}>{number(manifest.pieces.length)} estadísticas · {number(manifest.matchCount)} partidos en esta selección</p>
    {['year', 'surface', 'competition'].some(key => query[key] && query[key] !== 'all') && <RecordsControls query={query} filters={filtersFor(manifest.years).filter(filter => filter.key !== 'era')} />}
    <div className={styles.families}>
      {families.map(([label, group], index) => {
        const entries = manifest.pieces.filter(piece => piece.group === group);
        if (!entries.length && group !== 'Un torneo') return null;
        return <details className={styles.family} id={`grupo-${index}`} key={group}>
          <summary><span><h2>{label}</h2><span className={styles.familyDescription}>{groupDescriptions[group]}</span></span><span className={styles.familyCount}>{entries.length > 0 ? number(entries.length) : 'Explorar'}</span><ChevronDown size={19} aria-hidden="true" /></summary>
          <div className={styles.familyRows}>
            {entries.length > 0 && <div className={styles.columns} aria-hidden="true"><span>Estadística</span><span>Líder</span><span>Cifra</span></div>}
            {entries.map(piece => <CatalogueEntry piece={piece} query={query} key={piece.id} />)}
            {group === 'Títulos y finales' && manifest.eraCuts.length > 0 && <Link className={styles.exploreRow} href={recordsUrl(recordFilters(query), { dato: 'dos-epocas', corte: '2020' })}><span>Comparar la efectividad en finales entre épocas</span><ChevronRight size={16} aria-hidden="true" /></Link>}
            {group === 'Un torneo' && <>{TOURNAMENTS.map(tournament => <Link className={styles.exploreRow} href={`/torneos/${tournament.slug}`} key={tournament.slug}><span>{tournamentName(tournament.name)}<small>{tournament.category}</small></span><ChevronRight size={16} aria-hidden="true" /></Link>)}<Link className={styles.exploreRow} href="/tournaments"><span>Ver todos los torneos</span><ChevronRight size={16} aria-hidden="true" /></Link></>}
          </div>
        </details>;
      })}
    </div>
    <Link className={styles.coverage} href="/cobertura">Cobertura y metodología<ChevronRight size={14} aria-hidden="true" /></Link>
  </div>;
}

function filtersFor(years: number[]): RecordFilter[] {
  return [
    { key: 'era', label: 'Periodo', options: [{ value: '', label: 'Era Abierta · 1968–actualidad' }, { value: 'last20', label: 'Últimos 20 años' }] },
    { key: 'year', label: 'Temporada', options: [{ value: '', label: 'Todas las temporadas' }, ...years.map(year => ({ value: String(year), label: String(year) }))] },
    { key: 'surface', label: 'Superficie', options: [{ value: '', label: 'Todas las superficies' }, ...SURFACES.map(value => ({ value, label: surfaceLabel[value] }))] },
    { key: 'competition', label: 'Categoría', options: [{ value: '', label: 'Todas las categorías' }, ...['Grand Slam', 'Masters 1000', 'ATP 500', 'ATP 250', 'Precursores de Masters'].map(value => ({ value, label: value === 'Precursores de Masters' ? 'Precursores de Masters · antes de 1990' : value }))] },
  ];
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<RecordQuery> }) {
  const query = await searchParams;
  const view = await recordView(JSON.stringify(query));
  const piece = view.piece || view.manifest.pieces.find(entry => entry.id === query.dato);
  const title = query.dato === 'dos-epocas' ? 'Efectividad en finales: dos épocas' : piece?.title || 'Récords';
  return { title: `${title} — DEUCE`, description: piece?.definition || description, alternates: { canonical: recordsUrl(query) }, openGraph: { title: `${title} — DEUCE`, description: piece?.definition || description } };
}

export default async function Records({ searchParams }: { searchParams: Promise<RecordQuery> }) {
  const query = await searchParams;
  const view = await recordView(JSON.stringify(query));
  if (!query.dato) return <><ArchiveNotice status={view} /><RecordIndex manifest={view.manifest} query={query} /></>;
  const back = <Link className={styles.back} href={recordsUrl(recordFilters(query))}><ChevronLeft size={16} aria-hidden="true" />Récords</Link>;
  if (query.dato === 'dos-epocas') {
    const cutoff = view.manifest.eraCuts.includes(Number(query.corte)) ? Number(query.corte) : 2020;
    return <div className={`nc-wrap ${styles.page} ${styles.detail}`}>
      {back}<ArchiveNotice status={view} />
      <header className={styles.heading}><h1>Efectividad en finales</h1><p>Antes y desde {cutoff}. Al menos cinco finales en cada periodo.</p></header>
      <RecordsControls query={{ ...query, corte: String(cutoff) }} filters={[{ key: 'corte', label: `Separar épocas en ${cutoff}`, options: view.manifest.eraCuts.map(year => ({ value: String(year), label: String(year) })) }]} />
      <div className={styles.eras}>{view.eras.length ? <RecordEras eras={view.eras} cut={cutoff} filters={query} /> : <p className={styles.empty}>Ningún jugador llega a cinco finales en ambos periodos. Prueba otro año.</p>}</div>
      <RecordsPagination page={view.page} total={view.eraTotal} href={page => recordsUrl(query, { page: String(page) })} />
    </div>;
  }
  const piece = view.piece;
  if (!piece && !view.exists) notFound();
  const leader = piece?.leader;
  const asYear = query.dato === 'tal-dia-como-hoy';
  const title = piece?.title || view.manifest.pieces.find(entry => entry.id === query.dato)?.title || 'Récords';
  return <div className={`nc-wrap ${styles.page} ${styles.detail}`}>
    {back}<ArchiveNotice status={view} />
    <header className={styles.heading}><h1>{title}</h1><p>{piece?.definition}</p>
      <div className={styles.actions}><Link href={'/cobertura?' + new URLSearchParams(Object.entries(query).filter(([, value]) => value) as [string, string][])}>Sobre los datos<ChevronRight size={14} aria-hidden="true" /></Link><ShareLinkButton title={`${title} — DEUCE`} /></div>
    </header>
    <RecordsControls query={query} filters={filtersFor(view.manifest.years)} />
    {!piece ? <section className={styles.empty} role="status"><h2>Sin resultados para esta selección</h2><p>{view.emptyReason === 'ranking' ? 'Faltan posiciones históricas de ranking para calcular esta estadística. No significa que no hubiera victorias.' : 'Prueba otro periodo, superficie o categoría.'}</p><Link href={recordsUrl({ dato: query.dato })}>Quitar filtros<ChevronRight size={15} aria-hidden="true" /></Link></section> : <>
      {leader && <section className={styles.leader} aria-label="Líder de esta estadística"><p className={styles.leaderValue}>{recordValue(leader, piece.percent, asYear)}</p><div><h2><Link href={leader.href}>{leader.name}</Link></h2><p>{[leader.detail, piece.percent ? `${number(leader.sample)} casos` : ''].filter(Boolean).join(' · ')}</p><Link className={styles.inlineLink} prefetch={false} href={leader.href.startsWith('/match/') ? leader.href : evidenceHref(piece.id, leader, query)}>Ver {leader.href.startsWith('/match/') ? 'partido' : 'partidos'}<ChevronRight size={15} aria-hidden="true" /></Link></div></section>}
      <section className={styles.classification} aria-labelledby="classification-title"><div className={styles.listHeading}><h2 id="classification-title">Clasificación</h2><span>{number(piece.total)} {piece.total === 1 ? 'entrada' : 'entradas'}</span></div>
        <nav className={styles.sort} aria-label="Ordenar clasificación"><span>Ordenar por</span>{[['value', 'Cifra'], ['sample', 'Partidos'], ['name', 'Nombre']].map(([value, label]) => <Link scroll={false} key={value} href={recordsUrl(query, { sort: value, page: undefined, smallPage: undefined })} aria-current={(query.sort || 'value') === value ? 'page' : undefined}>{label}</Link>)}</nav>
        {view.rows.length ? <RecordsTable id={piece.id} query={query} rows={view.rows} percent={piece.percent} asYear={asYear} offset={(view.page - 1) * 25} priorValue={piece.pagePrior?.[view.page]} /> : <p className={styles.empty}>{piece.smallTotal ? 'Los resultados de esta selección están en Muestras pequeñas.' : 'Ningún resultado coincide con esta selección.'}</p>}
        <RecordsPagination page={view.page} total={piece.total} href={page => recordsUrl(query, { page: String(page) })} />
      </section>
      {piece.smallTotal > 0 && <section className={styles.classification} aria-labelledby="small-title"><div className={styles.listHeading}><h2 id="small-title">Muestras pequeñas</h2><span>{number(piece.smallTotal)} entradas</span></div><p className={styles.note}>Porcentajes basados en menos de 50 casos. La muestra acompaña a cada cifra.</p><RecordsTable id={piece.id} query={query} rows={view.smallRows} percent small offset={(view.smallPage - 1) * 25} priorValue={piece.smallPagePrior?.[view.smallPage]} /><RecordsPagination page={view.smallPage} total={piece.smallTotal} href={page => recordsUrl(query, { smallPage: String(page) })} /></section>}
    </>}
  </div>;
}
