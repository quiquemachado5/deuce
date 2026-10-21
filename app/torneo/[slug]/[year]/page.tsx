import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Info } from "lucide-react";
import { preparedArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import {
  categoryLabel,
  categoryYears,
  tournamentDirectory,
} from "@/lib/tournament-directory";
import { roundPosition, durationLabel } from "@/lib/editorial";
import { lostOpening } from "@/lib/archive-insights";
import { closeness, number, surfaceLabel } from "@/lib/cuaderno/model";
import { editionTournamentCourt } from "@/lib/tournament-presentation";
import { courtPhotoForEdition } from "@/lib/imagery";
import Row, { Pagination } from "@/components/nocturno/Row";
import EditionPicker from "@/components/EditionPicker";
import TournamentFinal from "@/components/TournamentFinal";
import TournamentBracket from "@/components/TournamentBracket";
import { publishedMatchMinutes } from "@/lib/duration";

type Props = {
  params: Promise<{ slug: string; year: string }>;
  searchParams: Promise<{ page?: string; categoria?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find(
    (entry) => entry.slug === slug,
  );
  const options =
    tournament?.matches.filter((match) => match.year === Number(year)) || [];
  const level =
    query.categoria &&
    options.some((match) => match.category === query.categoria)
      ? query.categoria
      : options[0]?.category;
  const canonicalParams = new URLSearchParams();
  if (level && new Set(options.map((match) => match.category)).size > 1)
    canonicalParams.set("categoria", level);
  if (Number(query.page) > 1)
    canonicalParams.set("page", String(Number(query.page)));
  return {
    title: `${tournament ? tournamentName(tournament.name) : "Edición"} ${year}${level ? ` · ${categoryLabel(level)}` : ""} — DEUCE`,
    description:
      "La final, el camino del campeón y los resultados de esta edición.",
    alternates: {
      canonical: `/${slug}/${year}${canonicalParams.size ? `?${canonicalParams}` : ""}`,
    },
  };
}

export default async function Edition({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find(
    (entry) => entry.slug === slug,
  );
  if (!tournament || !/^\d{4}$/.test(year)) notFound();
  const edition = tournament.matches.filter(
    (match) => match.year === Number(year),
  );
  const categories = [...new Set(edition.map((match) => match.category))];
  const category =
    query.categoria && categories.includes(query.categoria)
      ? query.categoria
      : categories[0];
  const matches = edition.filter((match) => match.category === category);
  if (!matches.length) notFound();
  const court = editionTournamentCourt(matches);
  const final = matches.find((match) => roundPosition(match.round) === 7);
  const comeback =
    matches
      .filter((match) => lostOpening(match, 2))
      .sort((a, b) => closeness(b) - closeness(a))[0] ||
    matches
      .filter((match) => lostOpening(match))
      .sort((a, b) => closeness(b) - closeness(a))[0];
  const closest = [...matches].sort((a, b) => closeness(b) - closeness(a))[0];
  const timed = matches
    .filter((match) => publishedMatchMinutes(match) !== null)
    .sort((a, b) => publishedMatchMinutes(b)! - publishedMatchMinutes(a)!);
  const requestedPage = Number(query.page);
  const page = Number.isFinite(requestedPage)
    ? Math.max(
        1,
        Math.min(Math.ceil(matches.length / 25), Math.floor(requestedPage)),
      )
    : 1;
  const photo = tournament.canonical
    ? courtPhotoForEdition(tournament.name, Number(year))
    : null;
  const moments = [
    comeback ? { match: comeback, label: "Remontada" } : null,
    closest
      ? {
          match: closest,
          label: `Marcador más ajustado · ${number(closeness(closest))} / 100`,
        }
      : null,
    timed[0]
      ? {
          match: timed[0],
          label: `Mayor duración publicada · ${durationLabel(publishedMatchMinutes(timed[0])!)}`,
        }
      : null,
  ].filter(
    (moment): moment is { match: (typeof matches)[number]; label: string } =>
      Boolean(moment),
  );
  const uniqueMoments = [
    ...new Map(
      moments.map((moment) => [
        moment.match.match_id,
        {
          match: moment.match,
          labels: moments
            .filter(
              (candidate) => candidate.match.match_id === moment.match.match_id,
            )
            .map((candidate) => candidate.label),
        },
      ]),
    ).values(),
  ];
  const editionUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (categories.length > 1) params.set("categoria", category);
    if (pageNumber > 1) params.set("page", String(pageNumber));
    return `/${slug}/${year}${params.size ? `?${params}` : ""}`;
  };
  return (
    <div
      className="nc-wrap ry-photo-edition td-edition"
      data-event-category={category}
      data-event-surface={court.surface}
    >
      <header
        className={`td-edition-hero${photo ? " td-edition-hero-photo" : ""}`}
      >
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 759px) calc(100vw - 32px), 1240px"
            priority
          />
        )}
        <div className="td-edition-hero-copy">
          <Link
            className="td-breadcrumb"
            href={`/torneos/${slug}${tournament.categories.length > 1 ? `?categoria=${encodeURIComponent(category)}` : ""}`}
          >
            {tournamentName(tournament.name)}{" "}
          </Link>
          <p className="td-category">{categoryLabel(category)}</p>
          <h1>
            {tournamentName(tournament.name)} <span>{year}</span>
          </h1>
          <p className="td-hero-court">
            <i
              className={`nc-dot nc-dot-${court.surface}`}
              aria-hidden="true"
            />
            {surfaceLabel[court.surface]}
            {court.indoor !== null && (
              <span>· {court.indoor ? "Bajo techo" : "Al aire libre"}</span>
            )}
            <span>· {number(matches.length)} partidos registrados</span>
          </p>
        </div>
        {photo && (
          <details className="td-photo-info">
            <summary aria-label="Información de la fotografía">
              <Info size={18} aria-hidden="true" />
            </summary>
            <p>{photo.caption || photo.alt}</p>
            <p>{photo.credit}</p>
            <a href={photo.source} target="_blank" rel="noreferrer">
              Ver fuente y licencia
            </a>
          </details>
        )}
      </header>

      {categories.length > 1 && (
        <nav
          className="ry-tournament-levels"
          aria-label="Categorías de esta edición"
        >
          {categories.map((level) => (
            <Link
              key={level}
              data-event-category={level}
              aria-current={level === category ? "page" : undefined}
              href={`/${slug}/${year}?categoria=${encodeURIComponent(level)}`}
            >
              {categoryLabel(level)}
            </Link>
          ))}
        </nav>
      )}
      <section className="td-editions" aria-label="Cambiar edición">
        <h2>Ediciones</h2>
        <EditionPicker
          slug={slug}
          years={categoryYears(tournament, category)}
          currentYear={Number(year)}
          masters={category === "Precursores de Masters"}
          category={tournament.categories.length > 1 ? category : undefined}
        />
      </section>
      {final && <TournamentFinal match={final} />}
      <TournamentBracket matches={matches} />
      {uniqueMoments.length > 0 && (
        <section className="nc-section nc-edition-facts td-edition-moments">
          <div className="td-section-heading">
            <div>
              <h2>Partidos de esta edición</h2>
            </div>
          </div>
          {uniqueMoments.map(({ match, labels }) => (
            <div key={match.match_id}>
              <h3>{labels.join(" · ")}</h3>
              {match.match_id === closest?.match_id && (
                <p className="nc-meta">
                  El ajuste se basa solo en el tanteo; no mide la importancia
                  del partido.
                </p>
              )}
              {match.match_id === timed[0]?.match_id && (
                <p className="nc-meta">
                  {number(timed.length)} partidos de esta edición tienen
                  duración publicada.
                </p>
              )}
              <Row match={match} />
            </div>
          ))}
        </section>
      )}
      <details className="nc-section td-all-matches" open={Boolean(query.page)}>
        <summary>Todos los partidos · {number(matches.length)}</summary>
        {matches.slice((page - 1) * 25, page * 25).map((match) => (
          <Row key={match.match_id} match={match} />
        ))}
        <Pagination page={page} total={matches.length} href={editionUrl} />
      </details>
    </div>
  );
}
