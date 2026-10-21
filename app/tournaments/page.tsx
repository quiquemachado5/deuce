import Link from "next/link";
import Image from "next/image";
import "../rally-photography.css";
import "./tournament-refresh.css";
import { preparedArchive } from "@/lib/revista/read-records";
import { courtPhoto } from "@/lib/imagery";
import { tournamentName } from "@/lib/labels";
import { number, surfaceLabel } from "@/lib/cuaderno/model";
import {
  categoryLabel,
  categorySurfaces,
  categoryYears,
  tournamentDirectory,
  type TournamentEntry,
} from "@/lib/tournament-directory";
import { roundPosition } from "@/lib/editorial";
import { Pagination } from "@/components/nocturno/Row";

type Query = { categoria?: string; page?: string };
type Props = { searchParams: Promise<Query> };
const orderedCategories = [
  "Grand Slam", "Masters 1000", "ATP 500", "ATP 250",
  "ATP Tour histórico", "ATP Tour", "ATP Tour · nivel no especificado", "Precursores de Masters",
];
const categoryUrl = (category: string, page = 1) =>
  `/tournaments?categoria=${encodeURIComponent(category)}${page > 1 ? `&page=${page}` : ""}`;

export async function generateMetadata({ searchParams }: Props) {
  const { categoria, page } = await searchParams;
  const pageNumber = Number(page);
  return {
    title: categoria ? `${categoryLabel(categoria)} · Torneos — DEUCE` : "Torneos — DEUCE",
    description: "Grand Slams, Masters y torneos ATP del archivo, separados por categoría y edición.",
    alternates: { canonical: categoria ? categoryUrl(categoria, Number.isFinite(pageNumber) ? Math.max(1, Math.floor(pageNumber)) : 1) : "/tournaments" },
  };
}

function TournamentRow({ entry, category }: { entry: TournamentEntry; category: string }) {
  const matches = entry.matches.filter((match) => match.category === category);
  const years = categoryYears(entry, category);
  const surfaces = categorySurfaces(entry, category);
  const finals = matches.filter((match) => roundPosition(match.round) === 7).length;
  return <Link className="ry-tournament-directory-row" href={`/torneos/${entry.slug}?categoria=${encodeURIComponent(category)}`}
    data-event-surface={surfaces.length === 1 ? surfaces[0] : undefined} data-event-category={category}>
    <span className="ry-tournament-directory-name">{tournamentName(entry.name)}</span>
    <span className="ry-tournament-directory-meta">
      {surfaces.length === 1 && <><i className={`nc-dot nc-dot-${surfaces[0]}`} aria-hidden="true" />{surfaceLabel[surfaces[0]]} · </>}
      {years.length === 1 ? years[0] : `${years.at(-1)}–${years[0]}`} · {number(years.length)} {years.length === 1 ? "edición" : "ediciones"}
    </span>
    <strong>{number(finals)} {finals === 1 ? "final" : "finales"}</strong>
  </Link>;
}

function PhotoGroup({ category, entries }: { category: string; entries: TournamentEntry[] }) {
  const withPhoto = entries.filter((entry) => entry.canonical && courtPhoto(entry.name));
  const withoutPhoto = entries.filter((entry) => !withPhoto.includes(entry));
  if (!entries.length) return null;
  return <section className="nc-section ry-photo-tournament-group" id={category === "Grand Slam" ? "grand-slams" : "masters"} data-event-category={category}>
    <div className="ry-tournament-list-heading"><h2>{category === "Grand Slam" ? "Grand Slams" : "Masters 1000"}</h2><span>{number(entries.length)} torneos · {category === "Masters 1000" ? "desde 1990" : "este archivo"}</span></div>
    {withPhoto.length > 0 && <div className={`ry-photo-tournament-grid${category === "Grand Slam" ? " ry-photo-slams" : ""}`}>
      {withPhoto.map((entry, index) => {
        const photo = courtPhoto(entry.name)!;
        const selected = entry.matches.filter((match) => match.category === category);
        const finals = selected.filter((match) => roundPosition(match.round) === 7).length;
        const surfaces = categorySurfaces(entry, category);
        return <Link className="ry-photo-tournament-tile" href={`/torneos/${entry.slug}`} key={entry.slug}
          data-event-surface={surfaces.length === 1 ? surfaces[0] : undefined} data-event-category={category}>
          <span className="ry-photo-tournament-image"><Image src={photo.src} alt={photo.alt} fill priority={category === "Grand Slam" && index < 2}
            loading={category === "Grand Slam" && index < 2 ? "eager" : "lazy"}
            sizes={category === "Grand Slam" ? "(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 45vw, 43vw" : "(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 45vw, 29vw"} /></span>
          <span className="ry-photo-tournament-copy"><strong>{tournamentName(entry.name)}</strong>
            <span>{surfaces.length === 1 && <><i className={`nc-dot nc-dot-${surfaces[0]}`} aria-hidden="true" />{surfaceLabel[surfaces[0]]} · </>}{number(finals)} finales</span>
            {photo.caption && <small>{photo.caption}</small>}
          </span>
        </Link>;
      })}
    </div>}
    {withoutPhoto.length > 0 && <div className="ry-tournament-directory-rows ry-tournament-extra-masters">
      {withoutPhoto.map((entry) => <TournamentRow entry={entry} category={category} key={entry.slug} />)}
    </div>}
  </section>;
}

