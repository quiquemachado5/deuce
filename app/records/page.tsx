import Image from "next/image";
import type { CSSProperties } from "react";
import { ArchivePage } from "@/components/deuce/ArchivePage";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { number } from "@/lib/cuaderno/model";
import { recordView } from "@/lib/revista/read-records";
import { description } from "@/lib/revista/records";
import { RecordEras, recordValue } from "@/components/nocturno/RecordsViews";
import { recordFilters, recordsUrl, type RecordQuery } from "@/lib/records-url";
import { evidenceHref } from "@/lib/record-evidence";
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import RecordsControls from "@/components/RecordsControls";
import RecordsTable, { RecordsPagination } from "@/components/RecordsTable";
import { canonicalSearchText } from "@/lib/search-text";
import styles from "./records.module.css";
import type { RecordMeta } from "@/lib/revista/snapshot";
import redesign from "./records-redesign.module.css";
import { recordPhoto } from "@/lib/editorial-imagery";
import { playerEditionPhoto, playerPhoto } from "@/lib/player-imagery";
import type { Photo } from "@/lib/imagery";
import RecordsRankings, {
  type RecordsRankingSet,
} from "@/components/records/RecordsRankings";
import RecordJumpLink from "@/components/records/RecordJumpLink";
import RecordsAnimatedValue from "@/components/records/RecordsAnimatedValue";
import RecordsSurfaceChart from "@/components/records/RecordsSurfaceChart";
import RecordsVideoCarousel from "@/components/records/RecordsVideoCarousel";
import RecordsFamilyNav from "@/components/records/RecordsFamilyNav";
import RecordsSurfaceSlider from "@/components/records/RecordsSurfaceSlider";

const families = [
  ["Títulos y finales", "Títulos y finales"],
  ["Victorias", "Victorias"],
  ["Remontadas", "Remontadas y forma del partido"],
  ["Presión", "Presión"],
  ["Tiempo y edad", "Tiempo, edad y calendario"],
  ["Por torneo", "Un torneo"],
  ["Parejas", "Parejas"],
  ["Medidas de partido", "Medidas de partido"],
  ["Superficies", "Superficies"],
  ["Saque", "Saque"],
  ["Resto", "Resto"],
  ["Golpes", "Golpes"],
] as const;

function photoFor(piece?: RecordMeta | null) {
  return piece?.leader ? recordPhoto(piece.id, piece.leader.name) : null;
}

const portraitFocus: Record<
  string,
  { objectPosition: string; mobileObjectPosition: string }
> = {
  "Alex De Minaur": {
    objectPosition: "50% 24%",
    mobileObjectPosition: "50% 18%",
  },
  "Andy Murray": {
    objectPosition: "50% 20%",
    mobileObjectPosition: "50% 15%",
  },
  "Roger Federer": {
    objectPosition: "50% 20%",
    mobileObjectPosition: "50% 16%",
  },
  "Novak Djokovic": {
    objectPosition: "50% 16%",
    mobileObjectPosition: "50% 12%",
  },
  "Rafael Nadal": {
    objectPosition: "50% 20%",
    mobileObjectPosition: "50% 16%",
  },
  "John Isner": {
    objectPosition: "50% 20%",
    mobileObjectPosition: "50% 16%",
  },
  "Ben Shelton": {
    objectPosition: "50% 23%",
    mobileObjectPosition: "50% 18%",
  },
  "Alexander Zverev": {
    objectPosition: "50% 24%",
    mobileObjectPosition: "50% 18%",
  },
};

function portraitFor(name: string): Photo | null {
  const photo = playerEditionPhoto(name, 1) || playerPhoto(name);
  if (!photo) return null;
  const fullPortrait = photo.thumbnail?.match(
    /^\/images\/players\/optimized\/(.+)-small\.webp$/,
  )?.[1];
  return {
    ...photo,
    src: fullPortrait
      ? `/images/players/optimized/${fullPortrait}.webp`
      : photo.src,
    ...(portraitFocus[name] || {}),
  };
}

