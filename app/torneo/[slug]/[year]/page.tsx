import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "../../../rally-photography.css";
import "../../../tournaments/tournament-refresh.css";
import { preparedArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import { categoryLabel, tournamentDirectory } from "@/lib/tournament-directory";
import { winnerName, roundPosition, durationLabel } from "@/lib/editorial";
import { lostOpening } from "@/lib/archive-insights";
import {
  closeness,
  number,
  score,
  sentence,
  surfaceLabel,
} from "@/lib/cuaderno/model";
import { courtPhoto } from "@/lib/imagery";
import Row, { Pagination } from "@/components/nocturno/Row";
import { publishedMatchMinutes } from "@/lib/duration";

type Props = {
  params: Promise<{ slug: string; year: string }>;
  searchParams: Promise<{ page?: string; categoria?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find((entry) => entry.slug === slug);
  const options = tournament?.matches.filter((match) => match.year === Number(year)) || [];
  const level = query.categoria && options.some((match) => match.category === query.categoria) ? query.categoria : options[0]?.category;
  const canonicalParams = new URLSearchParams();
  if (level && new Set(options.map((match) => match.category)).size > 1) canonicalParams.set("categoria", level);
  if (Number(query.page) > 1) canonicalParams.set("page", String(Number(query.page)));
  return {
    title: `${tournament ? tournamentName(tournament.name) : "Edición"} ${year}${level ? ` · ${categoryLabel(level)}` : ""} — DEUCE`,
    description:
      "La final, el camino del campeón y los resultados de esta edición.",
    alternates: { canonical: `/${slug}/${year}${canonicalParams.size ? `?${canonicalParams}` : ""}` },
  };
}

export default async function Edition({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const tournament = tournamentDirectory(await preparedArchive()).find((entry) => entry.slug === slug);
  if (!tournament || !/^\d{4}$/.test(year)) notFound();
  const edition = tournament.matches.filter((match) => match.year === Number(year));
  const categories = [...new Set(edition.map((match) => match.category))];
  const category = query.categoria && categories.includes(query.categoria) ? query.categoria : categories[0];
  const matches = edition.filter((match) => match.category === category);
  if (!matches.length) notFound();
  const surfaces = [...new Set(matches.map((match) => match.surface))];
  const final = matches.find((match) => roundPosition(match.round) === 7);
  const champion = final ? winnerName(final) : null;
  const path = champion
    ? matches
        .filter((match) => winnerName(match) === champion)
        .sort((a, b) => roundPosition(a.round) - roundPosition(b.round))
    : [];
  const comeback =
    matches.find((match) => lostOpening(match, 2)) ||
    matches.find((match) => lostOpening(match));
  const closest = [...matches].sort((a, b) => closeness(b) - closeness(a))[0];
  const timed = matches
    .filter((match) => publishedMatchMinutes(match) !== null)
    .sort((a, b) => publishedMatchMinutes(b)! - publishedMatchMinutes(a)!);
  const page = Math.max(
    1,
    Math.min(Math.ceil(matches.length / 25), Number(query.page) || 1),
  );
  const photographedEdition: Record<string, number> = {
    "Roland Garros": 2024,
    "Australian Open": 2023,
    Miami: 2025,
    Cincinnati: 2025,
    Paris: 2024,
    "US Open": 2018,
  };
  const photo =
    tournament.canonical && photographedEdition[tournament.name] === Number(year)
      ? courtPhoto(tournament.name)
      : null;
  const finalSentence = final ? sentence(final) : "";
  const finalSets = final ? score(final).split(", ") : [];
  const editionUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (categories.length > 1) params.set("categoria", category);
    if (pageNumber > 1) params.set("page", String(pageNumber));
    return `/${slug}/${year}${params.size ? `?${params}` : ""}`;
  };
  return (
    <div className="nc-wrap ry-photo-edition" data-event-category={category}
      data-event-surface={surfaces.length === 1 ? surfaces[0] : undefined}>
      <header className={`ry-photo-edition-header${photo ? " ry-photo-edition-has-image" : ""}`}>
      <div className="ry-photo-edition-heading">
      <p className="nc-meta">
        <Link href={`/torneos/${slug}`}>
          {tournamentName(tournament.name)} · todas las ediciones
        </Link>
      </p>
      <h1>
        {tournamentName(tournament.name)} {year}
      </h1>
      <p className="nc-meta">
        <span className="ry-tournament-level">{categoryLabel(category)}</span> ·{" "}
        {surfaces.length === 1 && <><i className={`nc-dot nc-dot-${surfaces[0]}`} aria-hidden="true" />{surfaceLabel[surfaces[0]]} · </>}
        {number(matches.length)} partidos
      </p>
      </div>
      {photo && (
        <figure className="nc-edition-photo ry-photo-edition-image">
          <Image
            src={photo.src}
            width={1068}
            height={712}
            sizes="(max-width: 649px) calc(100vw - 32px), (max-width: 1099px) 50vw, 560px"
            alt={photo.alt.includes(year) ? photo.alt : `${photo.alt} · ${year}`}
            priority
            loading="eager"
            fetchPriority="high"
          />
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>
      )}
      </header>
      {categories.length > 1 && <nav className="ry-tournament-levels" aria-label="Categorías de esta edición">
        {categories.map((level) => <Link key={level} data-event-category={level} aria-current={level === category ? "page" : undefined}
          href={`/${slug}/${year}?categoria=${encodeURIComponent(level)}`}>{categoryLabel(level)}</Link>)}
      </nav>}
      {final && (
        <section className="nc-edition-final" aria-label="Final">
          <p className="ry-edition-final-label">Final · {tournamentName(tournament.name)} {year}</p>
          <h2>
            <span className="ry-edition-final-player">{final.player1.name}</span>
            <span className="nc-versus">contra</span>
            <span className="ry-edition-final-player">{final.player2.name}</span>
          </h2>
          <p className="nc-edition-score" aria-label={`Marcador: ${score(final)}`}>
            {finalSets.map((set, index) => <span key={`${set}-${index}`}>{set}{index < finalSets.length - 1 ? "," : ""}</span>)}
          </p>
          <p className="ry-edition-winner">Ganador: <strong>{champion}</strong></p>
          {finalSentence && finalSentence.length <= 90 && (
            <p>{finalSentence}</p>
          )}
          <Link className="nc-link" href={`/match/${final.match_id}`}>
            Ver el partido
          </Link>
        </section>
      )}
      {champion && (
        <section className="nc-section">
          <h2>El camino de {champion}</h2>
          {path.map((match) => (
            <Row key={match.match_id} match={match} firstPlayer={champion} />
          ))}
        </section>
      )}
      <section className="nc-section nc-edition-facts">
        <h2>Partidos destacados</h2>
        {comeback && (
          <div>
            <h3>La remontada</h3>
            <Row match={comeback} />
          </div>
        )}
        {closest && (
          <div>
            <h3>El marcador más ajustado</h3>
            <p className="nc-meta">
              {closeness(closest)} / 100 · ajuste del tanteo, sin peso
              histórico.
            </p>
            <Row match={closest} />
          </div>
        )}
        {timed[0] && (
          <div>
            <h3>El más largo con minutos</h3>
            <p className="nc-meta">
              {durationLabel(publishedMatchMinutes(timed[0])!)} ·{" "}
              {number(timed.length)} partidos con duración publicada.
            </p>
            <Row match={timed[0]} />
          </div>
        )}
      </section>
      <details className="nc-section" open={Boolean(query.page)}>
        <summary>Todos los partidos · {number(matches.length)}</summary>
        {matches.slice((page - 1) * 25, page * 25).map((match) => (
          <Row key={match.match_id} match={match} />
        ))}
        <Pagination
          page={page}
          total={matches.length}
          href={editionUrl}
        />
      </details>
    </div>
  );
}
