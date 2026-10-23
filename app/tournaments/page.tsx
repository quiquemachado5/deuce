import { calendarOrder } from '@/lib/presentation-calendar';
import { latestTournamentCourt } from '@/lib/tournament-presentation';
import Link from "next/link";
import Image from "next/image";
import { preparedArchive } from "@/lib/revista/read-records";
import { courtPhoto } from "@/lib/imagery";
import { tournamentName } from "@/lib/labels";
import { number, surfaceLabel } from "@/lib/cuaderno/model";
import {
  categoryLabel,
  categoryYears,
  tournamentDirectory,
  type TournamentEntry,
} from "@/lib/tournament-directory";
import { chronological, roundPosition, winnerName } from "@/lib/editorial";
import { Pagination } from "@/components/nocturno/Row";

type Query = { categoria?: string; page?: string };
type Props = { searchParams: Promise<Query> };
const orderedCategories = [
  "Grand Slam", "Masters 1000", "ATP 500", "ATP 250",
  "ATP Tour histórico", "ATP Tour", "ATP Tour · nivel no especificado", "Precursores de Masters",
];
const primaryCategories = ["Grand Slam", "Masters 1000", "ATP 500", "ATP 250", "Challenger"] as const;
const primaryLabel = (category: string) => category === "Grand Slam" ? "Grand Slams" : category === "Challenger" ? "Challengers" : category === "ATP Tour · nivel no especificado" ? "Otros torneos ATP" : category;
const categoryUrl = (category: string, page = 1) =>
  `/tournaments?categoria=${encodeURIComponent(category)}${page > 1 ? `&page=${page}` : ""}`;

