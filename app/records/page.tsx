import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import RecordsExperience from "./RecordsExperience";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { recordView } from "@/lib/revista/read-records";
import { description } from "@/lib/revista/records";
import { RecordEras, recordValue } from "@/components/nocturno/RecordsViews";
import { recordFilters, recordsCanonical, recordsHaveTransientState, recordsUrl, type RecordQuery } from "@/lib/records-url";
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import RecordsControls from "@/components/RecordsControls";
import RecordsTable, { RecordsPagination } from "@/components/RecordsTable";
import styles from "./records.module.css";
import detail from "./record-detail.module.css";
import { rowForTour } from './record-media';
import { hasPublishedTour, noIndexFollow, robotsForUnavailableTour } from '@/lib/seo-metadata';
import {
  normalizeRecordQuery,
  recordDetailModel,
  recordScope,
} from "./record-page-model";

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
    alternates: { canonical, },
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
    return <RecordsExperience manifest={view.manifest} query={query} />;
  const back = (
    <Link
      className={detail.detailBack}
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
        className={`record-detail ${detail.page}`}
        data-record-tone="hard"
        data-record-detail="true"
      >
        {back}
        <ArchiveNotice status={view} />
        <header className={`${styles.heading} ${detail.detailHero}`}>
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
  const {
    asYear,
    title,
    definition: detailDefinition,
    marathonPreview,
    relatedPieces,
    relatedLabel,
    tourOptions,
    valueLabel,
  } = recordDetailModel(view.manifest, piece, query);
  return (
    <div
      className={`record-detail ${detail.page}`}
      data-record-detail="true"
    >
      {<div className={detail.detailToolbar}>{back}{tourOptions.length>1?<ArchiveFilterBar tone="dark" circuitLabel="Circuito del récord" panelTitle="Elegir circuito" circuits={tourOptions.map(option=>({href:recordsUrl(query,{tour:option.value,page:undefined,smallPage:undefined}),active:query.tour===option.value,label:option.label}))}/>:null}</div>}
      <ArchiveNotice status={view} />
      <header
        className={`${styles.heading} ${detail.detailHero}`}
      >
        <div className={detail.detailHeroCopy}>
          <h1>{title}</h1>
          <p>{detailDefinition}</p>
          {piece && <Link className={detail.detailMethodLink} href={`/cobertura?dato=${encodeURIComponent(piece.id)}#estadistica`}>Sobre los datos y el cálculo</Link>}
        </div>
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
            className={`${styles.classification} ${detail.detailClassification}`}
            aria-labelledby="classification-title"
          >
            <div className={styles.listHeading}>
              <h2 id="classification-title">Clasificación</h2>
            <nav className={styles.sort} aria-label="Ordenar clasificación">
              <span>Ordenar por</span>
              {[
                ["value", valueLabel],
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
            </div>
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
                valueLabel={valueLabel}
                caption={`${title}. ${(query.tour||'atp').toUpperCase()}. ${piece.years}.`}
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
              className={`${styles.classification} ${detail.detailClassification}`}
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
              className={detail.detailRelated}
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
