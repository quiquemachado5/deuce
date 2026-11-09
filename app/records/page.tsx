import Image from "next/image";
import { ArchivePage } from "@/components/deuce/ArchivePage";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { number } from "@/lib/cuaderno/model";
import { recordView } from "@/lib/revista/read-records";
import { description } from "@/lib/revista/records";
import { RecordEras, recordValue } from "@/components/nocturno/RecordsViews";
import { recordFilters, recordsCanonical, recordsHaveTransientState, recordsUrl, type RecordQuery } from "@/lib/records-url";
import { evidenceHref } from "@/lib/record-evidence";
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import RecordsControls from "@/components/RecordsControls";
import RecordsTable, { RecordsPagination } from "@/components/RecordsTable";
import styles from "./records.module.css";
import type { RecordMeta } from "@/lib/revista/snapshot";
import redesign from "./records-redesign.module.css";
import RecordsRankings, {
  type RecordsRankingSet,
} from "@/components/records/RecordsRankings";
import RecordJumpLink from "@/components/records/RecordJumpLink";
import RecordsAnimatedValue from "@/components/records/RecordsAnimatedValue";
import RecordsSurfaceChart from "@/components/records/RecordsSurfaceChart";
import RecordsVideoCarousel from "@/components/records/RecordsVideoCarousel";
import RecordsFamilyNav from "@/components/records/RecordsFamilyNav";
import RecordsSurfaceSlider from "@/components/records/RecordsSurfaceSlider";
import ArchiveFilterBar from "@/components/ArchiveFilterBar";
import { resolvePlayerAvatarPhoto } from '@/components/PlayerAvatar';
import { photoFor, portraitFor, recordFamilyMediaLayout, recordImageStyle, rowForTour } from './record-media';
import { recordPhoto } from '@/lib/editorial-imagery';
import { hasPublishedTour, noIndexFollow, robotsForUnavailableTour } from '@/lib/seo-metadata';
import {
  RECORD_SURFACE_IMAGES,
  normalizeRecordQuery,
  recordDetailModel,
  recordFamilyLabel,
  recordFamilyPresentation,
  recordIndexModel,
  recordScope,
  recordViewIds,
} from "./record-page-model";

