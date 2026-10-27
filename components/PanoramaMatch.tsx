import Image from "next/image";
import Link from "next/link";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import type { Match } from "@/lib/types";
import { tournamentName } from "@/lib/labels";
import { courtPhoto } from "@/lib/imagery";
import {
  chronological,
  roundLabel,
  winnerName,
} from "@/lib/editorial";
import {
  playerBiography,
} from "@/lib/player-bio";
import type { RivalrySummary } from "@/lib/explore";
import { findStat, type StatRow } from "@/lib/statistics";
import { pressure, sentence } from "@/lib/cuaderno/model";
import Share from "@/components/nocturno/Share";
import PlayerFlag from "@/components/PlayerFlag";
import { toMatchRecord } from "@/data/map-match";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-panorama-body",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-panorama-display",
});

export type PanoramaSection =
  | "resumen"
  | "estadisticas"
  | "presion"
  | "cara-a-cara";

type ComparisonValue = {
  main: string;
  detail?: string;
  numeric?: number;
};

type ComparisonRow = {
  key: string;
  label: string;
  first: ComparisonValue;
  second: ComparisonValue;
};

type ComparisonGroup = {
  key: string;
  title: string;
  rows: ComparisonRow[];
};

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14 5-7 7 7 7M7 12h12" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function matchDate(match: Match) {
  const value = match.context?.date || match.score_summary.timestamp;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(match.year);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .replaceAll(".", "");
}

function MatchFlag({ name, compact = false }: { name: string; compact?: boolean }) {
  const code = playerBiography(name)?.country;
  return code ? (
    <span className={`pm-flag${compact ? " pm-flag-compact" : ""}`} aria-hidden="true">
      <PlayerFlag code={code} />
    </span>
  ) : (
    <span
      className={`pm-flag pm-flag-empty${compact ? " pm-flag-compact" : ""}`}
      aria-hidden="true"
    />
  );
}

function setTie(score: string, index: number) {
  return score.trim().split(/\s+/)[index]?.match(/\((\d+)\)/)?.[1];
}

function valueFromStat(
  stat: StatRow["first"],
  options: { fraction?: boolean; percentage?: boolean } = {},
): ComparisonValue {
  if (!stat) return { main: "—" };
  const hasFraction = stat.won !== null && stat.total !== null && stat.total > 0;
  const numeric = hasFraction
    ? (stat.won! / stat.total!) * 100
    : Number.parseFloat(stat.value.replace(",", "."));
  return {
    main: options.fraction && hasFraction
      ? `${stat.won}/${stat.total}`
      : options.percentage && hasFraction
        ? `${Math.round((stat.won! / stat.total!) * 100)}%`
      : stat.value,
    ...(hasFraction && !options.fraction
      ? { detail: `${stat.won} de ${stat.total}` }
      : {}),
    ...(!Number.isNaN(numeric) ? { numeric } : {}),
  };
}

function fractionValue(won: number, total: number): ComparisonValue {
  if (!total) return { main: "—" };
  return {
    main: `${Math.round((won / total) * 100)}%`,
    detail: `${won} de ${total}`,
    numeric: (won / total) * 100,
  };
}

function isHigher(value: ComparisonValue, other: ComparisonValue) {
  return value.numeric !== undefined &&
    other.numeric !== undefined &&
    value.numeric > other.numeric;
}

function comparisonRows(match: Match) {
  const firstPressure = pressure(match);
  const stat = (side: 1 | 2, name: string) =>
    findStat(match.statistics, side, name);
  const row = (
    key: string,
    label: string,
    name: string,
    percentage = false,
  ): ComparisonRow | null => {
    const first = valueFromStat(stat(1, name), { percentage });
    const second = valueFromStat(stat(2, name), { percentage });
    return first.main === "—" && second.main === "—"
      ? null
      : { key, label, first, second };
  };
  const service: Array<ComparisonRow | null> = [
    row("aces", "Saques directos", "Aces"),
    row("first-serve", "Primer saque ganado", "1st serve points won", true),
    row("breaks-saved", "Breaks salvados", "Break points saved", true),
  ];
  const returnAndPressure: Array<ComparisonRow | null> = [
    row("return-points", "Puntos ganados al resto", "Return points won", true),
    row("breaks-converted", "Breaks convertidos", "Break points converted", true),
    firstPressure.some((player) => player.thirty[1] > 0)
      ? {
          key: "thirty",
          label: "Tras ganar el 30–30",
          first: fractionValue(firstPressure[0].thirty[0], firstPressure[0].thirty[1]),
          second: fractionValue(firstPressure[1].thirty[0], firstPressure[1].thirty[1]),
        }
      : null,
  ];
  return [
    {
      key: "service",
      title: "Servicio",
      rows: service.filter((item): item is ComparisonRow => Boolean(item)),
    },
    {
      key: "return-pressure",
      title: "Resto y presión",
      rows: returnAndPressure.filter(
        (item): item is ComparisonRow => Boolean(item),
      ),
    },
  ].filter((group) => group.rows.length);
}

