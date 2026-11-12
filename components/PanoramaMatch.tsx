import "@/app/panorama-match.css";
import Image from "next/image";
import Link from "next/link";
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
import { tournamentHref } from "@/lib/explore";
import { tournamentDirectory } from "@/lib/tournament-directory";
import { findStat, type StatRow } from "@/lib/statistics";
import { pressure, sentence } from "@/lib/cuaderno/model";
import PlayerFlag from "@/components/PlayerFlag";
import { compactMatchDate } from "@/lib/match-date";
import { matchInsights } from "@/lib/match-insights";
import { setAnalytics } from "@/lib/set-analytics";
import { MatchScoreboard } from "@/components/deuce/MatchScoreboard";
import { toMatchRecord } from "@/data/map-match";

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
  lowerIsBetter?: boolean;
  neutral?: boolean;
};

type ComparisonGroup = {
  key: string;
  title: string;
  rows: ComparisonRow[];
};

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function matchDate(match: Match) {
  return compactMatchDate({
    date: match.context?.date,
    dateLabel: match.context?.dateLabel,
    year: match.year,
    tournament: match.tournament,
  });
}

function MatchFlag({ name, tour, compact = false }: { name: string; tour: 'atp'|'wta'; compact?: boolean }) {
  const code = playerBiography(name,tour)?.country;
  return (
    <span className={`pm-flag${compact ? " pm-flag-compact" : ""}`} aria-hidden="true">
      <PlayerFlag code={code} />
    </span>
  );
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
        : hasFraction
          ? String(stat.won)
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

function leads(row: ComparisonRow, value: ComparisonValue, other: ComparisonValue) {
  if (row.neutral) return false;
  return row.lowerIsBetter ? isHigher(other, value) : isHigher(value, other);
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
    lowerIsBetter = false,
  ): ComparisonRow | null => {
    const separatedTotals: Record<string, string> = {
      "Service points won": "Service points played",
      "Return points won": "Return points played",
      "Service games won": "Service games played",
      "Return games won": "Return games played",
    };
    const value = (side: 1 | 2) => {
      const numerator = stat(side, name);
      if (percentage && numerator && (numerator.total === null || numerator.total <= 0) && separatedTotals[name]) {
        const denominator = stat(side, separatedTotals[name]);
        const won = numerator.won ?? Number.parseFloat(numerator.value.replace(",", "."));
        const total = denominator?.won ?? Number.parseFloat(denominator?.value.replace(",", ".") || "");
        if (Number.isFinite(won) && Number.isFinite(total) && total > 0 && won <= total) return fractionValue(won, total);
      }
      return valueFromStat(numerator, { percentage });
    };
    const first = value(1);
    const second = value(2);
    return first.main === "—" && second.main === "—"
      ? null
      : { key, label, first, second, lowerIsBetter };
  };
  const service: Array<ComparisonRow | null> = [
    row("aces", "Saques directos", "Aces"),
    row("double-faults", "Dobles faltas", "Double Faults", false, true),
    row("first-serve", "Primer saque ganado", "1st serve points won", true),
    row("second-serve", "Segundo saque ganado", "2nd serve points won", true),
    row("service-points", "Puntos ganados al saque", "Service points won", true),
    row("breaks-saved", "Breaks salvados", "Break points saved", true),
  ];
  const returnAndPressure: Array<ComparisonRow | null> = [
    row("return-points", "Puntos ganados al resto", "Return points won", true),
    row("first-return", "Resto sobre primer saque", "1st return points won", true),
    row("second-return", "Resto sobre segundo saque", "2nd return points won", true),
    row("breaks-converted", "Breaks convertidos", "Break points converted", true),
    row("total-points", "Puntos totales ganados", "Total points won"),
    firstPressure.some((player) => player.thirty[1] > 0)
      ? {
          key: "thirty",
          label: "Tras ganar el 30–30",
          first: fractionValue(firstPressure[0].thirty[0], firstPressure[0].thirty[1]),
          second: fractionValue(firstPressure[1].thirty[0], firstPressure[1].thirty[1]),
        }
      : null,
  ];
  const insights = matchInsights(match).map((insight) => ({
    key: insight.key,
    label: insight.label,
    first: insight.first,
    second: insight.second,
    group: insight.group,
    neutral: insight.neutral,
  }));
  const advancedGroups = [
    { key: 'control', title: 'Control del partido' },
    { key: 'decisive', title: 'Momentos decisivos' },
    { key: 'patterns', title: 'Patrones de juego' },
  ].map((group) => ({
    ...group,
    rows: insights.filter((insight) => insight.group === group.key),
  }));
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
    ...advancedGroups,
  ].filter((group) => group.rows.length);
}