function CompactSection({ category, entries }: { category: string; entries: TournamentEntry[] }) {
  if (!entries.length) return null;
  const shown = entries.slice(0, 8);
  return <section className="nc-section ry-tournament-list-section">
    <div className="ry-tournament-list-heading"><h2>{categoryLabel(category)}</h2><span>{number(entries.length)} torneos</span></div>
    <div className="ry-tournament-directory-rows">{shown.map((entry) => <TournamentRow entry={entry} category={category} key={`${category}-${entry.slug}`} />)}</div>
    {entries.length > shown.length && <Link className="ry-tournament-see-all" href={categoryUrl(category)}>Ver los {number(entries.length)} torneos</Link>}
  </section>;
}

export default async function Tournaments({ searchParams }: Props) {
  const query = await searchParams;
  const matches = await preparedArchive();
  const entries = tournamentDirectory(matches);
  const categories = [...new Set(entries.flatMap((entry) => entry.categories))]
    .sort((a, b) => {
      const ia = orderedCategories.indexOf(a), ib = orderedCategories.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b, "es");
    });
  const chosen = query.categoria && categories.includes(query.categoria) ? query.categoria : null;
  const chosenEntries = chosen ? entries.filter((entry) => entry.categories.includes(chosen)) : [];
  const pages = Math.max(1, Math.ceil(chosenEntries.length / 25));
  const requestedPage = Number(query.page);
  const page = Number.isFinite(requestedPage) ? Math.min(pages, Math.max(1, Math.floor(requestedPage))) : 1;
  return <div className="nc-wrap ry-photo-tournaments" data-event-category={chosen || undefined}>
    <header className="ry-photo-tournaments-intro">
      <h1>{chosen ? categoryLabel(chosen) : "Torneos"}</h1>
      <p>{chosen ? `${number(chosenEntries.length)} torneos de esta categoría.` : "Resultados, finales y ediciones del archivo."}</p>
    </header>
    <nav className="ry-tournament-category-nav" aria-label="Categorías de torneos">
      <Link href="/tournaments" aria-current={!chosen ? "page" : undefined}>Todos</Link>
      {categories.map((category) => <Link key={category} href={categoryUrl(category)} aria-current={chosen === category ? "page" : undefined}
        data-event-category={category}>{categoryLabel(category)}</Link>)}
    </nav>
    {chosen ? <section className="nc-section ry-tournament-list-section ry-tournament-filtered">
      <div className="ry-tournament-list-heading"><h2>{categoryLabel(chosen)}</h2><span>Página {number(page)} de {number(pages)}</span></div>
      <div className="ry-tournament-directory-rows">{chosenEntries.slice((page - 1) * 25, page * 25).map((entry) => <TournamentRow entry={entry} category={chosen} key={entry.slug} />)}</div>
      {chosenEntries.length > 25 && <Pagination page={page} total={chosenEntries.length} href={(nextPage) => categoryUrl(chosen, nextPage)} />}
    </section> : <>
      {(["Grand Slam", "Masters 1000"] as const).map((category) => <PhotoGroup category={category} entries={entries.filter((entry) => entry.categories.includes(category))} key={category} />)}
      {categories.filter((category) => category !== "Grand Slam" && category !== "Masters 1000")
        .map((category) => <CompactSection category={category} entries={entries.filter((entry) => entry.categories.includes(category))} key={category} />)}
    </>}
  </div>;
}
