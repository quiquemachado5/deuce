import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { playerPhoto } from "@/lib/player-imagery";
import SurfaceScore from "@/components/nocturno/SurfaceScore";
import { SURFACES } from "@/lib/surface";
import Row, { Pagination } from "@/components/nocturno/Row";
import { notebook } from "@/lib/cuaderno/data";
import { number } from "@/lib/cuaderno/model";
import { chronological, winnerName } from "@/lib/editorial";
import { playerSlug } from "@/lib/explore";
import { tiebreakCount } from "@/lib/archive-insights";
import type { Match } from "@/lib/types";

function RivalryTrajectory({
  names,
  matches,
}: {
  names: readonly [string, string];
  matches: Match[];
}) {
  const steps = matches.reduce<number[]>((values, match) => [
    ...values,
    (values.at(-1) || 0) + (winnerName(match) === names[0] ? 1 : -1),
  ], []);
  const difference = steps.at(-1) || 0;
  const maximum = Math.max(1, ...steps.map(Math.abs));
  const firstYear = matches[0]?.year;
  const lastYear = matches.at(-1)?.year;
  const middle = matches[Math.floor((matches.length - 1) / 2)]?.year;
  const path = `M 20 80 ${steps.map((step, index) => {
    const x = matches.length === 1 ? 880 : 28 + index * (844 / (matches.length - 1));
    return `L ${x} ${80 - (step / maximum) * 64}`;
  }).join(" ")}`;
  return (
    <section className="ry-pair-trajectory" aria-labelledby="ry-pair-trajectory-title">
      <div className="ry-pair-trajectory-head">
        <div>
          <h2 id="ry-pair-trajectory-title">Cómo cambió el duelo</h2>
          <p>Ventaja acumulada tras cada partido.</p>
        </div>
        <p><strong>{number(Math.abs(difference))}</strong> {difference === 0 ? "victorias de diferencia: empate" : `victorias de ventaja para ${names[difference > 0 ? 0 : 1]}`}</p>
      </div>
      <svg viewBox="0 0 900 160" role="img" aria-label={`Ventaja acumulada en ${matches.length} partidos. Por encima del eje lidera ${names[0]}; por debajo lidera ${names[1]}. Diferencia final: ${Math.abs(difference)}.`} preserveAspectRatio="none">
        <line className="ry-pair-zero" x1="20" x2="880" y1="80" y2="80" />
        <path className="ry-pair-trajectory-line" d={path} />
      </svg>
      <div className="ry-pair-trajectory-years" aria-hidden="true"><span>{firstYear}</span><span>{middle !== firstYear && middle !== lastYear ? middle : ""}</span><span>{lastYear}</span></div>
    </section>
  );
}

