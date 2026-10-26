import { ArrowUpRight } from 'lucide-react';
import { ArchivePage } from '@/components/deuce/ArchivePage';
import ArchiveFreshness from '@/components/ArchiveFreshness';
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
import PlayerAvatar from '@/components/PlayerAvatar';
import { canonicalSearchText } from '@/lib/search-text';
import styles from './records.module.css';
import GrandSlamCrown from '@/components/GrandSlamCrown';

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
  const term=canonicalSearchText(query.q||'');
  const pieces=manifest.pieces.filter(piece=>(!selected||piece.group===selected)&&(!term||canonicalSearchText(`${piece.title} ${piece.group} ${piece.leader?.name||''}`).includes(term)));
  const featured=pieces.filter(piece=>piece.leader).slice(0,6);
  const visibleGroups=selected?[selected]:term?groups:groups.slice(0,6);
  return <ArchivePage title="Récords" className="records-page">
    <div className="deuce-content records-intro">
      <p>Las marcas del archivo, desde 1968 hasta la última temporada registrada.</p>
      <RecordsControls query={query} filters={filtersFor(manifest.years)} searchable/>
      <p className="deuce-count">{number(pieces.length)} estadísticas calculadas con {number(manifest.matchCount)} partidos</p>
    </div>
    {!!featured.length&&<section className="records-featured deuce-content" aria-labelledby="records-featured-heading"><div className="records-section-head"><h2 id="records-featured-heading">En primer plano</h2><span>Desliza para explorar →</span></div><div className="records-featured-track">{featured.map(piece=><Link key={piece.id} href={recordsUrl(recordFilters(query),{dato:piece.id})} className="records-feature-card"><span className="records-feature-type">{piece.group}</span><strong>{recordValue(piece.leader!,piece.percent,piece.id==='tal-dia-como-hoy')}</strong><span className="records-feature-title">{piece.title}</span><span className="records-feature-person"><PlayerAvatar name={piece.leader!.name} size={44}/>{piece.leader!.name}</span><span className="records-feature-arrow" aria-hidden="true">↗</span></Link>)}</div></section>}
    {!selected && !term && <div className="deuce-content"><GrandSlamCrown /></div>}
    <section className="records-directory deuce-content" aria-labelledby="records-directory-heading"><div className="records-section-head"><h2 id="records-directory-heading">{selected?'Estadísticas de la familia':'Explorar por familia'}</h2><span>{number(pieces.length)} registros</span></div><nav className="deuce-tabs" aria-label="Familias de estadísticas"><Link href={recordsUrl(recordFilters(query),{q:query.q})} aria-current={!selected?'page':undefined}>Resumen</Link>{groups.map(group=><Link key={group} href={recordsUrl(recordFilters(query),{grupo:group,q:query.q})} aria-current={selected===group?'page':undefined}>{families.find(([,value])=>value===group)?.[0]||group}</Link>)}</nav><div className="records-family-list">{visibleGroups.map(group=>{const groupPieces=pieces.filter(piece=>piece.group===group),visible=selected||term?groupPieces:groupPieces.slice(0,3);return <section key={group} className="records-family"><h3>{families.find(([,value])=>value===group)?.[0]||group}</h3><div>{visible.map(piece=><Link key={piece.id} href={recordsUrl(recordFilters(query),{dato:piece.id})}><span>{piece.title}<small>{piece.leader?.name||'Sin muestra suficiente'}</small></span><strong>{piece.leader?recordValue(piece.leader,piece.percent,piece.id==='tal-dia-como-hoy'):'—'}</strong><ArrowUpRight size={17} aria-hidden="true"/></Link>)}{!selected&&!term&&groupPieces.length>visible.length&&<Link className="records-family-more" href={recordsUrl(recordFilters(query),{grupo:group})}><span>Ver las {number(groupPieces.length)} estadísticas</span><ArrowUpRight size={17} aria-hidden="true"/></Link>}</div></section>})}</div>{!selected&&!term&&groups.length>visibleGroups.length&&<p className="records-directory-note">Elige una familia en la barra superior para abrir Saque, Resto, Golpes, Medidas de partido y el resto del catálogo sin cargar todas las tarjetas a la vez.</p>}{!pieces.length&&<div className="deuce-empty" role="status"><h2>Sin estadísticas coincidentes</h2><p>No hay resultados para «{query.q}» con estos filtros.</p><Link href="/records">Quitar filtros</Link></div>}</section>
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

