import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { playerPhoto } from "@/lib/player-imagery";
import { number } from "@/lib/cuaderno/model";
import { recordView } from "@/lib/revista/read-records";
import { description, groupDescriptions } from "@/lib/revista/records";
import type { RecordMeta } from "@/lib/revista/snapshot";
import { Pagination } from "@/components/nocturno/Row";
import { RecordEras, RecordProof, RecordRanking, recordValue } from "@/components/nocturno/RecordsViews";
import RecordBars from "@/components/nocturno/RecordBars";
import FilterForm from "@/components/revista/FilterForm";
import { TOURNAMENTS } from "@/lib/types";
import { tournamentName } from "@/lib/labels";
import { SURFACES, surfaceLabel } from "@/lib/surface";
import "../rally-records.css";
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';

type Query = Record<string, string | undefined>;
const address = (q: Query) =>
  "/records" +
  (Object.values(q).some(Boolean)
    ? "?" + new URLSearchParams(Object.entries(q).filter(
        ([key, value]) => value && value !== "all" && !(key === "page" && value === "1"),
      ) as [string, string][])
    : "");

const families = [
  ["Títulos y finales", "Títulos y finales"],
  ["Victorias", "Victorias"],
  ["Remontadas", "Remontadas y forma del partido"],
  ["Presión", "Presión"],
  ["Tiempo y edad", "Tiempo, edad y calendario"],
  ["Por torneo", "Un torneo"],
  ["Parejas", "Parejas"],
  ["Medidas", "Medidas de partido"],
] as const;

function CatalogueEntry({ piece }: { piece: RecordMeta }) {
  return (
    <Link className="rv-catalogue-row" href={address({ dato: piece.id })}>
      <span className="rv-catalogue-name">{piece.title}</span>
      <span className="rv-catalogue-leader">{piece.leader?.name || "Muestras pequeñas"}</span>
      <strong className="rv-catalogue-value">{piece.leader ? recordValue(piece.leader, piece.percent, piece.id === "tal-dia-como-hoy") : "—"}</strong>
    </Link>
  );
}