type Props = {
  params: Promise<{ pair: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { pair } = await params;
  const query = await searchParams;
  const paramsQuery = new URLSearchParams(
    Object.entries(query).filter(
      ([key, value]) => value && !(key === "page" && value === "1"),
    ) as [string, string][],
  );
  const people = (await notebook()).pairs.find((p) => p.slug === pair);
  return {
    title: `${people?.names.join(" – ") || "Cara a cara"} — DEUCE`,
    description: people
      ? `${people.matches.length} partidos entre ${people.names.join(" y ")} en este archivo. No es toda la carrera.`
      : "Grand Slams y Masters, leídos por el dato.",
    alternates: {
      canonical: `/rivalries/${pair}${paramsQuery.size ? `?${paramsQuery}` : ""}`,
    },
  };
}
export default async function Pair({ params, searchParams }: Props) {
  const { pair } = await params;
  const query = await searchParams;
  const people = (await notebook()).pairs.find((p) => p.slug === pair);
  if (!people) notFound();
  const portraits = people.names.map((name) => playerPhoto(name));
  const surfaces = SURFACES.filter(surface => people.matches.some(match => match.surface === surface)).map((surface) => {
    const matches = people.matches.filter((m) => m.surface === surface);
    return {
      surface,
      wins: people.names.map(
        (name) => matches.filter((m) => winnerName(m) === name).length,
      ) as [number, number],
      count: matches.length,
    };
  });
  if (
    surfaces.reduce((total, surface) => total + surface.count, 0) !==
      people.matches.length ||
    surfaces.some(
      (surface) => surface.wins[0] + surface.wins[1] !== surface.count,
    )
  )
    throw Error("El parcial por superficies no coincide con el total");
  const cuts = [
    {
      id: "finales",
      label: "Finales",
      test: (m: (typeof people.matches)[number]) =>
        m.round.toLowerCase() === "final",
    },
    {
      id: "desempates",
      label: "Partidos con tie-break",
      test: (m: (typeof people.matches)[number]) => tiebreakCount(m) > 0,
    },
    {
      id: "cinco",
      label: "Cinco sets",
      test: (m: (typeof people.matches)[number]) =>
        m.score_summary.games.length === 5,
    },
  ];
  const timeline = [...people.matches].sort(chronological);
  const running = [0, 0];
  let leader = -1;
  const changes = new Set<string>();
  const cumulative = new Map<string, [number, number]>();
  for (const match of timeline) {
    running[winnerName(match) === people.names[0] ? 0 : 1]++;
    cumulative.set(match.match_id, [running[0], running[1]]);
    const next =
      running[0] === running[1] ? -1 : running[0] > running[1] ? 0 : 1;
    if (next >= 0 && leader >= 0 && next !== leader)
      changes.add(match.match_id);
    if (next >= 0) leader = next;
  }
  const matches = timeline.filter((match) =>
    cuts.every((cut) => !query[cut.id] || cut.test(match)),
  );
  const page = Math.max(
    1,
    Math.min(Math.ceil(matches.length / 25) || 1, Number(query.page) || 1),
  );
  const tieWins: [number, number] = [0, 0],
    fiveWins: [number, number] = [0, 0],
    finalWins: [number, number] = [0, 0];
  for (const match of people.matches) {
    const left = match.player1.name === people.names[0] ? 0 : 1;
    const winner = winnerName(match) === people.names[0] ? 0 : 1;
    for (const set of match.score_summary.games)
      if (Math.max(...set) === 7 && Math.min(...set) === 6)
        tieWins[set[left] > set[1 - left] ? 0 : 1]++;
    if (match.score_summary.games.length === 5) fiveWins[winner]++;
    if (match.round.toLowerCase() === "final") finalWins[winner]++;
  }
  const cutHref = (id: string) => {
    const next = new URLSearchParams(
      Object.entries(query).filter(
        ([key, value]) => value && key !== "page",
      ) as [string, string][],
    );
    if (next.has(id)) next.delete(id);
    else next.set(id, "1");
    return `/rivalries/${pair}${next.size ? `?${next}` : ""}#secuencia`;
  };
  return (
    <div className="nc-wrap ry-pair-page">
      <nav className="ry-people-breadcrumb" aria-label="Ruta de navegación">
        <Link href="/rivalries">Cara a cara</Link>
        <span aria-hidden="true">/</span>
        <span>{people.names.join(" · ")}</span>
      </nav>
      <header className="ry-pair-header ry-photo-pair-header">
        <div className="ry-people-section-head">
          <div>
            <p className="ry-pair-overline">Cara a cara · {timeline[0].year}–{timeline.at(-1)!.year}</p>
            <h1>{people.names[0]} <span>contra</span> {people.names[1]}</h1>
          </div>
        </div>
        <div className="ry-pair-hero">
          <div className="ry-pair-person ry-pair-person-first">
            {portraits[0] && (
              <div className="ry-pair-photo">
                <Image
                  src={portraits[0].src}
                  alt={portraits[0].alt}
                  width={640}
                  height={760}
                  sizes="(max-width: 649px) 44vw, (max-width: 1199px) 25vw, 320px"
                  priority
                  loading="eager"
                />
              </div>
            )}
            <h2>
              <Link href={`/players/${playerSlug(people.names[0])}`}>
                {people.names[0]}
              </Link>
            </h2>
          </div>
          <div className="ry-pair-score-block">
            <p
              className="ry-pair-total"
              aria-label={`${people.names[0]}: ${people.wins[0]} victorias. ${people.names[1]}: ${people.wins[1]} victorias.`}
            >
              <span className="ry-p1">{people.wins[0]}</span>
              <span className="ry-pair-score-divider" aria-hidden="true">
                –
              </span>
              <span className="ry-p2">{people.wins[1]}</span>
            </p>
            <p className="ry-pair-score-label">Victorias</p>
          </div>
          <div className="ry-pair-person ry-pair-person-second">
            {portraits[1] && (
              <div className="ry-pair-photo">
                <Image
                  src={portraits[1].src}
                  alt={portraits[1].alt}
                  width={640}
                  height={760}
                  sizes="(max-width: 649px) 44vw, (max-width: 1199px) 25vw, 320px"
                  priority
                  loading="eager"
                />
              </div>
            )}
            <h2>
              <Link href={`/players/${playerSlug(people.names[1])}`}>
                {people.names[1]}
              </Link>
            </h2>
          </div>
        </div>
        <p className="ry-pair-scope">
          {number(people.matches.length)} partidos de este archivo. No es el cara a cara de toda la carrera.
        </p>
        <section className="ry-pair-surfaces" aria-labelledby="ry-pair-surfaces-title">
          <h2 id="ry-pair-surfaces-title">Por superficie</h2>
          <SurfaceScore names={people.names} rows={surfaces} />
        </section>
      </header>
      <section className="ry-people-section ry-pair-cuts" aria-labelledby="ry-pair-cuts-title">
          <h2 id="ry-pair-cuts-title">Finales, tie-breaks y cinco sets</h2>
          <dl>
            {[
              { label: "Finales ganadas", values: finalWins },
              { label: "Tie-breaks ganados", values: tieWins },
              { label: "Cinco sets ganados", values: fiveWins },
            ].map((cut) => {
              const total = cut.values[0] + cut.values[1];
              return (
              <div key={cut.label}>
                <dt>{cut.label}<small>{number(total)} {cut.label === "Tie-breaks ganados" ? "desempates" : "partidos"}</small></dt>
                <dd aria-label={`${people.names[0]}: ${number(cut.values[0])}. ${people.names[1]}: ${number(cut.values[1])}.`}>
                  <span className={cut.values[0] > cut.values[1] ? "ry-pair-leading" : undefined}>{number(cut.values[0])}</span>
                  <span aria-hidden="true">–</span>
                  <span className={cut.values[1] > cut.values[0] ? "ry-pair-leading" : undefined}>{number(cut.values[1])}</span>
                </dd>
              </div>
              );
            })}
          </dl>
      </section>
      <RivalryTrajectory names={people.names} matches={timeline} />
      <section className="ry-people-section ry-pair-sequence" id="secuencia">
        <div className="ry-people-section-head">
          <h2>Cronología de enfrentamientos</h2>
          <span className="nc-meta">{number(matches.length)} partidos</span>
        </div>
        <nav className="ry-pair-filter" aria-label="Filtrar enfrentamientos">
          <Link
            href={`/rivalries/${pair}#secuencia`}
            aria-current={
              !cuts.some((cut) => query[cut.id]) ? "true" : undefined
            }
          >
            Todos <span>{number(people.matches.length)}</span>
          </Link>
          {cuts.map((cut) => (
            <Link
              key={cut.id}
              href={cutHref(cut.id)}
              aria-current={query[cut.id] ? "true" : undefined}
            >
              {cut.label}{" "}
              <span>{number(people.matches.filter(cut.test).length)}</span>
            </Link>
          ))}
        </nav>
        <p className="nc-meta ry-pair-sequence-note">
          Del más antiguo al más reciente · marcador desde {people.names[0]}.
        </p>
        <div className="ry-people-match-list">
          {matches.slice((page - 1) * 25, page * 25).map((match) => {
            const total = cumulative.get(match.match_id)!;
            return (
              <div
                key={match.match_id}
                className={
                  changes.has(match.match_id) ? "ry-pair-turn" : undefined
                }
              >
                {changes.has(match.match_id) && (
                  <p className="ry-pair-turn-label">
                    <span>Cambio de líder</span>
                    {winnerName(match)} pasa al frente{" "}
                    <strong>
                      {total[0]}–{total[1]}
                    </strong>
                  </p>
                )}
                <Row match={match} firstPlayer={people.names[0]} />
              </div>
            );
          })}
        </div>
        {!matches.length && (
          <p className="ry-pair-empty">
            Ningún encuentro cumple estos cortes.{" "}
            <Link href={`/rivalries/${pair}#secuencia`}>Limpiar filtros</Link>
          </p>
        )}
        <Pagination
          page={page}
          total={matches.length}
          href={(nextPage) =>
            `/rivalries/${pair}?${new URLSearchParams({ ...query, page: String(nextPage) } as Record<string, string>)}#secuencia`
          }
        />
      </section>
    </div>
  );
}