export async function generateMetadata({ searchParams }: Props) {
  const { categoria, page } = await searchParams;
  const pageNumber = Number(page);
  const title = categoria ? `${primaryLabel(categoria)} · Torneos — DEUCE` : "Torneos — DEUCE";
  const description = "Grand Slams, Masters y torneos ATP del archivo, separados por categoría y edición.";
  return {
    title,
    description,
    alternates: { canonical: categoria ? categoryUrl(categoria, Number.isFinite(pageNumber) ? Math.max(1, Math.floor(pageNumber)) : 1) : "/tournaments" },
    openGraph: { title, description, url: categoria ? categoryUrl(categoria) : "/tournaments" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function TournamentRow({ entry, category }: { entry: TournamentEntry; category: string }) {
  const matches = entry.matches.filter((match) => match.category === category);
  const years = categoryYears(entry, category);
  const court = latestTournamentCourt(matches);
  const finals = matches.filter((match) => roundPosition(match.round) === 7).length;
  return <Link className="ry-tournament-directory-row" href={`/torneos/${entry.slug}?categoria=${encodeURIComponent(category)}`}
    data-event-surface={court.surface} data-event-category={category}>
    <span className="ry-tournament-directory-name">{tournamentName(entry.name)}</span>
    <span className="ry-tournament-directory-meta">
      <i className={`nc-dot nc-dot-${court.surface}`} aria-hidden="true" />{surfaceLabel[court.surface]} en {court.year} · {court.indoor === true && "Bajo techo · "}
      {years.length === 1 ? years[0] : `${years.at(-1)}–${years[0]}`} · {number(years.length)} {years.length === 1 ? "edición" : "ediciones"}
    </span>
    <strong>{number(finals)} {finals === 1 ? "final" : "finales"}</strong>
  </Link>;
}

function PhotoGroup({ category, entries }: { category: string; entries: TournamentEntry[] }) {
  const calendar = category === "Calendario";
  const withPhoto = entries.filter((entry) => entry.canonical && courtPhoto(entry.name));
  const withoutPhoto = entries.filter((entry) => !withPhoto.includes(entry));
  if (!entries.length) return null;
  return <section className="nc-section ry-photo-tournament-group" id={calendar ? "temporada" : category === "Grand Slam" ? "grand-slams" : "masters"} data-event-category={category}>
    <div className="ry-tournament-list-heading"><h2>{calendar ? "Grand Slams y Masters 1000" : category === "Grand Slam" ? "Grand Slams" : "Masters 1000"}</h2><span>{number(entries.length)} torneos</span></div>
    {withPhoto.length > 0 && <div className={`ry-photo-tournament-grid${category === "Grand Slam" ? " ry-photo-slams" : ""}`}>
      {withPhoto.map((entry, index) => {
        const photo = courtPhoto(entry.name)!;
        const selected = entry.matches.filter((match) => calendar ? ["Grand Slam","Masters 1000"].includes(match.category) : match.category === category);
        const finals = selected.filter((match) => roundPosition(match.round) === 7).length;
        const court = latestTournamentCourt(selected);
        const latestFinal = [...selected].filter((match) => roundPosition(match.round) === 7).sort(chronological).at(-1);
        const champion = latestFinal ? winnerName(latestFinal) : "";
        return <Link className="ry-photo-tournament-tile" href={`/torneos/${entry.slug}`} key={entry.slug}
          data-event-surface={court.surface} data-event-category={entry.categories.includes("Grand Slam") ? "Grand Slam" : category}>
          <span className="ry-photo-tournament-image"><Image src={photo.src} alt={photo.alt} fill priority={category === "Grand Slam" && index < 2}
            loading={category === "Grand Slam" && index < 2 ? "eager" : "lazy"}
            sizes={category === "Grand Slam" ? "(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 45vw, 43vw" : "(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 45vw, 29vw"} /></span>
          <span className="ry-photo-tournament-copy">{entry.categories.includes("Grand Slam") && <span className="ry-photo-tournament-tag">Grand Slam</span>}<strong>{tournamentName(entry.name)}</strong>
            <span><i className={`nc-dot nc-dot-${court.surface}`} aria-hidden="true" />{surfaceLabel[court.surface]}{court.indoor === true && " · Bajo techo"}{!calendar && ` · ${number(finals)} finales`}</span>
            {champion && <small>Campeón {latestFinal!.year}: {champion}</small>}
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
  const id = category === "ATP 500" ? "atp-500" : category === "ATP 250" ? "atp-250" :
    category === "Precursores de Masters" ? "precursores" : category === "ATP Tour histórico" ? "otros" : undefined;
  return <section className="nc-section ry-tournament-list-section" id={id}>
    <div className="ry-tournament-list-heading"><h2>{categoryLabel(category)}</h2><span>{number(entries.length)} torneos</span></div>
    <div className="ry-tournament-directory-rows">{shown.map((entry) => <TournamentRow entry={entry} category={category} key={`${category}-${entry.slug}`} />)}</div>
    {entries.length > shown.length && <Link className="ry-tournament-see-all" href={categoryUrl(category)}>Ver los {number(entries.length)} torneos</Link>}
  </section>;
}

export default async function Tournaments({ searchParams }: Props) {
  const query = await searchParams;
  const matches = await preparedArchive();
  const entries = calendarOrder(tournamentDirectory(matches));
  const categories = [...new Set(entries.flatMap((entry) => entry.categories))]
    .sort((a, b) => {
      const ia = orderedCategories.indexOf(a), ib = orderedCategories.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b, "es");
    });
  const chosen = query.categoria && (categories.includes(query.categoria) || primaryCategories.includes(query.categoria as typeof primaryCategories[number])) ? query.categoria : null;
  const chosenEntries = chosen ? entries.filter((entry) => entry.categories.includes(chosen)) : [];
  const pages = Math.max(1, Math.ceil(chosenEntries.length / 25));
  const requestedPage = Number(query.page);
  const page = Number.isFinite(requestedPage) ? Math.min(pages, Math.max(1, Math.floor(requestedPage))) : 1;
  return <div className="nc-wrap ry-photo-tournaments" data-event-category={chosen || undefined}>
    <header className="ry-photo-tournaments-intro">
      <h1>{chosen ? primaryLabel(chosen) : "Torneos"}</h1>
      <p>{chosen ? `${number(chosenEntries.length)} torneos de esta categoría.` : "Resultados, finales y ediciones del archivo."}</p>
    </header>
    <nav className="ry-tournament-category-nav ry-tournament-primary-tabs" aria-label="Categorías principales de torneos">
      <Link href="/tournaments" aria-current={!chosen ? "page" : undefined}>Todos</Link>
      {primaryCategories.map((category) => <Link key={category} href={categoryUrl(category)} aria-current={chosen === category ? "page" : undefined}
        data-event-category={category}>{primaryLabel(category)}</Link>)}
    </nav>
    {!chosen && categories.some(category => !primaryCategories.includes(category as typeof primaryCategories[number])) && <details className="ry-tournament-more-categories">
      <summary>Más categorías históricas</summary>
      <nav aria-label="Categorías históricas">{categories.filter(category => !primaryCategories.includes(category as typeof primaryCategories[number])).map(category => <Link key={category} href={categoryUrl(category)}>{categoryLabel(category)}</Link>)}</nav>
    </details>}
    {chosen ? (["Grand Slam","Masters 1000"].includes(chosen) ? <PhotoGroup category={chosen} entries={chosenEntries} /> : <section className="nc-section ry-tournament-list-section ry-tournament-filtered">
      <div className="ry-tournament-list-heading"><h2>{categoryLabel(chosen)}</h2><span>Página {number(page)} de {number(pages)}</span></div>
      {chosenEntries.length ? <div className="ry-tournament-directory-rows">{chosenEntries.slice((page - 1) * 25, page * 25).map((entry) => <TournamentRow entry={entry} category={chosen} key={entry.slug} />)}</div>
        : <div className="ry-tournament-empty" role="status"><h3>Aún no hay {primaryLabel(chosen).toLowerCase()} en esta copia del archivo</h3><p>La categoría está preparada para incorporarlos cuando existan datos publicados.</p><Link href="/tournaments">Volver a todos los torneos</Link></div>}
      {chosenEntries.length > 25 && <Pagination page={page} total={chosenEntries.length} href={(nextPage) => categoryUrl(chosen, nextPage)} />}
    </section>) : <>
      <PhotoGroup category="Calendario" entries={entries.filter(entry => entry.canonical && entry.categories.some(category=>["Grand Slam","Masters 1000"].includes(category)))} />
      {categories.filter((category) => category !== "Grand Slam" && category !== "Masters 1000")
        .map((category) => <CompactSection category={category} entries={entries.filter((entry) => entry.categories.includes(category))} key={category} />)}
    </>}
  </div>;
}