function RecordIndex({ manifest, comebackRunner }: {
  manifest: Awaited<ReturnType<typeof recordView>>["manifest"];
  comebackRunner?: Awaited<ReturnType<typeof recordView>>["rows"][number];
}) {
  const catalog = manifest.pieces;
  const comeback = catalog.find((piece) => piece.id === "remontada-dos-sets");
  const longest = catalog.find((piece) => piece.id === "mas-largos");
  const topTen = catalog.find((piece) => piece.id === "top-10");
  const leader = comeback?.leader;
  const portrait = leader ? playerPhoto(leader.name) : null;
  return (
    <div className="nc-wrap rv-records rv-index">
      <header className="rv-intro">
        <div>
          <h1>Récords y estadísticas</h1>
        </div>
        <span>{number(catalog.length)} estadísticas · {number(manifest.matchCount)} partidos</span>
      </header>
      {comeback && leader && (
        <section className="rv-feature" aria-labelledby="rv-feature-title">
          <div className="rv-feature-copy">
            <p className="rv-feature-scope">Remontadas tras perder dos sets · {comeback.years}</p>
            <h2 id="rv-feature-title"><Link href={address({ dato: comeback.id })}>
              <strong>{leader.name}</strong> ganó <em>{number(leader.value)}</em> partidos después de perder los dos primeros sets.
            </Link></h2>
            <p className="rv-feature-context">
              {comebackRunner && <>Le sigue {comebackRunner.name}, con {number(comebackRunner.value)}. </>}
              Solo resultados completos de este archivo.
            </p>
            <div className="rv-feature-actions">
              <Link href={address({ dato: comeback.id })}>Ver la clasificación</Link>
              {leader.proof && <Link href={`/match/${leader.proof.match_id}`}>Abrir una remontada</Link>}
            </div>
          </div>
          {portrait && <div className="rv-feature-photo">
            <Image src={portrait.src} alt={`Retrato de ${leader.name}`} fill
              sizes="(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 40vw, 500px" priority />
          </div>}
        </section>
      )}
      <section className="rv-discoveries" aria-label="Dos cifras del archivo">
        {longest?.leader && <div className="rv-discovery rv-discovery-time">
          <span>El partido más largo con minutos publicados</span>
          <strong>{recordValue(longest.leader, longest.percent)}</strong>
          <p>{longest.leader.name} · {longest.leader.detail.split(" · ").slice(0, 2).join(" · ")}</p>
          <small>Entre {number(longest.sample)} partidos con duración.</small>
          <Link href={longest.leader.href}>Leer el partido</Link>
        </div>}
        {topTen?.leader && <div className="rv-discovery rv-discovery-opposition">
          <span>Ante rivales del top 10 el día del partido</span>
          <strong>{recordValue(topTen.leader, topTen.percent)} victorias</strong>
          <p>{topTen.leader.name}</p>
          <small>{topTen.years} · {number(topTen.leader.sample)} encuentros con ranking de entonces.</small>
          <Link href={address({ dato: topTen.id })}>Ver clasificación</Link>
        </div>}
      </section>
      <div className="rv-index-heading">
        <h2>Todas las estadísticas</h2>
      </div>
      <nav className="rv-family-nav" aria-label="Familias de estadísticas">
        {families.map(([label], index) => <a href={`#grupo-${index}`} key={label}>{label}</a>)}
      </nav>
      <div className="rv-families">
        {families.map(([label, group], index) => {
          const entries = catalog.filter((piece) => piece.group === group);
          if (!entries.length && group !== "Un torneo") return null;
          const content = <>
            <div className="rv-family-heading">
              <h3>{label}</h3><p>{groupDescriptions[group]}</p>
              <span>{group === "Un torneo" ? "Ediciones y torneos" : `${entries.length} listas`}</span>
            </div>
            <div className="rv-family-rows">
              {entries.map((piece) => <CatalogueEntry piece={piece} key={piece.id} />)}
              {group === "Títulos y finales" && manifest.eraCuts.map((cut) => (
                <Link className="rv-catalogue-row" href={address({ dato: "dos-epocas", corte: String(cut) })} key={cut}>
                  <span className="rv-catalogue-name">Efectividad en finales · antes y desde {cut}</span>
                  <span className="rv-catalogue-leader">Mínimo 5 finales por época</span>
                </Link>
              ))}
              {group === "Un torneo" && TOURNAMENTS.map((tournament) => (
                <Link className="rv-catalogue-row" href={`/torneos/${tournament.slug}`} data-event-surface={tournament.surface} data-event-category={tournament.category} key={tournament.slug}>
                  <span className="rv-catalogue-name">{tournamentName(tournament.name)}</span>
                  <span className="rv-catalogue-leader">{tournament.category === "Grand Slam" ? "Grand Slam" : "Masters desde 1990"}</span>
                </Link>
              ))}
              {group === "Un torneo" && <Link className="rv-catalogue-row" href="/tournaments">
                <span className="rv-catalogue-name">Todos los torneos ATP 500 y ATP 250</span>
                <span className="rv-catalogue-leader">Ediciones registradas desde 2023</span>
              </Link>}
            </div>
          </>;
          return group === "Medidas de partido" ? (
            <details className="rv-family" id={`grupo-${index}`} key={group}>
              <summary>Medidas de partido · {entries.length} listas</summary>{content}
            </details>
          ) : <section className="rv-family" id={`grupo-${index}`} key={group}>{content}</section>;
        })}
      </div>
      <p className="rv-update">Archivo actualizado el {new Date(manifest.generatedAt).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}.</p>
    </div>
  );
}

