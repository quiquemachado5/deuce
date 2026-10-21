import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import "../../rally-photography.css";
import "../../rally-bio.css";
import "./player-refresh.css";
import Row from "@/components/nocturno/Row";
import PlayerFingerprint from "@/components/nocturno/PlayerFingerprint";
import PeopleTabs from "@/components/nocturno/PeopleTabs";
import { notebook } from "@/lib/cuaderno/data";
import { number, surfaceLabel } from "@/lib/cuaderno/model";
import {
  chronological,
  playerSeason,
  winnerName,
  roundLabel,
} from "@/lib/editorial";
import { playerSlug } from "@/lib/explore";
import { tournamentName } from "@/lib/labels";
import { canonicalName } from "@/lib/quality";
import { playerPhoto } from "@/lib/player-imagery";
import {
  playerBiography,
  countryLabel,
  birthLabel,
  handLabel,
  backhandLabel,
} from "@/lib/player-bio";
import { playerFact, eraComparisons } from "@/lib/revista/records";
import { tournamentDirectory } from "@/lib/tournament-directory";
import type { Match } from "@/lib/types";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ year?: string; vista?: string }>;
};

function SeasonChart({
  matches,
  name,
  slug,
  selected,
}: {
  matches: Match[];
  name: string;
  slug: string;
  selected: number;
}) {
  const byYear = new Map<number, { wins: number; losses: number }>();
  for (const match of matches) {
    const result = byYear.get(match.year) || { wins: 0, losses: 0 };
    if (winnerName(match) === name) result.wins++;
    else result.losses++;
    byYear.set(match.year, result);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const seasons = Array.from({ length: years.at(-1)! - years[0] + 1 }, (_, index) => {
    const year = years[0] + index;
    return { year, result: byYear.get(year) || null };
  });
  const best = [...byYear].sort((a, b) => b[1].wins - a[1].wins)[0];
  const selectedResult = byYear.get(selected);
  const maximum = Math.max(
    10,
    Math.ceil(
      Math.max(...[...byYear.values()].flatMap((season) => [season.wins, season.losses])) /
        10,
    ) * 10,
  );
  const plot = { left: 40, top: 16, width: Math.max(836, seasons.length * 38), height: 180 };
  const step = plot.width / seasons.length;
  const barWidth = Math.min(14, step * 0.32);
  const y = (value: number) =>
    plot.top + plot.height - (value / maximum) * plot.height;
  return (
    <section
      className="ry-people-section ry-season-chart"
      aria-labelledby="ry-seasons-title"
    >
      <div className="ry-people-section-head">
        <h2 id="ry-seasons-title">Resultados por temporada</h2>
        <div className="ry-chart-legend">
          <span className="ry-chart-key ry-chart-key-win">Victorias</span>
          <span className="ry-chart-key ry-chart-key-loss">Derrotas</span>
        </div>
      </div>
      <p className="nc-meta">
        Victorias y derrotas por año. Un hueco indica que no hay partidos registrados.
      </p>
      <p id="ry-season-chart-description" className="nc-sr">
        {seasons.map((season) => season.result
          ? `${season.year}: ${season.result.wins} victorias y ${season.result.losses} derrotas`
          : `${season.year}: sin partidos registrados`).join(". ")}. Escala común de cero a {maximum} partidos.
      </p>
      <div className="ry-season-highlights">
        {selectedResult && <p><strong>{number(selectedResult.wins)}–{number(selectedResult.losses)}</strong><span>{selected} · victorias y derrotas</span></p>}
        {best && <p><strong>{number(best[1].wins)}</strong><span>victorias en {best[0]} · máximo registrado</span></p>}
      </div>
      <div className="ry-season-chart-scroll">
        <svg
          viewBox={`0 0 ${plot.width + 64} 236`}
          style={{ minWidth: `${plot.width + 64}px` }}
          role="img"
          aria-labelledby="ry-seasons-title ry-season-chart-description"
        >
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = (maximum / 4) * tick;
            return (
              <g key={tick}>
                <line
                  className="ry-chart-grid"
                  x1={plot.left}
                  x2={plot.left + plot.width}
                  y1={y(value)}
                  y2={y(value)}
                />
                <text
                  className="ry-chart-axis"
                  x={plot.left - 10}
                  y={y(value) + 4}
                  textAnchor="end"
                >
                  {number(value)}
                </text>
              </g>
            );
          })}
          {seasons.map((season, index) => {
            const x = plot.left + step * (index + 0.5);
            const label =
              seasons.length <= 14 ||
              index === 0 ||
              index === seasons.length - 1 ||
              season.year % 5 === 0 ||
              season.year === selected;
            return (
              <a
                key={season.year}
                href={season.result ? `/players/${slug}?year=${season.year}#temporada` : undefined}
                aria-label={season.result ? `Calendario ${season.year}: ${season.result.wins} victorias, ${season.result.losses} derrotas` : `${season.year}: sin partidos registrados`}
              >
                {season.year === selected && (
                  <rect
                    className="ry-chart-selection"
                    x={x - step / 2 + 1}
                    y={plot.top}
                    width={Math.max(1, step - 2)}
                    height={plot.height}
                  />
                )}
                {season.result ? <>
                  <rect
                    className="ry-chart-win"
                    x={x - barWidth - 1}
                    y={y(season.result.wins)}
                    width={barWidth}
                    height={(plot.height * season.result.wins) / maximum}
                  />
                  <rect
                    className="ry-chart-loss"
                    x={x + 1}
                    y={y(season.result.losses)}
                    width={barWidth}
                    height={(plot.height * season.result.losses) / maximum}
                  />
                </> : <line className="ry-chart-empty" x1={x} x2={x} y1={plot.top + plot.height - 20} y2={plot.top + plot.height} />}
                {label && (
                  <text
                    className={`ry-chart-axis${season.year === selected ? " ry-chart-selected-year" : ""}`}
                    x={x}
                    y={220}
                    textAnchor="middle"
                  >
                    {season.year}
                  </text>
                )}
              </a>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const player = (await notebook()).players.find(
    (p) => playerSlug(p.name) === slug,
  );
  return {
    title: `${player?.name || "Jugador"} — DEUCE`,
    description: player
      ? `${player.name}: resultados, superficies y temporadas en el archivo DEUCE.`
      : "Resultados de los torneos ATP guardados en DEUCE.",
    alternates: {
      canonical: `/players/${slug}${query.year ? `?year=${query.year}` : ""}`,
    },
  };
}

export default async function Player({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await notebook();
  const player = data.players.find(
    (p) =>
      playerSlug(p.name) === playerSlug(canonicalName(slug.replace(/-/g, " "))),
  );
  if (!player) notFound();
  if (playerSlug(player.name) !== slug)
    permanentRedirect(`/players/${playerSlug(player.name)}`);
  const record = data.records.find((r) => r.name === player.name);
  if (!record) notFound();
  const portrait = playerPhoto(player.name);
  const years = [...new Set(player.matches.map((m) => m.year))].sort(
    (a, b) => b - a,
  );
  const bio = playerBiography(player.name);
  const year = years.includes(Number(query.year))
    ? Number(query.year)
    : years[0];
  const calendar = playerSeason(player.matches, player.name, year);
  const fact = playerFact(player.name, player.matches);
  const eras =
    eraComparisons(player.matches, 2020, player.name)[0] ||
    eraComparisons(player.matches, 2010, player.name)[0];
  const surfaceMaximum = Math.max(
    1,
    ...Object.values(player.bySurface).map((surface) => surface.played),
  );
  const directoryByName = new Map(
    tournamentDirectory(data.matches).map((entry) => [entry.name, entry]),
  );
  const tournaments = [
    ...new Set(player.matches.map((match) => match.tournament)),
  ]
    .flatMap((name) => {
      const matches = player.matches.filter((m) => m.tournament === name);
      if (!matches.length) return [];
      const finals = matches.filter((m) => m.round.toLowerCase() === "final");
      const latest = matches.reduce((current, match) => match.year > current.year ? match : current, matches[0]);
      return [
        {
          name: tournamentName(name),
          slug: directoryByName.get(name)?.slug || playerSlug(name),
          surface: latest.surface,
          category: latest.category,
          played: matches.length,
          wins: matches.filter((m) => winnerName(m) === player.name).length,
          finals: finals.length,
          titles: finals.filter((m) => winnerName(m) === player.name).length,
        },
      ];
    })
    .sort((a, b) => b.titles - a.titles || b.wins - a.wins);
  const tournamentWinsMaximum = Math.max(1, ...tournaments.map((entry) => entry.wins));

  const summary = (
    <>
      <SeasonChart
        matches={player.matches}
        name={player.name}
        slug={slug}
        selected={year}
      />
      <div className="ry-profile-analysis">
        <section
          className="ry-people-section ry-player-surfaces"
          aria-labelledby="ry-player-surfaces-title"
        >
          <h2 id="ry-player-surfaces-title">Balance por superficie</h2>
          <p className="nc-meta">
            Victorias y derrotas · escala común de 0 a {number(surfaceMaximum)}{" "}
            partidos.
          </p>
          <dl className="ry-player-surface-list">
            {(["hard", "clay", "grass"] as const).map((surface) => {
              const result = player.bySurface[surface];
              return (
                <div key={surface} data-event-surface={surface}>
                  <dt>
                    {surfaceLabel[surface]}
                    <span>{number(result.played)} partidos</span>
                  </dt>
                  <dd>
                    <span className="ry-player-surface-record">
                      <strong>
                        {number(result.won)}
                        <span>V</span>
                      </strong>
                      <strong>
                        {number(result.played - result.won)}
                        <span>D</span>
                      </strong>
                      {result.played > 0 && (
                        <span className="ry-surface-rate">
                          {number((result.won / result.played) * 100, 1)} %
                          {result.played < 50 ? " · muestra pequeña" : ""}
                        </span>
                      )}
                    </span>
                    <span
                      className="ry-player-surface-track"
                      aria-hidden="true"
                    >
                      <span
                        style={{
                          width: `${(result.won / surfaceMaximum) * 100}%`,
                        }}
                      />
                      <span
                        style={{
                          width: `${((result.played - result.won) / surfaceMaximum) * 100}%`,
                        }}
                      />
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
        <PlayerFingerprint player={record} archive={data.records} />
      </div>
      <section
        className="ry-people-section ry-calendar"
        id="temporada"
        aria-labelledby="ry-season-title"
      >
        <div className="ry-people-section-head">
          <h2 id="ry-season-title">Calendario del archivo</h2>
          <span className="ry-selected-season">{year}</span>
        </div>
        <nav className="ry-season-years" aria-label="Temporada del jugador">
          {years.map((season) => (
            <Link
              key={season}
              href={`/players/${slug}?year=${season}#temporada`}
              aria-current={season === year ? "true" : undefined}
            >
              {season}
            </Link>
          ))}
        </nav>
        <div className="ry-circuit" role="list">
          {calendar.map((entry) => (
            <div
              className={`ry-circuit-cell${entry.outcome === "Campeón" ? " ry-circuit-champion" : ""}`}
              key={entry.tournament}
              role="listitem"
              data-event-surface={entry.last?.surface}
              data-event-category={entry.last?.category}
            >
              {entry.last ? (
                <Link href={`/match/${entry.last.match_id}`}>
                  <span>{tournamentName(entry.tournament)}</span>
                  <strong>
                    {entry.outcome === "Campeón"
                      ? "Campeón"
                      : roundLabel(entry.last.round)}
                  </strong>
                  <span className="nc-sr">{entry.outcome}</span>
                </Link>
              ) : (
                <div>
                  <span>{tournamentName(entry.tournament)}</span>
                  <strong>Sin registro</strong>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="nc-meta ry-calendar-note">
          Solo partidos completos y validados. La ausencia de registro no
          confirma que no disputara el torneo.
        </p>
      </section>
      <section className="ry-people-section ry-player-results" id="resultados">
        <div className="ry-people-section-head">
          <h2>Últimos partidos</h2>
          <Link
            className="nc-link"
            href={`/buscar?player=${encodeURIComponent(player.name)}`}
          >
            Todos sus partidos
          </Link>
        </div>
        <div className="ry-people-match-list">
          {[...player.matches]
            .sort((a, b) => chronological(b, a))
            .slice(0, 10)
            .map((match) => (
              <Row key={match.match_id} match={match} />
            ))}
        </div>
      </section>
    </>
  );
  const details = (
    <>
      <section
        className="ry-people-section"
        aria-labelledby="ry-player-tournaments-title"
      >
        <h2 id="ry-player-tournaments-title">Torneos y finales</h2>
        <p className="nc-meta">
          Finales ganadas, finales disputadas y victorias. Solo este archivo.
        </p>
        <div className="ry-player-table-scroll">
          <table className="ry-player-table">
            <caption>Victorias con escala común de 0 a {number(tournamentWinsMaximum)} partidos.</caption>
            <thead>
              <tr>
                <th scope="col">Torneo</th>
                <th scope="col">Títulos</th>
                <th scope="col">Finales</th>
                <th scope="col">Victorias</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tournament) => (
                <tr key={tournament.slug} data-event-surface={tournament.surface} data-event-category={tournament.category}>
                  <th scope="row">
                    <Link
                      href={`/buscar?player=${encodeURIComponent(player.name)}&tournament=${tournament.slug}`}
                    >
                      {tournament.name}
                    </Link>
                  </th>
                  <td>{number(tournament.titles)}</td>
                  <td>{number(tournament.finals)}</td>
                  <td>
                    <span className="ry-tournament-win-numbers"><strong>{number(tournament.wins)}</strong> de {number(tournament.played)}</span>
                    <span className="ry-tournament-win-track" aria-hidden="true"><i style={{ width: `${tournament.wins / tournamentWinsMaximum * 100}%` }} /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {eras && (
        <section className="ry-people-section">
          <h2>Efectividad en finales por época</h2>
          <p className="nc-meta">
            Mínimo 5 finales en cada tramo. Solo este archivo.
          </p>
          <div className="ry-player-eras">
            {[eras.before, eras.after].map((era) => (
              <div key={era.from}>
                <p className="nc-meta">
                  {era.from}–{era.to}
                </p>
                <p
                  className={`ry-player-era-rate${era.played < 50 ? " ry-player-era-small" : ""}`}
                >
                  {number((era.won / era.played) * 100, 1)} %
                </p>
                <p>
                  {number(era.won)}–{number(era.played - era.won)}{" "}
                  <span className="nc-meta">
                    · {number(era.played)} finales
                    {era.played < 50 ? " · muestra pequeña" : ""}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
  return (
    <div className="nc-wrap ry-player-page">
      <nav className="ry-people-breadcrumb" aria-label="Ruta de navegación">
        <Link href="/players">Jugadores</Link>
        <span aria-hidden="true">/</span>
        <span>{player.name}</span>
      </nav>
      <header
        className={`ry-player-header ry-photo-player-header${portrait ? " ry-player-with-photo" : ""}`}
      >
        <div className="ry-player-identity">
          <h1>{player.name}</h1>
          <p className="ry-player-period">
            {years.at(-1)}–{years[0]}{" "}
            <span>· {number(years.length)} temporadas registradas</span>
          </p>
          <p className="nc-meta">Grand Slams y torneos ATP de este archivo.</p>
          <dl className="ry-player-totals">
            <div>
              <dt>Victorias</dt>
              <dd>{number(player.won)}</dd>
              <span>de {number(player.played)} partidos</span>
            </div>
            <div>
              <dt>Finales ganadas</dt>
              <dd>{number(record.finalsWon)}</dd>
              <span>de {number(record.finalsPlayed)} finales</span>
            </div>
            <div>
              <dt>Efectividad</dt>
              <dd>{number((player.won / player.played) * 100, 1)} %</dd>
              <span>{number(player.won)} de {number(player.played)} partidos</span>
            </div>
          </dl>
          {bio && Object.keys(bio).length > 0 && (
            <dl className="ry-player-bio">
              {bio.country && (
                <div>
                  <dt>País</dt>
                  <dd>{countryLabel(bio.country)}</dd>
                </div>
              )}
              {bio.birthday && (
                <div>
                  <dt>Nacimiento</dt>
                  <dd>{birthLabel(bio.birthday)}</dd>
                </div>
              )}
              {bio.hand && (
                <div>
                  <dt>Mano</dt>
                  <dd>{handLabel(bio.hand)}</dd>
                </div>
              )}
              {bio.backhand && (
                <div>
                  <dt>Revés</dt>
                  <dd>{backhandLabel(bio.backhand)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
        {portrait && (
          <figure className="ry-photo-player">
            <Image
              src={portrait.src}
              alt={portrait.alt}
              width={640}
              height={760}
              sizes="(max-width: 649px) calc(100vw - 32px), (max-width: 1199px) 38vw, 440px"
              priority
              unoptimized
            />
          </figure>
        )}
      </header>
      {fact && (
        <section className="ry-people-section ry-player-fact">
          <h2>{fact.text}</h2>
          <Link className="nc-link" href={`/match/${fact.proof.match_id}`}>
            Ver partido · {tournamentName(fact.proof.tournament)}{" "}
            {fact.proof.year}
          </Link>
        </section>
      )}
      <PeopleTabs
        key={`${year}-${query.vista || "resumen"}`}
        baseHref={`/players/${slug}?year=${year}`}
        initial={query.vista}
        panels={[
          { id: "resumen", label: "Resumen", content: summary },
          { id: "torneos", label: "Torneos y finales", content: details },
        ]}
      />
    </div>
  );
}
