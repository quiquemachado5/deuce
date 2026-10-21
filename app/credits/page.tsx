import Image from "next/image";
import Link from "next/link";
import { playerPhotos } from "@/lib/player-imagery";
import { courtPhotos, type Photo } from "@/lib/imagery";
import { tournamentName } from "@/lib/labels";
import { Pagination } from "@/components/nocturno/Row";

export const metadata = {
  title: "Fotografías — DEUCE",
  description: "Autores, licencias y fuentes de las fotografías del archivo DEUCE.",
  alternates: { canonical: "/credits" },
};

type Kind = "all" | "players" | "courts";
type CreditEntry = { key: string; name: string; photo: Photo; kind: Exclude<Kind, "all"> };
const photos: CreditEntry[] = [
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
  return `/credits${params.size ? `?${params}` : ""}`;
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
    <div className="ry-photo-page">
      <header className="ry-photo-intro">
        <div>
          <h1>Fotografías</h1>
          <p>Autor, licencia y fuente de las imágenes guardadas en DEUCE.</p>
        </div>
      </header>

      <form className="ry-photo-search" action="/credits" method="get" role="search">
        <label htmlFor="photo-query">Buscar por persona, torneo o autor</label>
        <div className="ry-photo-search-fields">
          <input id="photo-query" name="q" type="search" defaultValue={query} placeholder="Nombre o autor" />
          <select name="tipo" aria-label="Tipo de fotografía" defaultValue={kind}>
            <option value="all">Todas</option>
            <option value="players">Jugadores</option>
            <option value="courts">Torneos</option>
          </select>
          <button type="submit">Buscar</button>
        </div>
      </form>

      <div className="ry-photo-result-head">
        <h2>{kind === "players" ? "Jugadores" : kind === "courts" ? "Torneos" : "Archivo fotográfico"}</h2>
        <span>{number.format(selected.length)} {selected.length === 1 ? "fotografía" : "fotografías"}</span>
      </div>

      {visible.length ? (
        <div className="ry-photo-grid">
          {visible.map(({ key, name, photo, kind: photoKind }) => (
            <figure className="ry-photo-entry" key={key}>
              <a className="ry-photo-image" href={photo.source} target="_blank" rel="noopener noreferrer" aria-label={`Fuente de la fotografía: ${name}`}>
                <Image src={photo.src} alt={photo.alt} width={280} height={210} sizes="(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 45vw, 280px" unoptimized={photoKind === "players"} />
              </a>
              <figcaption>
                <h3><a href={photo.source} target="_blank" rel="noopener noreferrer">{name}</a></h3>
                {photo.caption && <p className="ry-photo-caption">{photo.caption}</p>}
                <p>{photo.credit}{photo.licenseUrl && <> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">Ver licencia</a></>}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="ry-photo-empty" role="status">
          <p>No hay fotografías para «{query}» con este filtro.</p>
          <Link href="/credits">Ver todas</Link>
        </div>
      )}

      {selected.length > 25 && <Pagination page={page} total={selected.length} href={(next) => href(query, kind, next)} />}
      <p className="ry-photo-endnote"><Link href="/info">Cómo se lee DEUCE</Link></p>
    </div>
  );
}