function RecordFilters({ piece, q, years }: { piece: Pick<RecordMeta, 'id'>; q: Query; years: number[] }) {
  const active = [q.year, q.surface, q.competition].some((value) => value && value !== "all");
  return <div className="rv-filter-wrap">
    <FilterForm action="/records">
      <input type="hidden" name="dato" value={piece.id} />
      <label className="nc-field"><span>Temporada</span><select name="year" defaultValue={q.year || "all"}>
        <option value="all">Todo el archivo</option>
        <optgroup label="Últimas temporadas">{years.slice(0, 8).map(year => <option key={year}>{year}</option>)}</optgroup>
        <optgroup label="Archivo anterior">{years.slice(8).map(year => <option key={year}>{year}</option>)}</optgroup>
      </select></label>
      <label className="nc-field"><span>Superficie</span><select name="surface" defaultValue={q.surface || "all"}>
        <option value="all">Todas las pistas</option>{SURFACES.map(surface => <option key={surface} value={surface}>{surfaceLabel[surface]}</option>)}
      </select></label>
      <label className="nc-field"><span>Competición</span><select name="competition" defaultValue={q.competition || "all"}>
        <option value="all">Todas</option><option>Grand Slam</option><option>Masters 1000</option><option>ATP 500</option><option>ATP 250</option><option>Precursores de Masters</option><option>ATP Tour · nivel no especificado</option>
      </select></label>
    </FilterForm>
    {active && <Link href={address({ dato: piece.id })}>Limpiar filtros</Link>}
  </div>;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams;
  const view = await recordView(JSON.stringify(q));
  const piece = view.piece || view.manifest.pieces.find((entry) => entry.id === q.dato);
  const title = q.dato === "dos-epocas" ? "Efectividad en finales: dos épocas" : piece?.title || "Estadísticas del archivo";
  return { title: `${title} — DEUCE`, description: piece?.definition || description,
    alternates: { canonical: address(q) }, openGraph: { title: `${title} — DEUCE`, description: piece?.definition || description } };
}