function ratePerHundred(value: number, sample: number) {
  return sample > 0 && value >= 0 && value <= sample ? `${number(value / sample * 100, 1)} por cada 100 partidos` : '';
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
  const measuredCoverage = piece?.measured && view.manifest.matchCount > 0 ? piece.sample / view.manifest.matchCount : null;
  const marathonPreview = query.dato === 'mas-juegos' && query.full !== 'true';
  const detailFilters = piece?.percent ? [...filtersFor(view.manifest.years), { key: 'min', label: 'Muestra mínima', options: [10, 30, 50, 100].map(value => ({ value: String(value), label: `${value} casos` })) }] : filtersFor(view.manifest.years);
  return <div className={`nc-wrap ${styles.page} ${styles.detail}`}>
    {back}<ArchiveNotice status={view} />
    <header className={styles.heading}><h1>{title}{measuredCoverage !== null && measuredCoverage < .2 ? ' · muestra medida' : ''}</h1><p>{piece?.definition}</p>
      <div className={styles.actions}><Link href={'/cobertura?' + new URLSearchParams(Object.entries(query).filter(([, value]) => value) as [string, string][])}>Sobre los datos<ChevronRight size={14} aria-hidden="true" /></Link><ShareLinkButton title={`${title} — DEUCE`} /></div>
    </header>
    <ArchiveFreshness manifest={view.manifest}/>
    {piece && <p className="archive-freshness">Periodo: {piece.years}. {piece.measured ? `Cobertura medida: ${number(piece.sample)} de ${number(view.manifest.matchCount)} partidos del archivo.` : `Muestra: ${number(piece.sample)} partidos con los campos necesarios.`} Mínimo por entrada: {piece.minimum}.{piece.percent?` Clasificación: al menos ${query.min || 50} casos.`:''} {query.competition || 'Todas las competiciones del archivo'}.</p>}
    <RecordsControls query={query} filters={detailFilters} />
    {!piece ? <section className={styles.empty} role="status"><h2>Sin resultados para esta selección</h2><p>{view.emptyReason === 'ranking' ? 'Faltan posiciones históricas de ranking para calcular esta estadística. No significa que no hubiera victorias.' : 'Prueba otro periodo, superficie o categoría.'}</p><Link href={recordsUrl({ dato: query.dato })}>Quitar filtros<ChevronRight size={15} aria-hidden="true" /></Link></section> : <>
      {leader && <section className={styles.leader} aria-label="Líder de esta estadística"><p className={styles.leaderValue}>{recordValue(leader, piece.percent, asYear)}</p><div><h2><Link href={leader.href}>{leader.name}</Link></h2><p>{[leader.detail, piece.percent ? `${number(leader.sample)} casos` : !leader.href.startsWith('/match/') ? ratePerHundred(leader.value, leader.sample) : ''].filter(Boolean).join(' · ')}</p><Link className={styles.inlineLink} prefetch={false} href={leader.href.startsWith('/match/') ? leader.href : evidenceHref(piece.id, leader, query)}>Ver {leader.href.startsWith('/match/') ? 'partido' : 'partidos'}<ChevronRight size={15} aria-hidden="true" /></Link></div></section>}
      <section className={styles.classification} aria-labelledby="classification-title"><div className={styles.listHeading}><h2 id="classification-title">Clasificación</h2><span>{number(piece.total)} {piece.total === 1 ? 'entrada' : 'entradas'}</span></div>
        <nav className={styles.sort} aria-label="Ordenar clasificación"><span>Ordenar por</span>{[['value', 'Cifra'], ['sample', 'Partidos'], ['name', 'Nombre']].map(([value, label]) => <Link scroll={false} key={value} href={recordsUrl(query, { sort: value, page: undefined, smallPage: undefined })} aria-current={(query.sort || 'value') === value ? 'page' : undefined}>{label}</Link>)}</nav>
        {view.rows.length ? <RecordsTable id={piece.id} query={query} rows={marathonPreview ? view.rows.slice(0, 3) : view.rows} percent={piece.percent} asYear={asYear} offset={(view.page - 1) * 25} priorValue={piece.pagePrior?.[view.page]} /> : <p className={styles.empty}>{piece.smallTotal ? 'Los resultados de esta selección están en Muestras pequeñas.' : 'Ningún resultado coincide con esta selección.'}</p>}
        {marathonPreview ? <div className={styles.optIn}><p>Mostramos los tres maratones principales. La clasificación completa se abre solo cuando la necesitas.</p><Link href={recordsUrl(query,{full:'true',page:undefined})}>Ver clasificación completa<ChevronRight size={15} aria-hidden="true" /></Link></div> : <RecordsPagination page={view.page} total={piece.total} href={page => recordsUrl(query, { page: String(page) })} />}
      </section>
      {piece.smallTotal > 0 && <section className={styles.classification} aria-labelledby="small-title"><div className={styles.listHeading}><h2 id="small-title">Muestras pequeñas</h2><span>{number(piece.smallTotal)} entradas</span></div><p className={styles.note}>Porcentajes basados en menos de 50 casos. La muestra acompaña a cada cifra.</p><RecordsTable id={piece.id} query={query} rows={view.smallRows} percent small offset={(view.smallPage - 1) * 25} priorValue={piece.smallPagePrior?.[view.smallPage]} /><RecordsPagination page={view.smallPage} total={piece.smallTotal} href={page => recordsUrl(query, { smallPage: String(page) })} /></section>}
    </>}
  </div>;
}
