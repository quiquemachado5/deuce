import Image from "next/image";
import Link from "next/link";
import { playerPhotos } from "@/lib/player-imagery";
import { courtPhotos, type Photo } from "@/lib/imagery";
import { homeMaterials } from "@/lib/home-photography";
import { tournamentName } from "@/lib/labels";
import { Pagination } from "@/components/nocturno/Row";

export const metadata = {
  title: "Licencias — DEUCE",
  description: "Procedencia, autores y condiciones de uso de las imágenes y recursos de DEUCE.",
  alternates: { canonical: "/licencias" },
};

type Kind = "all" | "players" | "courts";
type CreditEntry = { key: string; name: string; photo: Photo; kind: Exclude<Kind, "all"> };
const photos: CreditEntry[] = [
  ...homeMaterials.map(material => ({ key: `material-${material.surface}`, name: material.name, photo: material.photo, kind: "courts" as const })),
  ...Object.entries(courtPhotos).map(([key, photo]) => ({ key: `court-${key}`, name: tournamentName(key), photo, kind: "courts" as const })),
  ...Object.entries(playerPhotos).map(([key, photo]) => ({ key: `player-${key}`, name: key, photo, kind: "players" as const })),
].sort((a, b) => a.name.localeCompare(b.name, "es"));

const number = new Intl.NumberFormat("es-ES");
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function href(query: string, kind: Kind, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (kind !== "all") params.set("tipo", kind);
  if (page > 1) params.set("page", String(page));
  return `/licencias${params.size ? `?${params}` : ""}`;
}

export default async function Credits({ searchParams }: {
  searchParams: Promise<{ q?: string; tipo?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 80);
  const kind: Kind = params.tipo === "players" || params.tipo === "courts" ? params.tipo : "all";
  const search = normalize(query);
  const selected = photos.filter((entry) =>
    (kind === "all" || entry.kind === kind) &&
    (!search || normalize(`${entry.name} ${entry.photo.alt} ${entry.photo.credit} ${entry.photo.caption || ""}`).includes(search)),
  );
  const pages = Math.max(1, Math.ceil(selected.length / 25));
  const requested = Number(params.page);
  const page = Math.max(1, Math.min(pages, Number.isFinite(requested) ? Math.floor(requested) : 1));
  const visible = selected.slice((page - 1) * 25, page * 25);

  return (
    <div className="ry-photo-page nc-wrap">
      <header className="ry-photo-intro">
        <div>
          <h1>Licencias</h1>
          <p>Procedencia y derechos de los recursos visuales que aparecen en DEUCE.</p>
        </div>
      </header>

      <form className="ry-photo-search" action="/licencias" method="get" role="search">
        <label htmlFor="photo-query">Buscar recurso</label>
        <div className="ry-photo-search-fields">
          <input id="photo-query" name="q" type="search" defaultValue={query} placeholder="Jugador, torneo o autor" />
          {kind !== "all" && <input type="hidden" name="tipo" value={kind} />}
          <button type="submit">Buscar</button>
        </div>
      </form>

      <nav className="ry-photo-filters" aria-label="Tipo de recurso">
        {([
          ["all", "Todo"],
          ["players", "Jugadores"],
          ["courts", "Pistas y torneos"],
        ] as const).map(([value, label]) => <Link key={value} href={href(query, value, 1)} aria-current={kind === value ? "page" : undefined}>
          {label}<span>{number.format(value === "all" ? photos.length : photos.filter(entry => entry.kind === value).length)}</span>
        </Link>)}
      </nav>

      <div className="ry-photo-result-head">
        <h2>{kind === "players" ? "Jugadores" : kind === "courts" ? "Pistas y torneos" : "Archivo de imágenes"}</h2>
        <span>{number.format(selected.length)} {selected.length === 1 ? "imagen" : "imágenes"} · página {page} de {pages}</span>
      </div>

      {visible.length ? (
        <div className="ry-photo-grid">
          {visible.map(({ key, name, photo, kind: photoKind }) => (
            <figure className="ry-photo-entry" key={key}>
              <a className="ry-photo-image" href={photo.source} target="_blank" rel="noopener noreferrer" aria-label={`Fuente de la fotografía: ${name}`}>
                <Image src={photo.src} alt={photo.alt} width={380} height={280} sizes="(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 45vw, 380px" unoptimized={photoKind === "players"} />
              </a>
              <figcaption>
                <h3><a href={photo.source} target="_blank" rel="noopener noreferrer">{name}</a></h3>
                {photo.caption && <p className="ry-photo-caption">{photo.caption}</p>}
                <p className="ry-photo-credit">{photo.credit}</p>
                <p className="ry-photo-rights">{photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">Condiciones de uso ↗</a> : <span>Derechos: consultar la fuente original</span>}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="ry-photo-empty" role="status">
          <p>No hay imágenes para «{query}» con este filtro.</p>
          <Link href="/licencias">Ver todas</Link>
        </div>
      )}

      {selected.length > 25 && <Pagination page={page} total={selected.length} href={(next) => href(query, kind, next)} />}
      <section className="nc-section" id="recreaciones"><h2>Recreaciones</h2><p>Las imágenes identificadas como recreaciones con IA son ilustraciones editoriales. No documentan visualmente un punto, partido o momento histórico concreto.</p></section>
      <section className="nc-section" id="video"><h2>Vídeo de portada</h2><p>Secuencia de un partido en una pista azul al aire libre. Recurso del handoff, alojado localmente en MP4 y WebM sin audio, con fotograma de respaldo. No representa el partido destacado.</p><p><a href="https://www.pexels.com/video/35538977/" target="_blank" rel="noopener noreferrer">Pexels · vídeo 35538977</a> · <a href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">Licencia Pexels</a></p></section>
      <section className="nc-section"><h2>Tipografías</h2><p>Manrope, DM Sans y Newsreader. Distribuidas por Google Fonts, alojadas localmente por Next.js.</p></section>
      <section className="nc-section"><h2>Banderas</h2><p>Los SVG de países proceden de flag-icons (lipis), bajo licencia MIT. <a className="nc-link" href="/images/flags/LICENSE.txt">Licencia</a> · <a className="nc-link" href="/images/flags/SOURCE.txt">Procedencia</a></p></section>
      <p className="ry-photo-endnote"><Link href="/info">Cómo se lee DEUCE</Link></p>
    </div>
  );
}