function summaryMetrics(match: Match): ComparisonRow[] {
  const stat = (side: 1 | 2, name: string) =>
    findStat(match.statistics, side, name);
  const players = pressure(match);
  const aces = [stat(1, "Aces"), stat(2, "Aces")] as const;
  const breaks = [
    stat(1, "Break points converted"),
    stat(2, "Break points converted"),
  ] as const;
  return [
    ...(aces.some(Boolean)
      ? [{
          key: "aces",
          label: "Saques directos",
          first: valueFromStat(aces[0]),
          second: valueFromStat(aces[1]),
        }]
      : []),
    ...(breaks.some(Boolean)
      ? [{
          key: "breaks",
          label: "Breaks convertidos",
          first: valueFromStat(breaks[0], { fraction: true }),
          second: valueFromStat(breaks[1], { fraction: true }),
        }]
      : []),
    ...(players.some((player) => player.thirty[1] > 0)
      ? [{
          key: "thirty",
          label: "Juegos tras el 30–30",
          first: fractionValue(players[0].thirty[0], players[0].thirty[1]),
          second: fractionValue(players[1].thirty[0], players[1].thirty[1]),
        }]
      : []),
  ];
}

function comparisonSentence(match: Match, games: [number, number]) {
  const names = [match.player1.name, match.player2.name];
  const gameLeader = games[0] === games[1] ? null : games[0] > games[1] ? 0 : 1;
  const breaks = ([1, 2] as const).map((side) =>
    findStat(match.statistics, side, "Break points converted"),
  );
  const clauses: string[] = [];
  if (gameLeader !== null) {
    const difference = Math.abs(games[0] - games[1]);
    clauses.push(
      `${names[gameLeader]} ganó ${difference} ${difference === 1 ? "juego" : "juegos"} más`,
    );
  }
  if (breaks.every((item) => item && item.won !== null)) {
    const first = breaks[0]!.won!;
    const second = breaks[1]!.won!;
    if (first !== second) {
      const leader = first > second ? 0 : 1;
      const difference = Math.abs(first - second);
      clauses.push(
        `${clauses.length ? "y" : names[leader]} convirtió ${difference} ${difference === 1 ? "bola" : "bolas"} de break más`,
      );
    }
  }
  if (clauses.length) return `${clauses.join(" ")}.`;
  return sentence(match) || `${winnerName(match) || names[0]} resolvió el partido a su favor.`;
}

