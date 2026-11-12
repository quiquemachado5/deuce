import Image from "next/image";
import Link from "next/link";
import { playerPhotos, reviewedPlayerPhotos } from "@/lib/player-imagery";
import { courtPhotos, type Photo } from "@/lib/imagery";
import { homeMaterials } from "@/lib/home-photography";
import { homePhotoCredits } from '@/lib/home-media';
import { tournamentBrandCredits } from '@/lib/tournament-branding';
import { tournamentName } from "@/lib/labels";
import { ArrowUpRight, Search } from "lucide-react";
import styles from "./licences.module.css";
import { photoRightsStatus, type PhotoRightsStatus } from "@/lib/photo-rights";
import tournamentLibrary from '@/data/media/tournament-library.json';

export const metadata = {
  title: "Licencias — DEUCE",
  description: "Procedencia, autores y condiciones de uso de las imágenes y recursos de DEUCE.",
  alternates: { canonical: "/licencias" },
};

type Kind = "all" | "players" | "courts";
type Rights = "all" | PhotoRightsStatus;
type CreditEntry = { key: string; name: string; photo: Photo; kind: Exclude<Kind, "all">; rights: PhotoRightsStatus };
const photos: CreditEntry[] = [
  ...tournamentLibrary.photos.map(photo=>({key:`library-${photo.id}`,name:`${photo.context.tournament} · ${photo.context.year}`,kind:'courts' as const,photo:{src:'thumbnailSrc' in photo&&typeof photo.thumbnailSrc==='string'?photo.thumbnailSrc:photo.src,alt:photo.title,credit:photo.credit,source:photo.source,licenseUrl:photo.licenseUrl,caption:photo.license}})),
  ...Object.entries(reviewedPlayerPhotos).map(([key,photo])=>({key:`reviewed-${key}`,name:key.slice(4),photo,kind:'players' as const})),
  ...tournamentBrandCredits.map(({name,photo},index)=>({key:`tournament-brand-${index}`,name,photo,kind:'courts' as const,rights:'source-only' as const})),
  ...homePhotoCredits,
  ...homeMaterials.map(material => ({ key: `material-${material.surface}`, name: material.name, photo: material.photo, kind: "courts" as const })),
  ...Object.entries(courtPhotos).map(([key, photo]) => ({ key: `court-${key}`, name: tournamentName(key), photo, kind: "courts" as const })),
  ...Object.entries(playerPhotos).map(([key, photo]) => ({ key: `player-${key}`, name: key, photo, kind: "players" as const })),
].map(entry=>({...entry,rights:photoRightsStatus(entry.photo)})).sort((a, b) => a.name.localeCompare(b.name, "es"));

const number = new Intl.NumberFormat("es-ES");
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function href(query: string, kind: Kind, rights: Rights, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (kind !== "all") params.set("tipo", kind);
  if (rights !== "all") params.set("derechos", rights);
  if (page > 1) params.set("page", String(page));
  return `/licencias${params.size ? `?${params}` : ""}`;
}

export default async function Credits({ searchParams }: {
  searchParams: Promise<{ q?: string; tipo?: string; derechos?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 80);
  const kind: Kind = params.tipo === "players" || params.tipo === "courts" ? params.tipo : "all";
  const rights: Rights = params.derechos === "documented" || params.derechos === "source-only" ? params.derechos : "all";
  const search = normalize(query);
  const selected = photos.filter((entry) =>
    (kind === "all" || entry.kind === kind) &&
    (rights === "all" || entry.rights === rights) &&
    (!search || normalize(`${entry.name} ${entry.photo.alt} ${entry.photo.credit} ${entry.photo.caption || ""}`).includes(search)),
  );
  const pages = Math.max(1, Math.ceil(selected.length / 25));
  const requested = Number(params.page);
  const page = Math.max(1, Math.min(pages, Number.isFinite(requested) ? Math.floor(requested) : 1));
  const visible = selected.slice((page - 1) * 25, page * 25);

  return <div className={styles.page}>
    <header className={styles.hero}><h1>Licencias</h1><p>Quién creó las imágenes de DEUCE, de dónde proceden y en qué condiciones se pueden reutilizar.</p></header>

    <details className={styles.resources}>
      <summary>Vídeo, tipografía y otros recursos</summary>
      <dl>
        <div id="video"><dt>Vídeo de portada · prueba local</dt><dd>Edición muda de planos de juego del tráiler oficial <a href="https://www.youtube.com/watch?v=L21dd0mOTLo">Where Beauty Meets the Battle · Wimbledon 2026</a>. Fuente: The Championships, Wimbledon. Derechos de sus titulares; no se atribuye una licencia abierta a este material.</dd></div>
        <div id="recreaciones"><dt>Recreaciones</dt><dd>Las imágenes identificadas como recreaciones con IA son ilustraciones editoriales. No son fotografías de un partido real.</dd></div>
        <div><dt>Tipografía</dt><dd>Sora y Host Grotesk, distribuidas con licencia SIL Open Font License.</dd></div>
        <div><dt>Banderas</dt><dd>SVG de flag-icons (lipis). <a href="/images/flags/LICENSE.txt">Licencia MIT</a> · <a href="/images/flags/SOURCE.txt">Procedencia</a>.</dd></div>
      </dl>
    </details>

    <section aria-labelledby="licence-photos">
      <div className={styles.heading}><h2 id="licence-photos">Créditos de imágenes</h2><span>{number.format(selected.length)} {selected.length===1?'recurso':'recursos'}</span></div>
      <form className={styles.search} action="/licencias" role="search">
        <label>Buscar imagen<input name="q" type="search" defaultValue={query} maxLength={80} placeholder="Jugador, torneo o autor"/></label>
        <label>Tipo<select name="tipo" defaultValue={kind}><option value="all">Todos</option><option value="players">Jugadores</option><option value="courts">Pistas y torneos</option></select></label>
        <label>Derechos<select name="derechos" defaultValue={rights}><option value="all">Todos</option><option value="documented">Derechos documentados</option><option value="source-only">Solo fuente registrada</option></select></label>
        <button type="submit"><Search size={17} aria-hidden="true"/> Buscar</button>
      </form>
      {visible.length?<div className={styles.results}>
        {visible.map(({key,name,photo,rights:photoRights})=><figure className={styles.entry} key={key}>
          <Image className={styles.image} src={photo.thumbnail||photo.src} alt={photo.alt} width={160} height={160} sizes="(max-width:759px) 82px, 104px"/>
          <figcaption>
            <h3>{name}</h3>
            <p>{photo.credit}</p>
            <span className={styles.rights}>{photoRights==='documented'?'Derechos documentados':'Solo fuente registrada'}</span>
            <div className={styles.links}><a href={photo.source}>Fuente <ArrowUpRight size={14} aria-hidden="true"/></a>{photo.licenseUrl&&<a href={photo.licenseUrl}>Licencia <ArrowUpRight size={14} aria-hidden="true"/></a>}</div>
          </figcaption>
        </figure>)}
      </div>:<div className={styles.empty}><p>No encontramos imágenes con esta búsqueda.</p><Link href="/licencias">Restablecer filtros</Link></div>}
      {pages>1&&<nav className={styles.pages} aria-label="Páginas de créditos">
        {page>1?<Link href={href(query,kind,rights,page-1)}>Anterior</Link>:<span/>}<span>Página {page} de {pages}</span>{page<pages?<Link href={href(query,kind,rights,page+1)}>Siguiente</Link>:<span/>}
      </nav>}
    </section>
  </div>;
}