async function RecordIndex({
  manifest,
  query,
  status,
}: {
  manifest: Awaited<ReturnType<typeof recordView>>["manifest"];
  query: RecordQuery;
  status: Awaited<ReturnType<typeof recordView>>;
}) {
  const {
    groups,
    selected,
    term,
    pieces,
    wtaUnavailable,
    visibleGroups,
    overview,
  } = recordIndexModel(manifest, query);
  const { rankingIds, insightIds } = recordViewIds(
    query.tour === "wta" ? "wta" : "atp",
  );
  const [rankingViews, insightViews] = overview
    ? await Promise.all([
        Promise.all(
          rankingIds.map(
            (dato) => recordView(JSON.stringify({ dato, tour: query.tour })),
          ),
        ),
        Promise.all(insightIds.map((dato) => recordView(JSON.stringify({ dato, tour: query.tour })))),
      ])
    : [[], []];
  const rankingSets: RecordsRankingSet[] = rankingViews.flatMap((ranking) =>
    ranking.piece
      ? (() => {
          const rankingLeader = ranking.rows[0];
          const photo = rankingLeader ? portraitFor(rankingLeader.name,query.tour==='wta'?'wta':'atp') : null;
          return [
            {
            id: ranking.piece.id,
            title: ranking.piece.title,
            shortTitle:
              ranking.piece.id === "victorias"
                ? "Victorias"
                : ranking.piece.id === "finales-ganadas"
                  ? "Finales"
                  : ranking.piece.id === "partidos-disputados"
                    ? "Partidos"
                    : "Ante el top 10",
            photo: photo
              ? {
                  src: photo.src,
                  alt: photo.alt,
                  objectPosition: photo.objectPosition,
                  mobileObjectPosition: photo.mobileObjectPosition,
                }
              : undefined,
            rows: ranking.rows.slice(0, 25).map((row) => ({
              name: row.name,
              href: rowForTour(row, query.tour).href,
              detail: row.detail,
              value: row.value,
              display: recordValue(
                row,
                ranking.piece!.percent,
                ranking.piece!.id === "tal-dia-como-hoy",
              ),
              avatar: resolvePlayerAvatarPhoto(row.name, query.tour === 'wta' ? 'wta' : 'atp'),
            })),
            },
          ];
        })()
      : [],
  );
  const insightById = new Map(
    insightViews.flatMap((view) =>
      view.piece ? [[view.piece.id, view.piece] as const] : [],
    ),
  );
  const manifestById = new Map(
    manifest.pieces.map((piece) => [piece.id, piece] as const),
  );
  const surfaceSources: Array<[string, RecordMeta | undefined]> = [
    [
      "Dura",
      insightById.get("efectividad-hard") ||
        manifestById.get("efectividad-hard"),
    ],
    [
      "Tierra",
      insightById.get("efectividad-clay") ||
        manifestById.get("efectividad-clay"),
    ],
    [
      "Hierba",
      insightById.get("efectividad-grass") ||
        manifestById.get("efectividad-grass"),
    ],
  ];
  const surfaceRecords = surfaceSources.flatMap(([label, piece]) =>
    piece?.leader
      ? [
          {
            label,
            id: piece.id,
            href: recordsUrl(recordFilters(query), { dato: piece.id }),
            player: piece.leader.name,
            value: piece.leader.value,
            display: recordValue(piece.leader, piece.percent, false),
            image:
              RECORD_SURFACE_IMAGES[
                label as keyof typeof RECORD_SURFACE_IMAGES
              ],
          },
        ]
      : [],
  );
  const marathon = insightById.get("mas-juegos");
  const finalsEfficiency = insightById.get("efectividad-finales");
  const comeback = insightById.get(query.tour==='wta'?"remontada-primer-set":"remontada-dos-sets");
  const finalsWon = finalsEfficiency?.leader
    ? Math.round(
        (finalsEfficiency.leader.value / 100) *
          finalsEfficiency.leader.sample,
      )
    : 0;
  const finalsLost = finalsEfficiency?.leader
    ? Math.max(0, finalsEfficiency.leader.sample - finalsWon)
    : 0;
  const comebackPhoto = photoFor(comeback);
  const marathonPhoto = photoFor(marathon);
  const {
    photoRecords: familyPhotoRecords,
    photoFallbacks: familyPhotoFallbacks,
    layouts: familyLayouts,
    keys: familyKeys,
  } = recordFamilyPresentation(query.tour === "wta" ? "wta" : "atp");
  return (
    <ArchivePage
      title="Récords"
      className={`records-page ${redesign.scope} ${redesign.page} ${!overview ? redesign.filteredPage : ""}`}
      tools={<ArchiveFilterBar
        circuitLabel="Circuitos del archivo"
        panelTitle="Filtrar récords"
        activeCount={[selected, term].filter(Boolean).length}
        circuits={[
          {href:recordsUrl(query,{tour:'atp',page:undefined,smallPage:undefined}),label:'ATP',active:query.tour==='atp'},
          {href:recordsUrl(query,{tour:'wta',page:undefined,smallPage:undefined}),label:'WTA',active:query.tour==='wta'},
        ]}
      >
        <form className={redesign.headerFilters} action="/records" method="get" role="search">
          <label><span>Buscar estadística</span><span className={redesign.headerSearch}><Search size={17} aria-hidden="true"/><input type="search" name="q" defaultValue={query.q || ''} placeholder="Título, familia o jugador"/></span></label>
          {query.tour === 'wta' ? <input type="hidden" name="tour" value="wta"/> : null}
          <button type="submit">Buscar</button>
        </form>
        <nav className={redesign.headerFamilies} aria-label="Familias de estadísticas">
          <Link href={recordsUrl(recordFilters(query), { q: query.q })} aria-current={!selected ? 'page' : undefined}>Todo</Link>
          {groups.map(group => <Link key={group} href={recordsUrl(recordFilters(query), { grupo: group, q: query.q })} aria-current={selected === group ? 'page' : undefined}>{recordFamilyLabel(group)}</Link>)}
        </nav>
      </ArchiveFilterBar>}
    >
      <ArchiveNotice status={status} />
      <aside className="dx-notice" role="note">{recordScope(manifest,query.tour==='wta'?'wta':'atp')}</aside>
      <nav className={redesign.earlyNav} aria-label="Atajos de récords">
        <a href="#records-directory-heading">Explorar estadísticas</a>
        {overview && rankingSets.length > 0 && <a href="#records-insights-heading">Ver otros ángulos</a>}
      </nav>
      {overview && rankingSets.length > 0 && (
        <section
          className={`${redesign.rankings} deuce-content`}
          aria-label={query.tour==='wta'?'Clasificaciones de la muestra publicada':'Clasificaciones históricas'}
        >
          <RecordsRankings sets={rankingSets} heading={query.tour==='wta'?'Clasificaciones de la muestra publicada':undefined} />
        </section>
      )}
      {overview && (
        <section
          className={`${redesign.insights} deuce-content`}
          aria-labelledby="records-insights-heading"
        >
          <header className={redesign.insightsHead}>
            <h2 id="records-insights-heading">El archivo, desde otros ángulos</h2>
          </header>
          <div className={redesign.insightGrid}>
            {marathon?.leader && marathonPhoto && (
              <RecordJumpLink
                className={redesign.photoInsight}
                recordId={marathon.id}
              >
                <Image
                  className={redesign.recordImage}
                  src={marathonPhoto.src}
                  alt={marathonPhoto.alt}
                  fill
                  unoptimized
                  sizes="(max-width: 759px) 100vw, 56vw"
                  style={recordImageStyle(marathonPhoto)}
                />
                <span>
                  <strong>
                    <RecordsAnimatedValue
                      value={marathon.leader.value}
                      display={recordValue(
                        marathon.leader,
                        marathon.percent,
                        false,
                      )}
                    />
                  </strong>
                  <b>El partido con más juegos</b>
                </span>
              </RecordJumpLink>
            )}
            {surfaceRecords.length > 0 && (
              <RecordsSurfaceChart records={surfaceRecords} />
            )}
            {finalsEfficiency?.leader && (
              <RecordJumpLink
                className={redesign.finalsInsight}
                recordId={finalsEfficiency.id}
              >
                <span className={redesign.finalsCopy}>
                  <h3>{finalsWon} de {finalsEfficiency.leader.sample} finales ganadas</h3>
                  <p>{finalsEfficiency.leader.name}</p>
                </span>
                <strong className={redesign.finalsRate}>
                  {recordValue(
                    finalsEfficiency.leader,
                    finalsEfficiency.percent,
                    false,
                  )}
                </strong>
                <div
                  className={redesign.finalTicks}
                  aria-label={`${finalsWon} victorias en ${finalsEfficiency.leader.sample} finales`}
                >
                  {Array.from(
                    { length: finalsEfficiency.leader.sample },
                    (_, index) => (
                      <i
                        key={index}
                        data-won={index < finalsWon || undefined}
                      />
                    ),
                  )}
                </div>
                <span className={redesign.finalsLegend}>
                  <span><i data-won="true" />Ganadas {finalsWon}</span>
                  <span><i />Perdidas {finalsLost}</span>
                </span>
              </RecordJumpLink>
            )}
            {comeback?.leader && comebackPhoto && (
              <RecordJumpLink
                className={redesign.numberInsight}
                recordId={comeback.id}
              >
                <Image
                  className={redesign.recordImage}
                  src={comebackPhoto.src}
                  alt={comebackPhoto.alt}
                  fill
                  unoptimized
                  sizes="(max-width: 759px) 100vw, 42vw"
                  style={recordImageStyle(comebackPhoto)}
                />
                <span>
                  <small>{query.tour==='wta'?'Remontadas tras perder el primer set':'Remontadas tras perder dos sets'}</small>
                  <b>{comeback.leader.name}</b>
                  <strong>
                    {recordValue(comeback.leader, comeback.percent, false)}
                  </strong>
                </span>
              </RecordJumpLink>
            )}
          </div>
          {query.tour==='atp'?<RecordsVideoCarousel />:null}
        </section>
      )}
      <section
        className={`${redesign.directory} deuce-content`}
        aria-labelledby="records-directory-heading"
      >
        <div className={redesign.directoryHead}>
          <h2 id="records-directory-heading">
            {selected ? "Estadísticas de la familia" : "Explorar el archivo"}
          </h2>
        </div>
        {!wtaUnavailable && <RecordsFamilyNav
          className={redesign.familyNav}
          activeKey={selected || "all"}
        >
          <Link
            href={recordsUrl(recordFilters(query), { q: query.q })}
            aria-current={!selected ? "page" : undefined}
          >
            Todo
          </Link>
          {groups.map((group) => (
            <Link
              key={group}
              href={recordsUrl(recordFilters(query), {
                grupo: group,
                q: query.q,
              })}
              aria-current={selected === group ? "page" : undefined}
            >
              {recordFamilyLabel(group)}
            </Link>
          ))}
        </RecordsFamilyNav>}
        {!wtaUnavailable && <div className={redesign.familyGrid} key={selected || term || "all"}>
          {visibleGroups.map((group, index) => {
            const groupPieces = pieces.filter((piece) => piece.group === group);
            const photoPieceId = familyPhotoRecords[group];
            const photoPiece = photoPieceId
              ? groupPieces.find((piece) => piece.id === photoPieceId)
              : undefined;
            const fallbackPhoto = familyPhotoFallbacks[group];
            const mediaLayout = recordFamilyMediaLayout(familyLayouts[group] || "photoTop",query.tour==='wta'?'wta':'atp');
            const hasVideo = mediaLayout === "videoBottom";
            const hasSlider = mediaLayout === "slider";
            const familyPhoto =
              (photoPiece?.leader ? portraitFor(photoPiece.leader.name,query.tour==='wta'?'wta':'atp') : null) ||
              (fallbackPhoto&&query.tour!=='wta'
                ? portraitFor(fallbackPhoto.playerName) ||
                  recordPhoto(fallbackPhoto.recordId, fallbackPhoto.playerName)
                : null) ||
              photoFor(photoPiece);
            const ordered = photoPiece
              ? [photoPiece, ...groupPieces.filter((piece) => piece.id !== photoPiece.id)]
              : groupPieces;
            const previewLimit = familyPhoto && index === 0 ? 7 : 4;
            const visible =
              selected || term ? ordered : ordered.slice(0, previewLimit);
            const hidden = selected || term ? [] : ordered.slice(visible.length);
            const lead = familyPhoto || hasVideo || hasSlider ? undefined : visible[0];
            const sliderIds = new Set(surfaceRecords.map((record) => record.id));
            const rest = hasSlider
              ? visible.filter((piece) => !sliderIds.has(piece.id))
              : visible.slice(1);
            const sizes = [
              "photoWide",
              "compact",
              "photoTall",
              "wide",
              "tall",
              "compact",
              "wide",
              "compact",
              "tall",
              "photoWide",
            ];
            return (
              <section
                key={group}
                className={redesign.family}
                data-size={familyPhoto ? sizes[index] : sizes[index] || "standard"}
                data-has-photo={familyPhoto && !hasVideo && !hasSlider ? "true" : "false"}
                data-layout={mediaLayout}
                data-family={familyKeys[group] || "other"}
              >
                <header>
                  <h3>
                    {recordFamilyLabel(group)}
                  </h3>
                  <span>{number(groupPieces.length)} estadísticas</span>
                </header>
                {hasSlider && surfaceRecords.length > 0 && (
                  <RecordsSurfaceSlider
                    slides={surfaceRecords.map((record) => ({
                      ...record,
                      href: recordsUrl(recordFilters(query), { dato: record.id }),
                    }))}
                  />
                )}
                {hasVideo && (
                  <div className={redesign.familyVideo}>
                    {familyPhoto && (
                      <Image
                        className={redesign.recordImage}
                        src={familyPhoto.src}
                        alt={familyPhoto.alt}
                        fill
                        unoptimized
                        sizes="(max-width: 759px) 100vw, 50vw"
                        style={recordImageStyle(familyPhoto)}
                      />
                    )}
                    <iframe
                      src="https://www.youtube-nocookie.com/embed/jUgyaoew8as?autoplay=1&mute=1&controls=0&loop=1&playlist=jUgyaoew8as&playsinline=1&rel=0"
                      title="Isner y Mahut disputan el partido más largo de Wimbledon"
                      aria-hidden="true"
                      tabIndex={-1}
                      loading="eager"
                      allow="autoplay; encrypted-media; picture-in-picture"
                    />
                    <span>
                      <small><Link href={recordsUrl(recordFilters(query), { dato: "mas-largos" })}>El partido más largo</Link></small>
                      <b>11 h 5 min</b>
                    </span>
                    <a className={redesign.familyVideoFallback} href="https://www.youtube.com/watch?v=jUgyaoew8as" target="_blank" rel="noreferrer">Abrir vídeo</a>
                  </div>
                )}
                {photoPiece?.leader && familyPhoto && !hasVideo && !hasSlider && (
                  <Link
                    id={`record-${photoPiece.id}`}
                    className={redesign.familyPhoto}
                    href={recordsUrl(recordFilters(query), {
                      dato: photoPiece.id,
                    })}
                  >
                    <Image
                      className={redesign.recordImage}
                      src={familyPhoto.src}
                      alt={familyPhoto.alt}
                      fill
                      unoptimized
                      sizes="(max-width: 759px) 100vw, 52vw"
                      style={recordImageStyle(familyPhoto)}
                    />
                    <span>
                      <strong>
                        {recordValue(
                          photoPiece.leader,
                          photoPiece.percent,
                          photoPiece.id === "tal-dia-como-hoy",
                        )}
                      </strong>
                      <small>{photoPiece.leader.name}</small>
                    </span>
                  </Link>
                )}
                {lead && (
                  <Link
                    id={`record-${lead.id}`}
                    className={redesign.familyLead}
                    href={recordsUrl(recordFilters(query), { dato: lead.id })}
                  >
                    <span>
                      {lead.title}
                      <small>
                        {lead.leader?.name || "Sin muestra suficiente"}
                      </small>
                    </span>
                    <strong>
                      {lead.leader
                        ? recordValue(
                            lead.leader,
                            lead.percent,
                            lead.id === "tal-dia-como-hoy",
                          )
                        : "—"}
                    </strong>
                  </Link>
                )}
                <div className={redesign.familyRows}>
                  {rest.map((piece) => (
                    <Link
                      key={piece.id}
                      id={`record-${piece.id}`}
                      href={recordsUrl(recordFilters(query), {
                        dato: piece.id,
                      })}
                    >
                      <span>
                        {piece.title}
                        <small>
                          {piece.leader?.name || "Sin muestra suficiente"}
                        </small>
                      </span>
                      <strong>
                        {piece.leader
                          ? recordValue(
                              piece.leader,
                              piece.percent,
                              piece.id === "tal-dia-como-hoy",
                            )
                          : "—"}
                      </strong>
                    </Link>
                  ))}
                </div>
                {hidden.length > 0 && (
                  <details className={redesign.familyMore}>
                    <summary>
                      <Plus size={14} aria-hidden="true" />
                      <span>
                        {number(hidden.length)}{" "}
                        {hidden.length === 1 ? "estadística" : "estadísticas"} más
                      </span>
                    </summary>
                    <div className={redesign.familyRows}>
                      {hidden.map((piece) => (
                        <Link
                          key={piece.id}
                          id={`record-${piece.id}`}
                          href={recordsUrl(recordFilters(query), {
                            dato: piece.id,
                          })}
                        >
                          <span>
                            {piece.title}
                            <small>
                              {piece.leader?.name || "Sin muestra suficiente"}
                            </small>
                          </span>
                          <strong>
                            {piece.leader
                              ? recordValue(
                                  piece.leader,
                                  piece.percent,
                                  piece.id === "tal-dia-como-hoy",
                                )
                              : "—"}
                          </strong>
                        </Link>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </div>}
        {wtaUnavailable ? (
          <div className="deuce-empty" role="status">
            <h2>Sin récords en esta selección</h2>
            <p>Prueba otro circuito o ajusta los filtros.</p>
            <nav className={redesign.emptyActions} aria-label="Alternativas"><Link href="/records">Ver récords ATP</Link></nav>
          </div>
        ) : !pieces.length && (
          <div className="deuce-empty" role="status">
            <h2>Sin estadísticas coincidentes</h2>
            <p>No hay resultados para «{query.q}» con estos filtros.</p>
            <Link href={recordsUrl({tour:query.tour})}>Quitar filtros</Link>
          </div>
        )}
      </section>
    </ArchivePage>
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RecordQuery>;
}) {
  const raw = await searchParams;
  const query = normalizeRecordQuery(raw);
  const tour = query.tour;
  const view = await recordView(JSON.stringify(query));
  const piece =
    view.piece || view.manifest.pieces.find((entry) => entry.id === query.dato);
  const unavailableWta = tour === 'wta' && !hasPublishedTour(view.manifest.summary, 'wta');
  const title =
    query.dato === "dos-epocas"
      ? "Efectividad en finales: dos épocas"
      : piece?.title || "Récords";
  const metadataDescription = unavailableWta
    ? 'El archivo de récords WTA está en preparación. Los datos ATP publicados permanecen disponibles por separado.'
    : piece?.definition || (tour === 'wta'
      ? recordScope(view.manifest,'wta')
      : description.replace('ATP y WTA', 'ATP'));
  const canonical = recordsCanonical(query);
  return {
    title: `${title} — DEUCE`,
    description: metadataDescription,
    alternates: { canonical, languages: { es: canonical, en: `/en/records${tour==='wta'?'?tour=wta':''}` } },
    openGraph: {
      title: `${title} — DEUCE`,
      description: metadataDescription,
      url: canonical,
      images: ['/opengraph-image'],
    },
    twitter: { card: 'summary_large_image' as const, title: `${title} — DEUCE`, description: metadataDescription, images: ['/opengraph-image'] },
    robots: recordsHaveTransientState(raw) ? noIndexFollow : robotsForUnavailableTour(view.manifest.summary, tour),
  };
}

export default async function Records({
  searchParams,
}: {
  searchParams: Promise<RecordQuery>;
}) {
  const raw = await searchParams;
  const query = normalizeRecordQuery(raw);
  const view = await recordView(JSON.stringify(query));
  if (!query.dato)
    return <RecordIndex manifest={view.manifest} query={query} status={view} />;
  const back = (
    <Link
      className={`${styles.back} ${redesign.detailBack}`}
      href={recordsUrl(recordFilters(query))}
    >
      <ChevronLeft size={16} aria-hidden="true" />
      Récords
    </Link>
  );
  if (query.dato === "dos-epocas") {
    const cutoff = view.manifest.eraCuts.includes(Number(query.corte))
      ? Number(query.corte)
      : 2020;
    return (
      <div
        className={`records-page nc-wrap ${redesign.scope} ${styles.page} ${styles.detail} ${redesign.detailPage}`}
        data-record-tone="hard"
        data-record-detail="true"
      >
        {back}
        <ArchiveNotice status={view} />
        <aside className="dx-notice" role="note">{recordScope(view.manifest,query.tour === 'wta' ? 'wta' : 'atp')}</aside>
        <header className={`${styles.heading} ${redesign.detailHero}`}>
          <h1>Efectividad en finales</h1>
          <p>Antes y desde {cutoff}, dentro del archivo publicado. Al menos cinco finales en cada periodo.</p>
        </header>
        <RecordsControls
          query={{ ...query, corte: String(cutoff) }}
          filters={[
            {
              key: "corte",
              label: `Separar épocas en ${cutoff}`,
              options: view.manifest.eraCuts.map((year) => ({
                value: String(year),
                label: String(year),
              })),
            },
          ]}
        />
        <div className={styles.eras}>
          {view.eras.length ? (
            <RecordEras eras={view.eras} cut={cutoff} filters={query} />
          ) : (
            <p className={styles.empty}>
              Ningún jugador llega a cinco finales en ambos periodos. Prueba
              otro año.
            </p>
          )}
        </div>
        <RecordsPagination
          page={view.page}
          total={view.eraTotal}
          href={(page) => recordsUrl(query, { page: String(page) })}
        />
      </div>
    );
  }
  const piece = view.piece;
  if (!piece && !view.exists) notFound();
  const leader = piece?.leader;
  const detailPhoto =
    leader && piece ? portraitFor(leader.name,query.tour==='wta'?'wta':'atp') || photoFor(piece) : null;
  const {
    asYear,
    title,
    definition: detailDefinition,
    marathonPreview,
    relatedPieces,
    relatedLabel,
    tourOptions,
  } = recordDetailModel(view.manifest, piece, query);
  return (
    <div
      className={`records-page nc-wrap ${redesign.scope} ${styles.page} ${styles.detail} ${redesign.detailPage}`}
      data-record-detail="true"
    >
      {back}
      <ArchiveNotice status={view} />
      <aside className="dx-notice" role="note">{recordScope(view.manifest,query.tour==='wta'?'wta':'atp')}</aside>
      {tourOptions.length>1?<RecordsControls query={query} filters={[{key:'tour',label:'Circuito',options:tourOptions}]}/>:null}
      <header
        className={`${styles.heading} ${redesign.detailHero}`}
        data-has-leader={leader ? "true" : undefined}
        data-has-photo={detailPhoto ? "true" : undefined}
      >
        <div className={redesign.detailHeroCopy}>
          <h1>{title}</h1>
          <p>{detailDefinition}</p>
          {piece && <Link className={redesign.detailMethodLink} href={`/cobertura?dato=${encodeURIComponent(piece.id)}#estadistica`}>Sobre los datos y el cálculo</Link>}
        </div>
        {leader && piece && (
          <div className={redesign.detailHeroRecord}>
            <Link href={leader.href}>{leader.name}</Link>
            <strong>{recordValue(leader, piece.percent, asYear)}</strong>
            <Link
              className={redesign.detailEvidence}
              prefetch={false}
              href={
                leader.href.startsWith("/match/")
                  ? leader.href
                  : evidenceHref(piece.id, leader, query)
              }
            >
              Ver {leader.href.startsWith("/match/") ? "partido" : "partidos"}
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
        {detailPhoto && (
          <div className={redesign.detailPortrait} aria-hidden="true">
            <Image
              className={redesign.recordImage}
              src={detailPhoto.src}
              alt=""
              fill
              priority
              sizes="(max-width: 720px) calc(100vw - 66px), 220px"
              style={recordImageStyle(detailPhoto)}
            />
          </div>
        )}
      </header>
      {!piece ? (
        <section className={styles.empty} role="status">
          <h2>Sin resultados para esta selección</h2>
          <p>Prueba otro periodo, superficie o categoría.</p>
          <Link href={recordsUrl({ dato: query.dato, tour: query.tour })}>
            Quitar filtros
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <>
          <section
            className={`${styles.classification} ${redesign.detailClassification}`}
            aria-labelledby="classification-title"
          >
            <div className={styles.listHeading}>
              <h2 id="classification-title">Clasificación</h2>
            </div>
            <nav className={styles.sort} aria-label="Ordenar clasificación">
              <span>Ordenar por</span>
              {[
                ["value", "Cifra"],
                ["name", "Nombre"],
              ].map(([value, label]) => (
                <Link
                  scroll={false}
                  key={value}
                  href={recordsUrl(query, {
                    sort: value,
                    page: undefined,
                    smallPage: undefined,
                  })}
                  aria-current={
                    (query.sort || "value") === value ? "page" : undefined
                  }
                >
                  {label}
                </Link>
              ))}
            </nav>
            {view.rows.length ? (
              <RecordsTable
                id={piece.id}
                query={query}
                rows={(marathonPreview ? view.rows.slice(0, 3) : view.rows).map(row => rowForTour(row, query.tour))}
                percent={piece.percent}
                asYear={asYear}
                offset={(view.page - 1) * 25}
                priorValue={piece.pagePrior?.[view.page]}
                minimal
              />
            ) : (
              <p className={styles.empty}>
                {piece.smallTotal
                  ? "Los resultados de esta selección están en Muestras pequeñas."
                  : "Ningún resultado coincide con esta selección."}
              </p>
            )}
            {marathonPreview ? (
              <div className={styles.optIn}>
                <p>
                  Mostramos los tres maratones principales. La clasificación
                  completa se abre solo cuando la necesitas.
                </p>
                <Link
                  href={recordsUrl(query, { full: "true", page: undefined })}
                >
                  Ver clasificación completa
                  <ChevronRight size={15} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <RecordsPagination
                page={view.page}
                total={piece.total}
                href={(page) => recordsUrl(query, { page: String(page) })}
              />
            )}
          </section>
          {piece.smallTotal > 0 && (
            <section
              className={`${styles.classification} ${redesign.detailClassification}`}
              aria-labelledby="small-title"
            >
              <div className={styles.listHeading}>
                <h2 id="small-title">Muestras pequeñas</h2>
              </div>
              <RecordsTable
                id={piece.id}
                query={query}
                rows={view.smallRows.map(row => rowForTour(row, query.tour))}
                percent
                small
                offset={(view.smallPage - 1) * 25}
                priorValue={piece.smallPagePrior?.[view.smallPage]}
                minimal
              />
              <RecordsPagination
                page={view.smallPage}
                total={piece.smallTotal}
                href={(page) => recordsUrl(query, { smallPage: String(page) })}
              />
            </section>
          )}
          {relatedPieces.length > 0 && (
            <section
              className={redesign.detailRelated}
              aria-labelledby="related-records-title"
            >
              <div>
                <h2 id="related-records-title">Más de {relatedLabel}</h2>
              </div>
              <div>
                {relatedPieces.map((entry) => (
                  <Link
                    key={entry.id}
                    href={recordsUrl(recordFilters(query), { dato: entry.id })}
                  >
                    <span>
                      <strong>{entry.title}</strong>
                      <small>
                        {entry.leader?.name || "Sin muestra suficiente"}
                      </small>
                    </span>
                    <b>
                      {entry.leader
                        ? recordValue(
                            entry.leader,
                            entry.percent,
                            entry.id === "tal-dia-como-hoy",
                          )
                        : "—"}
                    </b>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