function HeroScore({ match }: { match: Match }) {
  const names = [match.player1.name, match.player2.name];
  const verified = match.quality?.result !== "review";
  return (
    <div
      className="pm-score"
      aria-label={`${winnerName(match) || names[0]} ganó el partido`}
    >
      {names.map((name, side) => {
        const won = verified && match.winner === side + 1;
        return (
          <div className={`pm-score-row${won ? " is-winner" : ""}`} key={name}>
            <div className="pm-player">
              <MatchFlag name={name} />
              <strong>{name}</strong>
              {won ? <Check /> : null}
            </div>
            <div
              className="pm-sets"
              aria-label={match.score_summary.games.map((set) => set[side]).join(", ")}
              style={{ "--score-set-count": match.score_summary.games.length } as CSSProperties}
            >
              {match.score_summary.games.map((set, index) => {
                const tie = setTie(match.final_score, index);
                const setWon = set[side] > set[1 - side];
                return (
                  <span className={setWon ? "won" : undefined} key={index}>
                    {set[side]}
                    {tie && !setWon ? <sup>{tie}</sup> : null}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Summary({ match }: { match: Match }) {
  const names = [match.player1.name, match.player2.name];
  const games = match.score_summary.games.reduce<[number, number]>(
    (total, set) => [total[0] + set[0], total[1] + set[1]],
    [0, 0] as [number, number],
  );
  const metrics = summaryMetrics(match);
  return (
    <section className="pm-summary" id="match-summary" aria-labelledby="match-summary-title">
      <div className="pm-summary-intro">
        <h2 id="match-summary-title">Resumen comparativo</h2>
        <p>{comparisonSentence(match, games)}</p>
      </div>
      <div className="pm-games">
        <h3>Juegos ganados</h3>
        <div className="pm-game-names">
          <span>{names[0]}</span>
          <span>{names[1]}</span>
        </div>
        <div className="pm-game-values">
          <strong className={games[0] > games[1] ? "is-stat-winner" : undefined}>{games[0]}</strong>
          <strong className={games[1] > games[0] ? "is-stat-winner" : undefined}>{games[1]}</strong>
        </div>
      </div>
      {metrics.length ? (
        <div className="pm-key-comparison">
          {metrics.map((metric) => (
            <article key={metric.key}>
              <span>{metric.label}</span>
              <div className="pm-metric-pair">
                {[metric.first, metric.second].map((value, side) => (
                  <span
                    className={isHigher(value, side ? metric.first : metric.second) ? "is-stat-winner" : undefined}
                    key={names[side]}
                  >
                    <small>{names[side]}</small>
                    <strong>{value.main}</strong>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Statistics({ match, groups }: { match: Match; groups: ComparisonGroup[] }) {
  const names = [match.player1.name, match.player2.name];
  if (!groups.length) return null;
  return (
    <section className="pm-statistics" id="match-statistics" aria-labelledby="match-statistics-title">
      <div className="pm-section-heading">
        <h2 id="match-statistics-title">Estadísticas</h2>
      </div>
      <div className="pm-stat-groups">
        {groups.map((group) => (
          <article
            className="pm-stat-group"
            id={group.key === "return-pressure" ? "match-pressure" : undefined}
            key={group.key}
          >
            <h3>{group.title}</h3>
            <div className="pm-stat-names">
              <span>{names[0]}</span>
              <span>{names[1]}</span>
            </div>
            <dl>
              {group.rows.map((row) => (
                <div key={row.key}>
                  <dd className={isHigher(row.first, row.second) ? "is-stat-winner" : undefined}>
                    {row.first.main}
                    {row.first.detail ? <small>{row.first.detail}</small> : null}
                  </dd>
                  <dt>{row.label}</dt>
                  <dd className={isHigher(row.second, row.first) ? "is-stat-winner" : undefined}>
                    {row.second.main}
                    {row.second.detail ? <small>{row.second.detail}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function categoryClass(category: string) {
  const value = category.toLowerCase();
  if (value.includes("grand slam")) return "is-grand-slam";
  if (value.includes("masters 1000")) return "is-masters";
  return undefined;
}

function Meeting({ match, names }: { match: Match; names: [string, string] }) {
  const positions = names.map((name) =>
    match.player1.name === name ? 0 : 1,
  ) as [number, number];
  return (
    <article className="pm-h2h-meeting">
      <header>
        <strong className={categoryClass(match.category)}>
          {tournamentName(match.tournament)}
        </strong>
        <span>{roundLabel(match.round)} · {matchDate(match)}</span>
      </header>
      <div className="pm-mini-score">
        {names.map((name, row) => {
          const side = positions[row];
          const won = match.winner === side + 1;
          return (
            <div className={`pm-mini-row${won ? " is-winner" : ""}`} key={name}>
              <span>
                <MatchFlag name={name} compact />
                <strong>{name}</strong>
                {won ? <Check /> : null}
              </span>
              <div
                className="pm-mini-sets"
                style={{
                  "--meeting-start": 6 - match.score_summary.games.length,
                } as CSSProperties}
              >
                {match.score_summary.games.map((set, index) => {
                  const setWon = set[side] > set[1 - side];
                  const tie = setTie(match.final_score, index);
                  return (
                    <b className={setWon ? "won" : undefined} key={index}>
                      {set[side]}
                      {tie && !setWon ? <sup>{tie}</sup> : null}
                    </b>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function HeadToHead({ rivalry, names }: { rivalry: RivalrySummary; names: [string, string] }) {
  const wins = names.map((name) => rivalry.wins[rivalry.names.indexOf(name)]) as [number, number];
  const matches = [...rivalry.matches].sort((a, b) => chronological(b, a));
  const leading = wins[0] === wins[1] ? null : wins[0] > wins[1] ? 0 : 1;
  const visible = matches.slice(0, 3);
  const hidden = matches.slice(3);
  return (
    <section className="pm-related" id="match-head-to-head" aria-labelledby="match-h2h-title">
      <div className="pm-h2h-heading">
        <h2 id="match-h2h-title">Cara a cara</h2>
        <span>{matches.length} {matches.length === 1 ? "partido" : "partidos"} de muestra</span>
      </div>
      <div className="pm-h2h-card">
        <div className="pm-h2h-balance" aria-label={`${wins[0]} victorias a ${wins[1]}`}>
          {names.map((name, side) => (
            <div className={`pm-h2h-player${leading === side ? " is-leading" : ""}`} key={name}>
              <MatchFlag name={name} />
              <strong>{name}</strong>
              <small>{wins[side]} {wins[side] === 1 ? "victoria" : "victorias"}</small>
            </div>
          )).reduce<ReactNode[]>((items, player, index) => {
            if (index === 1) {
              items.push(
                <div className="pm-h2h-score" key="balance">
                  <span>Balance</span>
                  <strong className={leading === 1 ? "is-right-leading" : undefined}>
                    <em>{wins[0]}</em><i>—</i><b>{wins[1]}</b>
                  </strong>
                </div>,
              );
            }
            items.push(player);
            return items;
          }, [])}
        </div>
        <div className="pm-h2h-history">
          {visible.map((meeting) => <Meeting match={meeting} names={names} key={meeting.match_id} />)}
        </div>
        {hidden.length ? (
          <details className="pm-h2h-more">
            <summary>
              <span className="pm-more-closed">Ver {hidden.length} más</span>
              <span className="pm-more-open">Ver menos</span>
              <ChevronDown />
            </summary>
            <div>
              {hidden.map((meeting) => <Meeting match={meeting} names={names} key={meeting.match_id} />)}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function SectionNav({
  match,
  active,
  hasStatistics,
  hasPressure,
  hasHeadToHead,
}: {
  match: Match;
  active: PanoramaSection;
  hasStatistics: boolean;
  hasPressure: boolean;
  hasHeadToHead: boolean;
}) {
  const sections = [
    { id: "resumen" as const, label: "Resumen", anchor: "match-summary", show: true },
    { id: "estadisticas" as const, label: "Estadísticas", anchor: "match-statistics", show: hasStatistics },
    { id: "presion" as const, label: "Presión", anchor: "match-pressure", show: hasPressure },
    { id: "cara-a-cara" as const, label: "Cara a cara", anchor: "match-head-to-head", show: hasHeadToHead },
  ].filter((section) => section.show);
  return (
    <nav className={`pm-local-nav pm-local-nav-${sections.length}`} aria-label="Secciones del partido">
      {sections.map((section) => (
        <Link
          className={active === section.id ? "is-current" : undefined}
          href={`/match/${match.match_id}?vista=${section.id}#${section.anchor}`}
          key={section.id}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}

export default function PanoramaMatch({
  match,
  rivalry,
  active = "resumen",
  supplemental,
}: {
  match: Match;
  rivalry?: RivalrySummary;
  active?: PanoramaSection;
  supplemental?: ReactNode;
}) {
  const names = [match.player1.name, match.player2.name] as [string, string];
  const photo = courtPhoto(match.tournament);
  const groups = comparisonRows(match);
  const hasPressure = groups.some((group) => group.key === "return-pressure");
  const current = active === "estadisticas" && !groups.length
    ? "resumen"
    : active === "presion" && !hasPressure
      ? "resumen"
      : active === "cara-a-cara" && !rivalry
        ? "resumen"
        : active;
  return (
    <article className={`pm-page ${geist.variable} ${bricolage.variable}`}>
      <section
        className={`pm-hero pm-surface-${match.surface}${photo ? "" : " pm-hero-no-photo"}`}
        aria-labelledby="pm-title"
      >
        {photo ? (
          <Image
            className="pm-photo"
            src={photo.src}
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 1040px"
          />
        ) : <div className="pm-surface-art" aria-hidden="true" />}
        <div className="pm-photo-shade" aria-hidden="true" />
        <div className="pm-hero-actions">
          <Link href="/buscar" aria-label="Volver a partidos"><ArrowLeft /></Link>
          <Share record={toMatchRecord(match)} iconOnly />
        </div>
        <div className="pm-event">
          <h1 id="pm-title">{tournamentName(match.tournament)}</h1>
          <p>{roundLabel(match.round)} · {matchDate(match)}</p>
        </div>
        <HeroScore match={match} />
      </section>

      <SectionNav
        match={match}
        active={current}
        hasStatistics={Boolean(groups.length)}
        hasPressure={hasPressure}
        hasHeadToHead={Boolean(rivalry)}
      />
      <Summary match={match} />
      <Statistics match={match} groups={groups} />
      {rivalry ? <HeadToHead rivalry={rivalry} names={names} /> : null}
      {supplemental ? <section className="pm-supplemental">{supplemental}</section> : null}
    </article>
  );
}
