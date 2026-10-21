import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { playerPhoto } from "@/lib/player-imagery";
import { number } from "@/lib/cuaderno/model";
import { recordView } from "@/lib/revista/read-records";
import { description, groupDescriptions } from "@/lib/revista/records";
import type { RecordMeta } from "@/lib/revista/snapshot";
import { Pagination } from "@/components/nocturno/Row";
import { RecordEras, RecordProof, RecordRanking, recordValue } from "@/components/nocturno/RecordsViews";
import RecordBars from "@/components/nocturno/RecordBars";
import RecordDiscovery, { type RecordDiscoveryFact } from "@/components/nocturno/RecordDiscovery";
import PlayerAvatar from "@/components/PlayerAvatar";
import FilterForm from "@/components/revista/FilterForm";
import { TOURNAMENTS } from "@/lib/types";
import { tournamentName } from "@/lib/labels";
import { SURFACES, surfaceLabel } from "@/lib/surface";
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

const metricSurface = (id: string, selected?: string) =>
  selected && selected !== "all" ? selected : SURFACES.find((surface) => id.endsWith(`-${surface.toLowerCase()}`));

function discoveryFacts(catalog: RecordMeta[]): RecordDiscoveryFact[] {
  const statements: Record<string, (piece: RecordMeta) => string> = {
    "remontada-dos-sets": () => "remontadas después de perder los dos primeros sets.",
    "titulos-torneo": (piece) => `títulos en ${piece.leader!.detail}.`,
    "titulos-hard": () => "títulos sobre pista dura.",
    "titulos-clay": () => "títulos sobre tierra batida.",
    "titulos-grass": () => "títulos sobre hierba.",
    "victorias-temporada": (piece) => `victorias en la temporada ${piece.leader!.detail}.`,
    "top-10": () => "victorias ante un rival del top 10 el día del partido.",
    "mas-largos": () => "en el partido más largo con duración publicada.",
    "30-30": () => "de juegos ganados tras ganar el punto de 30–30.",
    "holds": () => "de juegos de saque conservados.",
    "porcentaje-cinco-sets": () => "de victorias en partidos a cinco sets.",
  };
  return Object.entries(statements).flatMap(([id, statement]) => {
    const piece = catalog.find((entry) => entry.id === id);
    const leader = piece?.leader;
    const photo = leader ? playerPhoto(leader.photoName || leader.name) : null;
    if (!piece || !leader || !photo) return [];
    return [{ id, name: leader.name, value: recordValue(leader, piece.percent), statement: statement(piece),
      context: id === "mas-largos" ? `${leader.detail} · Entre ${number(piece.sample)} partidos con duración.`
        : piece.percent ? leader.detail
        : id === "top-10" ? `${number(leader.sample)} partidos con ranking aplicable.`
        : piece.definition,
      scope: `Archivo observado: ${piece.years || "periodo sin precisar"}.`,
      href: address({ dato: id }), proofHref: leader.proof ? `/match/${leader.proof.match_id}` : undefined,
      surface: metricSurface(id), photo,
    }];
  });
}

function CatalogueEntry({ piece }: { piece: RecordMeta }) {
  return (
    <Link className="rv-catalogue-row" href={address({ dato: piece.id })} data-record-surface={metricSurface(piece.id)}>
      <span className="rv-catalogue-name">{piece.title}</span>
      <span className="rv-catalogue-leader">{piece.leader?.href.startsWith("/players/") && <PlayerAvatar name={piece.leader.name} size={32} />}<span>{piece.leader?.name || "Muestras pequeñas"}</span></span>
      <span className="rv-catalogue-result"><strong className="rv-catalogue-value">{piece.leader ? recordValue(piece.leader, piece.percent, piece.id === "tal-dia-como-hoy") : "—"}</strong>
        {piece.percent && piece.leader && <small>{number(piece.leader.sample)} casos</small>}</span>
    </Link>
  );
}

