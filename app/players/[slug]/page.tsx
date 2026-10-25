import { archiveStories } from '@/lib/archive-stories';
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
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
  roundPosition,
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
import { eraComparisons } from "@/lib/revista/records";
import { tournamentDirectory } from "@/lib/tournament-directory";
import type { Match } from "@/lib/types";
import { SURFACES } from "@/lib/surface";
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import PlayerPortrait from '@/components/PlayerPortrait';
import PlayerDiscovery from '@/components/PlayerDiscovery';
import { playerDiscoveries } from '@/components/PlayerDiscoveryData';

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
  const recentSeasons = seasons.slice(-8).reverse();
  const earlierSeasons = seasons.slice(0, -8).reverse();
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
      <p id="ry-season-chart-description" className="nc-sr">
        {seasons.map((season) => season.result
          ? `${season.year}: ${season.result.wins} victorias y ${season.result.losses} derrotas`
          : `${season.year}: sin partidos registrados`).join(". ")}. Escala común de cero a {maximum} partidos.
      </p>
      <div className="ry-season-highlights">
        {selectedResult && <p><strong>{number(selectedResult.wins)}–{number(selectedResult.losses)}</strong><span>{selected} · {number(selectedResult.wins + selectedResult.losses)} partidos</span></p>}
        {best && <p><strong>{number(best[1].wins)}</strong><span>victorias en {best[0]} · máximo registrado</span></p>}
      </div>
      <div className="ry-season-chart-scroll">
        <svg
          viewBox={`0 0 ${plot.width + 64} 236`}
          style={{ minWidth: `${plot.width + 64}px` }}
          role="group"
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
                <title>{season.result
                  ? `${season.year}: ${season.result.wins} victorias y ${season.result.losses} derrotas`
                  : `${season.year}: sin partidos registrados`}</title>
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
      <div className="ry-season-mobile" aria-label="Resultados por temporada, de más reciente a más antigua">
        <div className="ry-season-mobile-list">
          {recentSeasons.map((season) => (
            <SeasonMobileRow key={season.year} season={season} slug={slug} selected={selected} />
          ))}
        </div>
        {earlierSeasons.length > 0 && (
          <details className="ry-season-older">
            <summary>Ver {number(earlierSeasons.length)} temporadas anteriores</summary>
            <div className="ry-season-mobile-list">
              {earlierSeasons.map((season) => (
                <SeasonMobileRow key={season.year} season={season} slug={slug} selected={selected} />
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function SeasonMobileRow({
  season,
  slug,
  selected,
}: {
  season: { year: number; result: { wins: number; losses: number } | null };
  slug: string;
  selected: number;
}) {
  const total = (season.result?.wins || 0) + (season.result?.losses || 0);
  const content = (
    <>
      <span className="ry-season-mobile-heading">
        <strong>{season.year}</strong>
        {season.result && <b>{number((season.result.wins / total) * 100, 1)} %</b>}
      </span>
      {season.result ? (
        <>
          <span className="ry-season-mobile-balance">
            {number(season.result.wins)} victorias · {number(season.result.losses)} derrotas · {number(total)} partidos
          </span>
          <span className="ry-season-mobile-track" aria-hidden="true">
            <i style={{ width: `${(season.result.wins / total) * 100}%` }} />
          </span>
        </>
      ) : <span className="ry-season-mobile-missing">Sin partidos registrados</span>}
    </>
  );
  return season.result ? (
    <Link
      className="ry-season-mobile-row"
      aria-current={season.year === selected ? "true" : undefined}
      href={`/players/${slug}?year=${season.year}#temporada`}
    >
      {content}
    </Link>
  ) : <div className="ry-season-mobile-row ry-season-mobile-empty">{content}</div>;
}

function RankingHistory({ matches, name }: { matches: Match[]; name: string }) {
  const yearlyBest = new Map<number, number>();
  for (const match of matches) {
    if (match.context?.rankLabel !== "Ranking al jugar") continue;
    const rank = match.player1.name === name ? match.context.rank1 : match.context.rank2;
    if (!rank || rank < 1) continue;
    yearlyBest.set(match.year, Math.min(yearlyBest.get(match.year) || Infinity, rank));
  }
  const points = [...yearlyBest].sort((a, b) => a[0] - b[0]);
  if (!points.length) return null;
  const width = Math.max(620, points.length * 54);
  const height = 190;
  const padding = { left: 46, right: 22, top: 22, bottom: 34 };
  const maximum = Math.max(10, ...points.map(([, rank]) => rank));
  const x = (index: number) => padding.left + (points.length === 1 ? 0 : index * (width - padding.left - padding.right) / (points.length - 1));
  const y = (rank: number) => padding.top + ((rank - 1) / Math.max(1, maximum - 1)) * (height - padding.top - padding.bottom);
  const path = points.map(([, rank], index) => `${index ? "L" : "M"}${x(index)},${y(rank)}`).join(" ");
  const best = points.reduce((current, point) => point[1] < current[1] ? point : current, points[0]);
  return <section className="ry-people-section ry-ranking-history" aria-labelledby="ry-ranking-title">
    <div className="ry-people-section-head">
      <div><h2 id="ry-ranking-title">Evolución del ranking</h2><p>Mejor ranking documentado en cada temporada.</p></div>
      <p className="ry-ranking-best"><strong>n.º {number(best[1])}</strong><span>{best[0]}</span></p>
    </div>
    <p id="ry-ranking-description" className="nc-sr">{points.map(([year, rank]) => `${year}: puesto ${rank}`).join(". ")}.</p>
    <div className="ry-ranking-scroll" role="region" aria-label="Gráfica desplazable de evolución del ranking" tabIndex={0}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: `${width}px` }} role="img" aria-labelledby="ry-ranking-title ry-ranking-description">
        {[1, Math.max(2, Math.round(maximum / 2)), maximum].map((rank) => <g key={rank}>
          <line className="ry-ranking-grid" x1={padding.left} x2={width - padding.right} y1={y(rank)} y2={y(rank)} />
          <text className="ry-chart-axis" x={padding.left - 10} y={y(rank) + 4} textAnchor="end">{rank}</text>
        </g>)}
        {points.length > 1 && <path className="ry-ranking-line" d={path} />}
        {points.map(([year, rank], index) => <g key={year}>
          <title>{`${year}: puesto ${rank}`}</title>
          <circle className="ry-ranking-point" cx={x(index)} cy={y(rank)} r="5" />
          <text className="ry-chart-axis" x={x(index)} y={height - 10} textAnchor="middle">{year}</text>
        </g>)}
      </svg>
    </div>
  </section>;
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const player = (await notebook()).players.find(
    (p) => playerSlug(p.name) === slug,
  );
  const title = `${player?.name || "Jugador"} — DEUCE`;
  const summary = player
      ? `${player.name}: resultados, superficies y temporadas en el archivo DEUCE.`
      : "Resultados de los torneos ATP guardados en DEUCE.";
  return {
    title,
    description: summary,
    alternates: {
      canonical: `/players/${slug}${query.year ? `?year=${query.year}` : ""}`,
    },
    openGraph: { title, description: summary, type: "profile", url: `/players/${slug}` },
    twitter: { card: "summary_large_image", title, description: summary },
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
  const eras =
    eraComparisons(player.matches, 2020, player.name)[0] ||
    eraComparisons(player.matches, 2010, player.name)[0];
  const directoryByName = new Map(
    tournamentDirectory(data.matches).map((entry) => [entry.name, entry]),
  );
  const discoveries = playerDiscoveries(player.name, player.matches, new Map([...directoryByName].map(([name, entry]) => [name, entry.slug])));
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
      <RankingHistory matches={player.matches} name={player.name} />
      <div className="ry-profile-analysis">
        <section
          className="ry-people-section ry-player-surfaces"
          aria-labelledby="ry-player-surfaces-title"
        >
          <h2 id="ry-player-surfaces-title">Balance por superficie</h2>
          <dl className="ry-player-surface-list">
            {SURFACES.filter(surface => player.bySurface[surface].played > 0).map((surface) => {
              const result = player.bySurface[surface];
              return (
                <div key={surface} data-event-surface={surface}>
                  <dt>
                    <span className="ry-surface-name">{surfaceLabel[surface]}</span>
                    <span>{number(result.played)} partidos</span>
                  </dt>
                  <dd>
                    <span className="ry-player-surface-record">
                      <strong>
                        {number(result.won)}
                        <span>victorias</span>
                      </strong>
                      <strong>
                        {number(result.played - result.won)}
                        <span>derrotas</span>
                      </strong>
                      {result.played > 0 && (
                        <span className="ry-surface-rate">
                          {number((result.won / result.played) * 100, 1)} %
                          {result.played < 50 && <small>muestra pequeña</small>}
                        </span>
                      )}
                    </span>
                    <span
                      className="ry-player-surface-track"
                      aria-hidden="true"
                    >
                      <span
                        style={{
                          width: `${(result.won / result.played) * 100}%`,
                        }}
                      />
                      <span
                        style={{
                          width: `${((result.played - result.won) / result.played) * 100}%`,
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
        <div className="pd-calendar-legend" aria-label="Resultados destacados del calendario">
          <span data-player-outcome="champion">Campeón</span>
          <span data-player-outcome="finalist">Finalista</span>
          <span data-player-outcome="semifinalist">Semifinal</span><span data-player-outcome="quarterfinalist">Cuartos</span><span data-player-outcome="round16">Octavos</span><span data-player-outcome="round32">Tercera ronda</span><span data-player-outcome="round64">Segunda ronda</span><span data-player-outcome="round128">Primera ronda</span>
        </div>
        <div className="ry-circuit" role="list">
          {calendar.map((entry) => {
            const outcome = entry.outcome === 'Campeón' ? 'champion'
              : entry.last && winnerName(entry.last) !== player.name && roundPosition(entry.last.round) === 7 ? 'finalist'
              : entry.last && winnerName(entry.last) !== player.name && roundPosition(entry.last.round) === 6 ? 'semifinalist'
              : entry.last ? ({5:'quarterfinalist',4:'round16',3:'round32',2:'round64',1:'round128'} as Record<number,string>)[roundPosition(entry.last.round)] : undefined;
            const label = outcome === 'champion' ? 'Campeón' : outcome === 'finalist' ? 'Finalista' : outcome === 'semifinalist' ? 'Semifinalista' : entry.last ? roundLabel(entry.last.round) : 'Sin registro';
            return (
            <div
              className={`ry-circuit-cell${entry.outcome === "Campeón" ? " ry-circuit-champion" : ""}`}
              key={entry.tournament}
              role="listitem"
              data-event-surface={entry.last?.surface}
              data-event-category={entry.last?.category}
              data-player-outcome={outcome}
            >
              {entry.last ? (
                <Link href={`/match/${entry.last.match_id}`}>
                  <span>{tournamentName(entry.tournament)}</span>
                  <strong>{label}</strong>
                  <span className="pd-calendar-balance">{number(entry.won)}–{number(entry.played - entry.won)} · {number(entry.played)} partidos</span>
                  <span className="nc-sr">{entry.outcome}</span>
                </Link>
              ) : (
                <div>
                  <span>{tournamentName(entry.tournament)}</span>
                  <strong>Sin registro</strong>
                </div>
              )}
            </div>
          );})}
        </div>

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
      <ArchiveNotice status={data} />
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
          <dl className="ry-player-totals">
            <div>
              <dt>Victorias</dt>
              <dd>{number(player.won)}<span>de {number(player.played)} partidos</span></dd>
            </div>
            <div>
              <dt>Finales ganadas</dt>
              <dd>{number(record.finalsWon)}<span>de {number(record.finalsPlayed)} finales</span></dd>
            </div>
            <div>
              <dt>Efectividad</dt>
              <dd>{number((player.won / player.played) * 100, 1)} %<span>{number(player.won)} de {number(player.played)} partidos</span></dd>
            </div>
          </dl>
          <Link className="ry-player-compare" href={`/comparar?a=${encodeURIComponent(player.name)}`}>
            Comparar jugador
          </Link>
          {bio && Object.keys(bio).length > 0 && (
            <dl className="ry-player-bio">
              {bio.country && (
                <div>
                  <dt>País</dt>
                  <dd className="pd-country">{countryLabel(bio.country)}</dd>
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
        {portrait && <PlayerPortrait photo={portrait} className="ry-photo-player" preload />}
      </header>
      {archiveStories(player.matches).length>0&&<nav className="archive-suggestions" aria-label="Historias de este jugador">{archiveStories(player.matches).map(story=><Link key={story.id} href={'/historias#'+story.id}>{story.title}</Link>)}</nav>}
      <PlayerDiscovery key={player.name} items={discoveries} />
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