function summaryMetrics(match: Match): ComparisonRow[] {
  const stat = (side: 1 | 2, name: string) =>
    findStat(match.statistics, side, name);
  const players = pressure(match);
  const totalPoints = [stat(1, "Total points won"), stat(2, "Total points won")] as const;
  const pointWins = totalPoints.map((item) => item?.won ?? null);
  const measuredPoints = pointWins[0] !== null && pointWins[1] !== null && pointWins[0] + pointWins[1] > 0
    ? pointWins[0] + pointWins[1]
    : null;
  const aces = [stat(1, "Aces"), stat(2, "Aces")] as const;
  const breaks = [
    stat(1, "Break points converted"),
    stat(2, "Break points converted"),
  ] as const;
  return [
    ...(measuredPoints
      ? [{
          key: "point-share",
          label: "Dominio de puntos",
          first: fractionValue(pointWins[0] as number, measuredPoints),
          second: fractionValue(pointWins[1] as number, measuredPoints),
        }]
      : []),
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
  ].slice(0, 3);
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
  return <div className="pm-shared-score"><MatchScoreboard match={toMatchRecord(match)} variant="detail"/></div>;
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
        <div className={`pm-key-comparison pm-key-comparison-${Math.min(metrics.length, 3)}`}>
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
              {group.rows.map((row) => {
                const termId = `pm-stat-${group.key}-${row.key}`;
                return (
                  <div key={row.key}>
                    <dt id={termId}>{row.label}</dt>
                    <dd aria-describedby={termId} className={leads(row, row.first, row.second) ? "is-stat-winner" : undefined}>
                      <span className="nc-sr">{names[0]}: </span>
                      {row.first.main}
                    </dd>
                    <dd aria-describedby={termId} className={leads(row, row.second, row.first) ? "is-stat-winner" : undefined}>
                      <span className="nc-sr">{names[1]}: </span>
                      {row.second.main}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function SetEvolution({ match }: { match: Match }) {
  const sets = setAnalytics(match);
  if (!sets.length) return null;
  const names = [match.player1.name, match.player2.name];
  return (
    <section className="pm-set-evolution" aria-labelledby="pm-set-evolution-title">
      <div className="pm-section-heading">
        <h2 id="pm-set-evolution-title">Evolución por set</h2>
      </div>
      <div className="pm-set-track">
        {sets.map((set) => (
          <article key={set.set}>
            <header>
              <span>Set {set.set}</span>
              <strong>{set.games[0]}–{set.games[1]}</strong>
            </header>
            <div className="pm-set-share" aria-label={`${names[0]} ${Math.round(set.pointShare[0])} %, ${names[1]} ${Math.round(set.pointShare[1])} %`}>
              <i style={{ width: `${set.pointShare[0]}%` }} />
            </div>
            <div className="pm-set-points">
              {set.points.map((points, side) => (
                <span key={names[side]}>
                  <small>{names[side]}</small>
                  <b>{points} pts</b>
                </span>
              ))}
            </div>
            <dl>
              <div><dt>Breaks</dt><dd>{set.breaks[0]}–{set.breaks[1]}</dd></div>
              <div><dt>Mayor racha</dt><dd>{set.longestRun[0]}–{set.longestRun[1]}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function Meeting({ match, names }: { match: Match; names: [string, string] }) {
  const record=toMatchRecord(match);
  if(names[0]===match.player2.name){
    record.players=[record.players[1],record.players[0]];
    record.winnerIndex=record.winnerIndex===undefined?undefined:record.winnerIndex===0?1:0;
    record.sets=record.sets.map(set=>({...set,games:[set.games[1],set.games[0]],tieBreak:set.tieBreak?[set.tieBreak[1],set.tieBreak[0]]:undefined}));
  }
  return <MatchScoreboard match={record}/>;
}

function HeadToHead({ rivalry, names, tour }: { rivalry: RivalrySummary; names: [string, string]; tour:'atp'|'wta' }) {
  const wins = names.map((name) => rivalry.wins[rivalry.names.indexOf(name)]) as [number, number];
  const matches = [...rivalry.matches].sort((a, b) => chronological(b, a));
  const leading = wins[0] === wins[1] ? null : wins[0] > wins[1] ? 0 : 1;
  const visible = matches.slice(0, 3);
  const hidden = matches.slice(3);
  const years = matches.map((match) => match.year);
  const yearRange = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "sin fechas";
  return (
    <section className="pm-related" id="match-head-to-head" aria-labelledby="match-h2h-title">
      <div className="pm-h2h-heading">
        <h2 id="match-h2h-title">
          Cara a cara en todo el archivo
          <span className="pm-h2h-count" aria-hidden="true">{matches.length}</span>
        </h2>
        <span>{matches.length} {matches.length === 1 ? "partido" : "partidos"} · {yearRange}</span>
      </div>
      <div className="pm-h2h-card">
        <div className="pm-h2h-balance" aria-label={`${wins[0]} victorias a ${wins[1]}`}>
          {names.map((name, side) => (
            <div
              className={`pm-h2h-player${leading === side ? " is-leading" : ""}`}
              data-wins={wins[side]}
              key={name}
            >
              <MatchFlag name={name} tour={tour} />
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
  const tour = match.tour === 'wta' ? 'wta' : 'atp';
  const names = [match.player1.name, match.player2.name] as [string, string];
  const event = tournamentDirectory([match])[0];
  const eventHref = event ? tournamentHref(event.slug, tour, match.year) : '/torneos';
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
    <article className="pm-page">
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
            sizes="(max-width: 759px) 100vw, (max-width: 1304px) calc(100vw - 64px), 1240px"
            style={{
              "--pm-photo-position": photo.objectPosition || "50% 50%",
              "--pm-photo-position-mobile": photo.mobileObjectPosition || photo.objectPosition || "50% 50%",
            } as CSSProperties}
          />
        ) : (
          <div className="pm-surface-art" aria-hidden="true" />
        )}
        <div className="pm-photo-shade" aria-hidden="true" />
        <div className="pm-hero-inner">
          <div className="pm-event">
            <h1 id="pm-title"><Link href={eventHref}>{tournamentName(match.tournament)}</Link></h1>
            <p>{roundLabel(match.round)} · {matchDate(match)} · <Link href={eventHref}>Ver edición</Link></p>
          </div>
          <HeroScore match={match} />
        </div>
      </section>

      <SectionNav
        match={match}
        active={current}
        hasStatistics={Boolean(groups.length)}
        hasPressure={hasPressure}
        hasHeadToHead={Boolean(rivalry)}
      />
      <Summary match={match} />
      <SetEvolution match={match} />
      <Statistics match={match} groups={groups} />
      {rivalry ? <HeadToHead rivalry={rivalry} names={names} tour={tour} /> : null}
      {supplemental ? <section className="pm-supplemental">{supplemental}</section> : null}
    </article>
  );
}