function RecordIndex({ manifest }: {
  manifest: Awaited<ReturnType<typeof recordView>>["manifest"];
}) {
  const catalog = manifest.pieces;
  const surfaceRecords = ["hard", "clay", "grass"].flatMap((surface) => {
    const piece = catalog.find((entry) => entry.id === `titulos-${surface}`);
    return piece?.leader ? [{ ...piece, surface, leader: piece.leader }] : [];
  });
  const surfaceMaximum = Math.max(1, ...surfaceRecords.map((piece) => piece.leader.value));
  return (
    <div className="nc-wrap rv-records rv-index">
      <header className="rv-intro">
        <div>
          <h1>Récords y estadísticas</h1>
        </div>
        <span>{number(catalog.length)} estadísticas · {number(manifest.matchCount)} partidos</span>
      </header>
      <RecordDiscovery facts={discoveryFacts(catalog)} />
      {surfaceRecords.length > 0 && <section className="rd-surfaces" aria-labelledby="rd-surfaces-title">
        <div className="rd-surfaces-heading"><h2 id="rd-surfaces-title">El récord de títulos en cada pista</h2><span>En este archivo · una escala común</span></div>
        <div className="rd-surface-records">
          {surfaceRecords.map((piece) => <Link href={address({ dato: piece.id })} className="rd-surface-record" data-record-surface={piece.surface} key={piece.id}>
            <span className="rd-surface-label">{surfaceLabel[piece.surface as keyof typeof surfaceLabel]}</span>
            <span className="rd-surface-person"><PlayerAvatar name={piece.leader.name} size={40} /><span>{piece.leader.name}</span><strong>{recordValue(piece.leader)}</strong></span>
            <span className="rd-surface-track" aria-hidden="true"><span style={{ width: `${piece.leader.value / surfaceMaximum * 100}%` }} /></span>
            <small>{piece.years} · Ver clasificación <ArrowUpRight size={13} aria-hidden="true" /></small>
          </Link>)}
        </div>
      </section>}
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
              <div className="rd-catalogue-columns" aria-hidden="true"><span>Estadística</span><span>{group === "Un torneo" ? "Cobertura" : "Primera entrada"}</span><span>{group === "Un torneo" ? "Explorar" : "Cifra"}</span></div>
              {entries.map((piece) => <CatalogueEntry piece={piece} key={piece.id} />)}
              {group === "Títulos y finales" && manifest.eraCuts.map((cut) => (
                <Link className="rv-catalogue-row" href={address({ dato: "dos-epocas", corte: String(cut) })} key={cut}>
                  <span className="rv-catalogue-name">Efectividad en finales · antes y desde {cut}</span>
                  <span className="rv-catalogue-leader">Mínimo 5 finales por época</span>
                  <span className="rv-catalogue-action">Comparar <ArrowUpRight size={15} aria-hidden="true" /></span>
                </Link>
              ))}
              {group === "Un torneo" && TOURNAMENTS.map((tournament) => (
                <Link className="rv-catalogue-row" href={`/torneos/${tournament.slug}`} data-event-surface={tournament.surface} data-event-category={tournament.category} key={tournament.slug}>
                  <span className="rv-catalogue-name">{tournamentName(tournament.name)}</span>
                  <span className="rv-catalogue-leader">{tournament.category === "Grand Slam" ? "Grand Slam" : "Masters desde 1990"}</span>
                  <span className="rv-catalogue-action">Ver torneo <ArrowUpRight size={15} aria-hidden="true" /></span>
                </Link>
              ))}
              {group === "Un torneo" && <Link className="rv-catalogue-row" href="/tournaments">
                <span className="rv-catalogue-name">Todos los torneos ATP 500 y ATP 250</span>
                <span className="rv-catalogue-leader">Ediciones registradas desde 2023</span>
                <span className="rv-catalogue-action">Ver torneos <ArrowUpRight size={15} aria-hidden="true" /></span>
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
    const view = await recordView(JSON.stringify(q));
    return <><ArchiveNotice status={view} /><RecordIndex manifest={view.manifest} /></>;
  }
  const view = await recordView(JSON.stringify(q));
  if (q.dato === "dos-epocas") {
    const cutoff = view.manifest.eraCuts.includes(Number(q.corte)) ? Number(q.corte) : 2020;
    return <div className="nc-wrap rv-records rv-detail" data-record-surface={metricSurface(q.dato || "", q.surface)} data-event-surface={q.surface && q.surface !== "all" ? q.surface : undefined} data-event-category={q.competition && q.competition !== "all" ? q.competition : undefined}>
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
  return <div className="nc-wrap rv-records rv-detail" data-record-surface={metricSurface(q.dato || "", q.surface)} data-event-surface={q.surface && q.surface !== "all" ? q.surface : undefined} data-event-category={q.competition && q.competition !== "all" ? q.competition : undefined}>
    <Link className="rv-back" href="/records">Estadísticas</Link>
    <ArchiveNotice status={view} />
    <header className="rv-detail-header"><h1>{piece.title}</h1><p>{piece.definition}</p>
      <Link className="stats-data-link" href={'/cobertura?'+new URLSearchParams(Object.entries({...q,dato:piece.id}).filter(([,value])=>value) as [string,string][])}>Sobre los datos</Link></header>
    {leader && <section className="rv-lead" aria-label="Líder de esta estadística">
      <div>
        <p className="rv-lead-value">{recordValue(leader, piece.percent, asYear)}</p>
        <h2><Link href={leader.href}>{leader.name}</Link></h2>
        <p className="rv-lead-detail">{leader.detail}{piece.percent ? ` · ${number(leader.sample)} casos` : ""}</p>
        {!asYear && runner && delta !== null && <p className="rv-runner">{delta !== 0
          ? `${piece.percent ? `${number(Math.abs(delta), 1)} puntos porcentuales` : number(Math.abs(delta))} ${delta > 0 ? "más" : "menos"} que ${runner.name} (${recordValue(runner, piece.percent)}).`
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
  </div>;
}