function recordImageStyle(photo: Photo): CSSProperties {
  return {
    "--record-photo-position": photo.objectPosition || "50% 28%",
    "--record-photo-position-mobile":
      photo.mobileObjectPosition || photo.objectPosition || "50% 22%",
  } as CSSProperties;
}

async function RecordIndex({
  manifest,
  query,
}: {
  manifest: Awaited<ReturnType<typeof recordView>>["manifest"];
  query: RecordQuery;
}) {
  const groups = [...new Set(manifest.pieces.map((piece) => piece.group))];
  const selected =
    query.grupo && groups.includes(query.grupo) ? query.grupo : "";
  const term = canonicalSearchText(query.q || "");
  const pieces = manifest.pieces.filter(
    (piece) =>
      (!selected || piece.group === selected) &&
      (!term ||
        canonicalSearchText(
          `${piece.title} ${piece.group} ${piece.leader?.name || ""}`,
        ).includes(term)),
  );
  const visibleGroups = (selected ? [selected] : groups).filter((group) =>
    pieces.some((piece) => piece.group === group),
  );
  const overview = !selected && !term;
  const [rankingViews, insightViews] = overview
    ? await Promise.all([
        Promise.all(
          ["victorias", "finales-ganadas", "efectividad-top-10"].map(
            (dato) => recordView(JSON.stringify({ dato })),
          ),
        ),
        Promise.all(
          [
            "efectividad-hard",
            "efectividad-clay",
            "efectividad-grass",
            "mas-juegos",
            "efectividad-finales",
            "remontada-dos-sets",
            "aces",
            "titulos-grass",
            "titulos-clay",
            "titulos-hard",
          ].map((dato) => recordView(JSON.stringify({ dato }))),
        ),
      ])
    : [[], []];
  const rankingSets: RecordsRankingSet[] = rankingViews.flatMap((ranking) =>
    ranking.piece
      ? (() => {
          const rankingLeader = ranking.rows[0];
          const photo = rankingLeader ? portraitFor(rankingLeader.name) : null;
          return [
            {
            id: ranking.piece.id,
            title: ranking.piece.title,
            shortTitle:
              ranking.piece.id === "victorias"
                ? "Victorias"
                : ranking.piece.id === "finales-ganadas"
                  ? "Finales"
                  : "Ante el top 10",
            photo: photo
              ? {
                  src: photo.src,
                  alt: photo.alt,
                  objectPosition: photo.objectPosition,
                  mobileObjectPosition: photo.mobileObjectPosition,
                }
              : undefined,
            rows: ranking.rows.map((row) => ({
              name: row.name,
              href: row.href,
              detail: row.detail,
              value: row.value,
              display: recordValue(
                row,
                ranking.piece!.percent,
                ranking.piece!.id === "tal-dia-como-hoy",
              ),
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
  const surfaceImages = {
    Dura: {
      src: "/images/courts/us-open-1440.webp",
      alt: "Pista dura del Abierto de Estados Unidos vista desde la grada",
      objectPosition: "50% 52%",
    },
    Tierra: {
      src: "/images/courts/roland-garros-1440.webp",
      alt: "Pista de tierra batida de Roland Garros",
      objectPosition: "50% 48%",
    },
    Hierba: {
      src: "/images/courts/wimbledon-1440.webp",
      alt: "Pista central de Wimbledon sobre hierba",
      objectPosition: "50% 46%",
    },
  } as const;
  const surfaceRecords = surfaceSources.flatMap(([label, piece]) =>
    piece?.leader
      ? [
          {
            label,
            id: piece.id,
            player: piece.leader.name,
            value: piece.leader.value,
            display: recordValue(piece.leader, piece.percent, false),
            image: surfaceImages[label as keyof typeof surfaceImages],
          },
        ]
      : [],
  );
  const marathon = insightById.get("mas-juegos");
  const finalsEfficiency = insightById.get("efectividad-finales");
  const comeback = insightById.get("remontada-dos-sets");
  const aceRecord = insightById.get("aces");
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
  const aceRecordPhoto = photoFor(aceRecord);
  const marathonPhoto = photoFor(marathon);
  const familyPhotoRecords: Record<string, string> = {
    Victorias: "atp-500-victorias",
    "Remontadas y forma del partido": "remontada-dos-sets",
    "Títulos y finales": "titulos-grass",
    Presión: "breaks-salvados",
    "Tiempo, edad y calendario": "mas-largos",
    Parejas: "parejas",
    Superficies: "efectividad-clay",
    Saque: "first-in",
    Resto: "return-won",
    Golpes: "winners",
  };
  const familyPhotoFallbacks: Record<
    string,
    { recordId: string; playerName: string }
  > = {
    "Tiempo, edad y calendario": {
      recordId: "mas-juegos",
      playerName: "John Isner",
    },
    Parejas: {
      recordId: "aces",
      playerName: "Novak Djokovic",
    },
  };
  const familyLayouts: Record<string, string> = {
    Victorias: "photoLeft",
    "Remontadas y forma del partido": "photoBottom",
    "Títulos y finales": "photoRight",
    Presión: "photoTop",
    "Tiempo, edad y calendario": "videoBottom",
    Parejas: "photoRight",
    Saque: "photoBottom",
    Resto: "photoLeft",
    Golpes: "photoTop",
    Superficies: "slider",
  };
  return (
    <ArchivePage
      title="Récords"
      className={`records-page ${redesign.page}`}
    >
      {overview && rankingSets.length > 0 && (
        <section
          className={`${redesign.rankings} deuce-content`}
          aria-label="Clasificaciones históricas"
        >
          <RecordsRankings sets={rankingSets} />
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
                  <small>Remontadas tras perder dos sets</small>
                  <b>{comeback.leader.name}</b>
                  <strong>
                    {recordValue(comeback.leader, comeback.percent, false)}
                  </strong>
                </span>
              </RecordJumpLink>
            )}
            {aceRecord?.leader && aceRecordPhoto && (
              <RecordJumpLink
                className={redesign.fiveSetInsight}
                recordId={aceRecord.id}
              >
                <Image
                  className={redesign.recordImage}
                  src={aceRecordPhoto.src}
                  alt={aceRecordPhoto.alt}
                  fill
                  unoptimized
                  sizes="(max-width: 759px) 100vw, 58vw"
                  style={recordImageStyle(aceRecordPhoto)}
                />
                <span>
                  <small>Saques directos medidos</small>
                  <h3>{aceRecord.leader.name}</h3>
                  <strong>
                    {recordValue(aceRecord.leader, aceRecord.percent, false)}
                  </strong>
                </span>
              </RecordJumpLink>
            )}
          </div>
          <RecordsVideoCarousel />
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
        <RecordsFamilyNav
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
              {families.find(([, value]) => value === group)?.[0] || group}
            </Link>
          ))}
        </RecordsFamilyNav>
        <div className={redesign.familyGrid} key={selected || term || "all"}>
          {visibleGroups.map((group, index) => {
            const groupPieces = pieces.filter((piece) => piece.group === group);
            const photoPieceId = familyPhotoRecords[group];
            const photoPiece = photoPieceId
              ? groupPieces.find((piece) => piece.id === photoPieceId)
              : undefined;
            const fallbackPhoto = familyPhotoFallbacks[group];
            const mediaLayout = familyLayouts[group] || "photoTop";
            const hasVideo = mediaLayout === "videoBottom";
            const hasSlider = mediaLayout === "slider";
            const familyPhoto =
              (photoPiece?.leader ? portraitFor(photoPiece.leader.name) : null) ||
              (fallbackPhoto
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
              >
                <header>
                  <h3>
                    {families.find(([, value]) => value === group)?.[0] ||
                      group}
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
                  <Link
                    className={redesign.familyVideo}
                    href={recordsUrl(recordFilters(query), { dato: "mas-largos" })}
                  >
                    <iframe
                      src="https://www.youtube.com/embed/jUgyaoew8as?autoplay=1&mute=1&controls=0&loop=1&playlist=jUgyaoew8as&playsinline=1&rel=0"
                      title="Isner y Mahut disputan el partido más largo de Wimbledon"
                      loading="lazy"
                      allow="autoplay; encrypted-media; picture-in-picture"
                    />
                    <span>
                      <small>El partido más largo</small>
                      <b>11 h 5 min</b>
                    </span>
                  </Link>
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
        </div>
        {!pieces.length && (
          <div className="deuce-empty" role="status">
            <h2>Sin estadísticas coincidentes</h2>
            <p>No hay resultados para «{query.q}» con estos filtros.</p>
            <Link href="/records">Quitar filtros</Link>
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
  const query = await searchParams;
  const view = await recordView(JSON.stringify(query));
  const piece =
    view.piece || view.manifest.pieces.find((entry) => entry.id === query.dato);
  const title =
    query.dato === "dos-epocas"
      ? "Efectividad en finales: dos épocas"
      : piece?.title || "Récords";
  return {
    title: `${title} — DEUCE`,
    description: piece?.definition || description,
    alternates: { canonical: recordsUrl(query) },
    openGraph: {
      title: `${title} — DEUCE`,
      description: piece?.definition || description,
    },
  };
}

export default async function Records({
  searchParams,
}: {
  searchParams: Promise<RecordQuery>;
}) {
  const query = await searchParams;
  const view = await recordView(JSON.stringify(query));
  if (!query.dato)
    return (
      <>
        <ArchiveNotice status={view} />
        <RecordIndex manifest={view.manifest} query={query} />
      </>
    );
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
        className={`records-page nc-wrap ${styles.page} ${styles.detail} ${redesign.detailPage}`}
        data-record-tone="hard"
        data-record-detail="true"
      >
        {back}
        <ArchiveNotice status={view} />
        <header className={`${styles.heading} ${redesign.detailHero}`}>
          <h1>Efectividad en finales</h1>
          <p>Antes y desde {cutoff}. Al menos cinco finales en cada periodo.</p>
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
    leader && piece ? portraitFor(leader.name) || photoFor(piece) : null;
  const asYear = query.dato === "tal-dia-como-hoy";
  const title =
    piece?.title ||
    view.manifest.pieces.find((entry) => entry.id === query.dato)?.title ||
    "Récords";
  const detailDefinition = piece?.definition
    ? `${piece.definition.split(". ")[0].replace(/\.$/, "")}.`
    : undefined;
  const marathonPreview = query.dato === "mas-juegos" && query.full !== "true";
  const relatedPieces = piece
    ? view.manifest.pieces
        .filter(
          (entry) => entry.group === piece.group && entry.id !== piece.id,
        )
        .slice(0, 4)
    : [];
  const relatedLabel =
    families.find(([, value]) => value === piece?.group)?.[0] || piece?.group;
  return (
    <div
      className={`records-page nc-wrap ${styles.page} ${styles.detail} ${redesign.detailPage}`}
      data-record-detail="true"
    >
      {back}
      <ArchiveNotice status={view} />
      <header
        className={`${styles.heading} ${redesign.detailHero}`}
        data-has-leader={leader ? "true" : undefined}
        data-has-photo={detailPhoto ? "true" : undefined}
      >
        <div className={redesign.detailHeroCopy}>
          <h1>{title}</h1>
          <p>{detailDefinition}</p>
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
          <p>
            {view.emptyReason === "ranking"
              ? "Faltan posiciones históricas de ranking para calcular esta estadística. No significa que no hubiera victorias."
              : "Prueba otro periodo, superficie o categoría."}
          </p>
          <Link href={recordsUrl({ dato: query.dato })}>
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
                rows={marathonPreview ? view.rows.slice(0, 3) : view.rows}
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
                rows={view.smallRows}
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
