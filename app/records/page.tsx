import Image from "next/image";
import type { CSSProperties } from "react";
import { ArchivePage } from "@/components/deuce/ArchivePage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { recordView } from "@/lib/revista/read-records";
import { RecordEras, recordValue } from "@/components/nocturno/RecordsViews";
import { recordFilters, recordsUrl, type RecordQuery } from "@/lib/records-url";
import { evidenceHref } from "@/lib/record-evidence";
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import RecordsControls from "@/components/RecordsControls";
import RecordsTable, { RecordsPagination } from "@/components/RecordsTable";
import styles from "./records.module.css";
import type { RecordMeta } from "@/lib/revista/snapshot";
import redesign from "./records-redesign.module.css";
import { recordPhoto } from "@/lib/editorial-imagery";
import { playerEditionPhoto, playerPhoto } from "@/lib/player-imagery";
import type { Photo } from "@/lib/imagery";
import RecordsRoom, { type RoomPiece } from "@/components/records/RecordsRoom";
import RecordsBoard, { type BoardReading } from "@/components/records/RecordsBoard";
import indexStyles from "./records-index.module.css";

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
  void manifest;
  const filters = recordFilters(query);
  const readingId = ["victorias", "finales-ganadas", "efectividad-top-10", "rachas"].includes(query.lectura || "")
    ? query.lectura!
    : "victorias";
  const mode = ["leyendas", "anomalias", "punto"].includes(query.modo || "") ? query.modo! : "leyendas";
  const roomIds = ["mas-juegos", "mas-largos", "victorias", "efectividad-hard", "efectividad-clay", "efectividad-grass"];
  const boardIds = ["victorias", "finales-ganadas", "efectividad-top-10", "rachas"];
  const [base, roomViews, boardViews] = await Promise.all([
    recordView("{}"),
    Promise.all(roomIds.map((dato) => recordView(JSON.stringify({ dato })))),
    Promise.all(boardIds.map((dato) => recordView(JSON.stringify({ ...filters, dato, ...(dato === "efectividad-top-10" ? { min: "80" } : {}) })) )),
  ]);
  const baseById = new Map(base.manifest.pieces.map((piece) => [piece.id, piece] as const));
  const roomById = new Map(roomViews.flatMap((view) => view.piece ? [[view.piece.id, view] as const] : []));
  const formatPiece = (piece?: RecordMeta, row = piece?.leader) => row ? recordValue(row, piece?.percent, piece?.id === "tal-dia-como-hoy") : "—";
  const games = roomById.get("mas-juegos");
  const duration = roomById.get("mas-largos");
  const wins = roomById.get("victorias");
  const surfaceDefs = [
    ["Dura", "efectividad-hard", "/images/courts/us-open-1440.webp", "Pista dura del Abierto de Estados Unidos"],
    ["Tierra", "efectividad-clay", "/images/courts/roland-garros-1440.webp", "Pista de tierra batida de Roland Garros"],
    ["Hierba", "efectividad-grass", "/images/courts/wimbledon-1440.webp", "Pista de hierba de Wimbledon"],
  ] as const;
  const winGap = wins?.rows[0] && wins.rows[1] ? wins.rows[0].value - wins.rows[1].value : 0;
  const isnerImage = { src: "/images/editorial/records/isner-mahut-2010.webp", alt: "John Isner y Nicolas Mahut junto al marcador de 70 a 68 de Wimbledon 2010", objectPosition: "50% 50%" };
  const roomPieces: RoomPiece[] = [
    { id: "games", metric: formatPiece(games?.piece, games?.rows[0]), title: "John Isner–Nicolas Mahut", phrase: "La suma de los juegos de sus cinco sets.", sample: games?.rows[0]?.detail || "Wimbledon 2010 · 70–68", chips: ["un partido", "22 jun 2010", "hierba"], image: isnerImage, href: recordsUrl({}, { dato: "mas-juegos" }), matchHref: games?.rows[0]?.href, video: true },
    { id: "duration", metric: formatPiece(duration?.piece, duration?.rows[0]), title: "El partido más largo del archivo", phrase: "La misma historia, leída por el reloj.", sample: duration?.rows[0]?.detail || "Un partido documentado", chips: ["Wimbledon 2010", "cinco sets"], image: isnerImage, href: recordsUrl({}, { dato: "mas-largos" }), matchHref: duration?.rows[0]?.href },
    { id: "wins", metric: formatPiece(wins?.piece, wins?.rows[0]), title: wins?.rows[0]?.name || "Jimmy Connors", phrase: winGap ? `+${new Intl.NumberFormat("es-ES").format(winGap)} sobre ${wins?.rows[1]?.name}.` : "El mayor volumen de victorias del archivo.", sample: wins?.rows[0]?.detail || "Partidos en el archivo", chips: ["Era abierta", "Este archivo, no el palmarés oficial."], image: { src: "/images/players/editorial/jimmy-connors-action.webp", alt: "Jimmy Connors durante un partido", objectPosition: "52% 24%" }, href: recordsUrl({}, { dato: "victorias" }) },
    { id: "surfaces", metric: "3 pistas", title: "Cada pista cambia el juego", phrase: "La tasa se lee siempre con su muestra.", sample: "Resultados completos; abandonos fuera del porcentaje.", chips: ["dura", "tierra", "hierba"], href: recordsUrl({}, { dato: "efectividad-clay" }), surfaces: surfaceDefs.flatMap(([label, id, src, alt]) => { const view = roomById.get(id); return view?.rows[0] ? [{ label, value: formatPiece(view.piece, view.rows[0]), name: view.rows[0].name, sample: view.rows[0].detail, image: { src, alt } }] : []; }) },
    { id: "pair", metric: "52 y 28", title: "Novak Djokovic–Rafael Nadal", phrase: "El cruce con más partidos y más finales en este archivo.", sample: "52 partidos y 28 finales documentados en este archivo.", chips: ["52 partidos", "28 finales"], pairImages: [{ src: "/images/players/novak-djokovic.jpg", alt: "Novak Djokovic", objectPosition: "50% 20%" }, { src: "/images/players/optimized/rafael-nadal-2022.webp", alt: "Rafael Nadal", objectPosition: "50% 18%" }], href: recordsUrl({}, { dato: "parejas" }) },
  ];

  const boardLabels: Record<string, { label: string; title: string; minimum?: string }> = {
    victorias: { label: "Victorias", title: "Victorias en el archivo" },
    "finales-ganadas": { label: "Finales", title: "Finales ganadas" },
    "efectividad-top-10": { label: "% ante el top 10", title: "% ante el top 10", minimum: "Desde 80 partidos con ranking del rival ese día." },
    rachas: { label: "Rachas", title: "Rachas de victorias" },
  };
  const readings = boardViews.map((view, index): BoardReading => {
    const id = boardIds[index];
    const meta = view.piece || baseById.get(id);
    const rows = view.rows.map((row) => ({ name: row.name, playerHref: row.href, recordHref: recordsUrl(filters, { dato: id, ...(id === "efectividad-top-10" ? { min: "80" } : {}) }), value: row.value, display: recordValue(row, meta?.percent, false), detail: row.detail }));
    const leadPhoto = rows[0] ? portraitFor(rows[0].name) : null;
    return { id, label: boardLabels[id].label, title: boardLabels[id].title, definition: meta?.definition || "", minimum: boardLabels[id].minimum, percent: meta?.percent, rows, photo: leadPhoto ? { src: leadPhoto.src, alt: leadPhoto.alt, objectPosition: leadPhoto.objectPosition } : undefined };
  });
  const activeReading = readings.find((reading) => reading.id === readingId) || readings[0];
  const clearCuts = { year: undefined, surface: undefined, competition: undefined, era: undefined };
  const cutLinks = [
    { label: "Todas", href: recordsUrl(query, clearCuts), active: !query.year && !query.surface && !query.competition && !query.era },
    ...[["Dura", "hard"], ["Tierra", "clay"], ["Hierba", "grass"]].map(([label, value]) => ({ label, href: recordsUrl(query, { ...clearCuts, surface: value }), active: query.surface === value && !query.year && !query.competition && !query.era })),
    { label: "Grand Slam", href: recordsUrl(query, { ...clearCuts, competition: "Grand Slam" }), active: query.competition === "Grand Slam" && !query.year },
    { label: "Últimos 20 años", href: recordsUrl(query, { ...clearCuts, era: "last20" }), active: query.era === "last20" },
    { label: "Esta temporada", href: recordsUrl(query, { ...clearCuts, year: String(base.manifest.years[0] || new Date().getFullYear()) }), active: query.year === String(base.manifest.years[0]) },
  ];

  const archiveDefinitions: Record<string, Array<{ name: string; note: string; ids: string[] }>> = {
    leyendas: [
      { name: "Carrera", note: "Volumen y muestra grande.", ids: ["victorias", "top-10", "top-5", "finales-ganadas", "rachas", "numero-uno"] },
      { name: "Superficies", note: "Victorias y títulos por pista.", ids: ["victorias-hard", "victorias-clay", "victorias-grass", "titulos-hard", "titulos-clay", "titulos-grass"] },
    ],
    anomalias: [
      { name: "Una tarde", note: "Un partido que rompe la escala.", ids: ["mas-juegos", "mas-largos", "remontar-rosco", "remontada-dos-sets", "efectividad-finales"] },
      { name: "Edad", note: "El calendario también deja extremos.", ids: ["finalistas-jovenes", "finalistas-veteranos", "diferencia-edad"] },
    ],
    punto: [
      { name: "Volumen", note: "Solo partidos con la medida publicada.", ids: ["aces", "total-points", "winners", "breaks-convertidos", "breaks-salvados"] },
      { name: "Tasa", note: "Mínimo 50 partidos con la estadística publicada.", ids: ["first-in", "first-won", "second-won", "service-won", "return-won", "holds", "return-games", "breaks-salvados", "30-30"] },
    ],
  };
  const validPiece = (piece?: RecordMeta) => Boolean(piece?.leader && piece.leader.value > 1 && !/sin muestra/i.test(`${piece.title} ${piece.leader.name}`));
  const archiveGroups = archiveDefinitions[mode].map((group) => ({ ...group, pieces: group.ids.map((id) => baseById.get(id)).filter((piece): piece is RecordMeta => validPiece(piece)) })).filter((group) => group.pieces.length);
  const featureId = mode === "leyendas" ? "victorias" : mode === "anomalias" ? "mas-juegos" : "winners";
  const feature = baseById.get(featureId);
  const featurePhoto = mode === "leyendas" ? { src: "/images/players/editorial/jimmy-connors-action.webp", alt: "Jimmy Connors durante un partido", objectPosition: "52% 24%" } : mode === "anomalias" ? isnerImage : photoFor(feature);
  const coveragePieces = ["atp-500-victorias", "atp-500-titulos", "atp-500-finales", "atp-250-victorias", "atp-250-titulos", "atp-250-finales"].map((id) => baseById.get(id)).filter((piece): piece is RecordMeta => validPiece(piece));
  return (
    <ArchivePage
      title="Récords"
      className={`records-page ${redesign.page} ${indexStyles.page}`}
    >
      <p className={indexStyles.scope}>Era abierta, cuadro principal masculino, solo lo que este archivo puede demostrar.</p>
      <section className={indexStyles.layer} aria-labelledby="records-room-heading"><header className={indexStyles.layerIntro}><div><span>01 · Sala</span><h2 id="records-room-heading">Cinco pruebas</h2></div><p>Lo extraordinario, sin separar la cifra de su alcance ni de la muestra que la sostiene.</p></header><RecordsRoom pieces={roomPieces} /></section>
      <section className={indexStyles.layer} aria-labelledby="records-board-heading"><header className={indexStyles.layerIntro}><div><span>02 · Tablero</span><h2 id="records-board-heading">Quién lidera</h2></div><p>Una clasificación, dos decisiones: qué se mide y dónde se corta.</p></header><RecordsBoard key={`${activeReading.id}-${query.year || ""}-${query.surface || ""}-${query.competition || ""}-${query.era || ""}`} reading={activeReading} readings={readings.map((reading) => ({ label: reading.label, href: recordsUrl(query, { lectura: reading.id }), active: reading.id === activeReading.id }))} cuts={cutLinks} years={base.manifest.years} selectedYear={query.year} seasonHref={recordsUrl(query, { year: undefined })} /></section>
      <section className={indexStyles.layer} aria-labelledby="records-archive-heading"><header className={indexStyles.layerIntro}><div><span>03 · Archivo</span><h2 id="records-archive-heading">Dónde está el dato</h2></div><p>Tres formas de entrar. Las muestras pequeñas no compiten con las carreras completas.</p></header><nav className={indexStyles.archiveTabs} aria-label="Modo del archivo">{[["leyendas", "Leyendas"], ["anomalias", "Anomalías"], ["punto", "El punto"]].map(([id, label]) => <Link key={id} href={recordsUrl(query, { modo: id })} aria-current={mode === id ? "page" : undefined}>{label}</Link>)}</nav><div className={indexStyles.archiveShell}>{feature?.leader && featurePhoto && <Link className={indexStyles.archiveFeature} href={recordsUrl({}, { dato: feature.id })}><Image src={featurePhoto.src} alt={featurePhoto.alt} fill sizes="(max-width: 900px) 100vw, 38vw" style={{ objectPosition: featurePhoto.objectPosition || "50% 25%" }} /><span><small>{mode === "leyendas" ? "Una carrera" : mode === "anomalias" ? "Un partido" : "Una medida publicada"}</small><strong>{feature.leader.name}</strong><b>{formatPiece(feature)}</b></span></Link>}<div className={indexStyles.archiveGroups}>{archiveGroups.map((group) => <section className={indexStyles.archiveGroup} key={group.name}><header><h3>{group.name}</h3><span>{group.note}</span></header><div className={indexStyles.archiveRows}>{group.pieces.slice(0, 3).map((piece) => <Link key={piece.id} href={recordsUrl({}, { dato: piece.id })}><span><strong>{piece.title}</strong><small>{piece.leader!.name} · {piece.leader!.detail}</small></span><b>{formatPiece(piece)}</b></Link>)}</div>{group.pieces.length > 3 && <details className={indexStyles.more}><summary>Ver las {group.pieces.length}</summary><div className={indexStyles.moreRows}>{group.pieces.slice(3).map((piece) => <Link key={piece.id} href={recordsUrl({}, { dato: piece.id })}><span><strong>{piece.title}</strong><small>{piece.leader!.name} · {piece.leader!.detail}</small></span><b>{formatPiece(piece)}</b></Link>)}</div></details>}</section>)}</div></div></section>
      {coveragePieces.length > 0 && <section className={indexStyles.coverage} aria-labelledby="records-coverage-heading"><span>Cobertura corta</span><h2 id="records-coverage-heading">Desde que el archivo lo anota</h2><div className={indexStyles.coverageGrid}>{coveragePieces.map((piece) => <Link key={piece.id} href={recordsUrl({}, { dato: piece.id })}><span><strong>{piece.title}</strong><small>{piece.leader!.name} · {piece.leader!.detail}</small></span><b>{formatPiece(piece)}</b><em>Desde 2023.</em></Link>)}</div></section>}
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
      : piece?.title || "Récords de la Era Abierta";
  const metaDescription = piece?.definition ||
    "Era abierta, cuadro principal masculino: récords que el archivo DEUCE puede demostrar partido a partido.";
  const socialPhoto = piece?.leader
    ? recordPhoto(piece.id, piece.leader.name)?.src
    : "/images/editorial/records/isner-mahut-2010.webp";
  return {
    title: `${title} — DEUCE`,
    description: metaDescription,
    alternates: { canonical: recordsUrl(query) },
    openGraph: {
      title: `${title} — DEUCE`,
      description: metaDescription,
      images: socialPhoto ? [socialPhoto] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — DEUCE`,
      description: metaDescription,
      images: socialPhoto ? [socialPhoto] : undefined,
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
