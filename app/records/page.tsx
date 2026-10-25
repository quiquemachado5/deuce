import { ArchivePage, ArchiveGrid } from '@/components/deuce/ArchivePage';
import ArchiveFreshness from '@/components/ArchiveFreshness';
import { archiveDate } from '@/lib/archive-freshness';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { number } from '@/lib/cuaderno/model';
import { recordView } from '@/lib/revista/read-records';
import { description } from '@/lib/revista/records';
import { RecordEras, recordValue } from '@/components/nocturno/RecordsViews';
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

function RecordIndex({ manifest, query }: { manifest: Awaited<ReturnType<typeof recordView>>['manifest']; query: RecordQuery }) {
  const groups=[...new Set(manifest.pieces.map(piece=>piece.group))];
  const selected=query.grupo&&groups.includes(query.grupo)?query.grupo:'';
  const pieces=manifest.pieces.filter(piece=>!selected||piece.group===selected);
  const cards=pieces.map(piece=>({id:piece.id,title:piece.title,eyebrow:piece.group,
    value:piece.leader?recordValue(piece.leader,piece.percent,piece.id==='tal-dia-como-hoy'):undefined,
    meta:piece.leader?`${piece.leader.name}${piece.percent?' · '+number(piece.leader.sample)+' casos':''}`:'Sin muestra suficiente',
    href:recordsUrl(recordFilters(query),{dato:piece.id})}));
  return <ArchivePage title="Récords">
    <div className="deuce-content">
      <nav className="deuce-tabs" aria-label="Alcance de los récords"><Link href="/records">Históricos</Link><Link href={recordsUrl({}, {year:String(manifest.years[0])})}>Temporada {manifest.years[0]}</Link><Link href="/records?dato=victorias">Carreras</Link><Link href="/records#cambios">Cambios publicados</Link></nav>
      <ArchiveFreshness manifest={manifest}/>
      <RecordsControls query={query} filters={filtersFor(manifest.years)}/>
      <nav className="deuce-tabs" aria-label="Familias de estadísticas"><Link href={recordsUrl(recordFilters(query))} aria-current={!selected?'page':undefined}>Todos</Link>{groups.map(group=><Link key={group} href={recordsUrl(recordFilters(query),{grupo:group})} aria-current={selected===group?'page':undefined}>{families.find(([,value])=>value===group)?.[0]||group}</Link>)}</nav>
      <p className="deuce-count">{number(pieces.length)} estadísticas · {number(manifest.matchCount)} partidos en esta selección</p>
    </div>
    <ArchiveGrid cards={cards}/>
    <section className="deuce-content archive-changes" id="cambios"><h2>Cambios publicados</h2><p>Cambios entre cálculos del archivo. Pueden deberse a nuevos resultados o correcciones de cobertura, no necesariamente a un récord batido ese día.</p>{manifest.leaderChanges?.length ? <ul>{manifest.leaderChanges.slice(0,12).map(change=><li key={`${change.toVersion}-${change.id}`}><Link href={recordsUrl({}, {dato:change.id})}>{change.title}</Link><p>{change.before.names.join(", ")} ({number(change.before.value,2)}) → {change.after.names.join(", ")} ({number(change.after.value,2)})</p><time dateTime={change.observedAt}>{archiveDate(change.observedAt)}</time></li>)}</ul>:<p>El seguimiento comienza con esta versión. Los cambios aparecerán al publicarse una nueva generación comparable.</p>}</section>
    <nav className="deuce-tabs deuce-content" aria-label="Explorar más estadísticas"><Link href={recordsUrl(recordFilters(query),{dato:'dos-epocas',corte:'2020'})}>Comparar épocas ↗</Link><Link href="/tournaments">Por torneo ↗</Link><Link href="/cobertura">Cobertura y metodología ↗</Link></nav>
  </ArchivePage>;
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
    <ArchiveFreshness manifest={view.manifest}/>
    {piece && <p className="archive-freshness">Periodo: {piece.years}. Muestra: {number(piece.sample)} partidos con los campos necesarios. Mínimo por entrada: {piece.minimum}.{piece.percent?' Clasificación principal: al menos 50 casos; muestras menores separadas.':''} {query.competition || 'Todas las competiciones del archivo'}.</p>}
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