export default async function Records({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams;
  if (!q.dato) {
    const [view, comeback] = await Promise.all([
      recordView(JSON.stringify(q)),
      recordView(JSON.stringify({ dato: "remontada-dos-sets" })),
    ]);
    return <><ArchiveNotice status={view} /><RecordIndex manifest={view.manifest} comebackRunner={comeback.rows[1]} /></>;
  }
  const view = await recordView(JSON.stringify(q));
  if (q.dato === "dos-epocas") {
    const cutoff = view.manifest.eraCuts.includes(Number(q.corte)) ? Number(q.corte) : 2020;
    return <div className="nc-wrap rv-records rv-detail" data-event-surface={q.surface && q.surface !== "all" ? q.surface : undefined} data-event-category={q.competition && q.competition !== "all" ? q.competition : undefined}>
      <Link className="rv-back" href="/records">Estadísticas</Link>
      <ArchiveNotice status={view} />
      <header className="rv-detail-header"><h1>Efectividad en finales, antes y después de {cutoff}</h1>
        <p>Cada tramo incluye al menos cinco finales de este archivo. Los porcentajes muestran su división.</p></header>
      <div className="rv-filter-wrap rv-cut-filter"><FilterForm action="/records">
        <input type="hidden" name="dato" value="dos-epocas" />
        <label className="nc-field"><span>Separar épocas en</span><select name="corte" defaultValue={cutoff}>
          {view.manifest.eraCuts.map((year) => <option key={year}>{year}</option>)}
        </select></label>
      </FilterForm></div>
      {view.eras.length ? <RecordEras eras={view.eras} cut={cutoff} /> : <p className="rv-empty">Ningún jugador llega a cinco finales en los dos periodos. <Link href="/records">Ver otras cifras</Link></p>}
      {view.eraTotal > 25 && <Pagination page={view.page} total={view.eraTotal} href={(page) => address({ ...q, page: String(page) })} />}
    </div>;
  }
  const piece = view.piece;
  if (!piece) {
    if (!view.exists) notFound();
    return <div className="nc-wrap rv-records rv-detail">
      <Link className="rv-back" href="/records">Estadísticas</Link><h1>{view.manifest.pieces.find(entry => entry.id === q.dato)?.title || 'Estadísticas'}</h1>
      <ArchiveNotice status={view} />
      <RecordFilters piece={{ id: q.dato }} q={q} years={view.manifest.years} />
      <p role="status">{view.emptyReason === 'ranking' ? 'No tenemos ranking histórico al jugar para los partidos de esta selección. Esto no significa que no hubiera victorias ante rivales con ese ranking.' : 'No hay resultados con estos filtros o faltan datos para calcular esta medida.'}</p>
      <p><Link href="/cobertura">Consultar la cobertura del archivo</Link></p>
      <p className="rv-empty">Prueba otro periodo, superficie o competición. <Link href={address({ dato: q.dato })}>Limpiar filtros</Link></p>
    </div>;
  }
  const leader = piece.leader;
  const runner = view.page === 1 ? view.rows[1] : undefined;
  const delta = leader && runner ? leader.value - runner.value : null;
  const asYear = piece.id === "tal-dia-como-hoy";
  return <div className="nc-wrap rv-records rv-detail" data-event-surface={q.surface && q.surface !== "all" ? q.surface : undefined} data-event-category={q.competition && q.competition !== "all" ? q.competition : undefined}>
    <Link className="rv-back" href="/records">Estadísticas</Link>
    <ArchiveNotice status={view} />
    <header className="rv-detail-header"><h1>{piece.title}</h1><p>{piece.definition}</p>
      <div className="rv-scope"><span>{piece.years || "Periodo seleccionado"}</span>
        <span>{number(piece.sample)} partidos {piece.measured ? "con dato publicado" : "considerados"}</span>
        <span>Mínimo para entrar: {number(piece.minimum)} {piece.minimum === 1 ? "caso" : "casos"}</span>
      </div></header>
    {leader && <section className="rv-lead" aria-label="Líder de esta estadística">
      <div><span className="rv-lead-label">{asYear ? "Un partido de esta fecha" : "Primero en este archivo"}</span>
        <p className="rv-lead-value">{recordValue(leader, piece.percent, asYear)}</p>
        <h2><Link href={leader.href}>{leader.name}</Link></h2>
        <p className="rv-lead-detail">{leader.detail}{piece.percent ? ` · ${number(leader.sample)} casos` : ""}</p>
        {!asYear && runner && delta !== null && <p className="rv-runner">{delta > 0
          ? `${piece.percent ? `${number(delta, 1)} puntos porcentuales` : number(delta)} más que ${runner.name} (${recordValue(runner, piece.percent)}).`
          : `Empatado con ${runner.name} (${recordValue(runner, piece.percent)}).`}</p>}
      </div><RecordProof row={leader} />
    </section>}
    <RecordFilters piece={piece} q={q} years={view.manifest.years} />
    {view.page === 1 && !asYear && <RecordBars rows={view.rows} id={piece.id} percent={piece.percent} filters={q} />}
    <section className="rv-list-section"><div className="rv-list-heading"><h2>Clasificación</h2>
      <span>{number(piece.total)} {piece.total === 1 ? "entrada" : "entradas"} · página {number(view.page)} de {number(Math.max(1, Math.ceil(piece.total / 25)))}</span></div>
      {view.rows.length ? <RecordRanking evidence={{id:piece.id,filters:q}} rows={view.rows} percent={piece.percent} asYear={asYear} offset={(view.page - 1) * 25} priorValue={piece.pagePrior?.[view.page]} />
        : piece.smallTotal ? <p className="rv-list-note">Las observaciones de esta cifra están en Muestras pequeñas, más abajo.</p>
        : <p className="rv-list-note">Ningún partido coincide con esta selección. Cambia los filtros para ampliar la consulta.</p>}
      {piece.total > 25 && <Pagination page={view.page} total={piece.total} href={(page) => address({ ...q, page: String(page) })} />}
    </section>
    {piece.smallTotal > 0 && <section className="rv-small-section"><div className="rv-list-heading"><h2>Muestras pequeñas</h2><span>{number(piece.smallTotal)} entradas</span></div>
      <p>Porcentajes basados en menos de 50 casos. Se leen con su denominador.</p>
      <RecordRanking evidence={{id:piece.id,filters:q}} rows={view.smallRows} percent small offset={(view.smallPage - 1) * 25} priorValue={piece.smallPagePrior?.[view.smallPage]} />
      {piece.smallTotal > 25 && <Pagination page={view.smallPage} total={piece.smallTotal} href={(page) => address({ ...q, smallPage: String(page) })} />}
    </section>}
    <p className="rv-update">Archivo actualizado el {new Date(view.manifest.generatedAt).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}. <Link href="/records">Todas las estadísticas</Link></p>
  </div>;
}
