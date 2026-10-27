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
import { imageFocus } from "@/lib/image-focus";

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
      ? `Historial de partidos entre ${people.names.join(" y ")} en DEUCE.`
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
      <header className="ry-pair-header ry-photo-pair-header">
        <h1>{people.names[0]} <span>VS</span> {people.names[1]}</h1>
        <div className="ry-pair-hero">
          <div className="ry-pair-person ry-pair-person-first">
            {portraits[0] && (
              <div className="ry-pair-photo">
                <Image
                  className="art-directed-photo"
                  src={portraits[0].src}
                  alt={portraits[0].alt}
                  width={640}
                  height={760}
                  sizes="(max-width: 649px) 44vw, (max-width: 1199px) 25vw, 320px"
                  priority
                  loading="eager"
                  style={imageFocus(portraits[0].objectPosition||'center top',portraits[0].mobileObjectPosition||portraits[0].objectPosition||'center top')}
                />
              </div>
            )}
            <h2>
              <Link href={`/jugadores/${playerSlug(people.names[0])}`}>
                {people.names[0]}
              </Link>
            </h2>
          </div>
          <div className="ry-pair-score-block">
            <p
              className="ry-pair-total"
              aria-label={`${people.names[0]}: ${people.wins[0]} victorias. ${people.names[1]}: ${people.wins[1]} victorias.`}
            >
              <span className={people.wins[0]>people.wins[1]?"is-leading":"is-trailing"}>{people.wins[0]}</span>
              <span className="ry-pair-score-divider" aria-hidden="true">
                –
              </span>
              <span className={people.wins[1]>people.wins[0]?"is-leading":"is-trailing"}>{people.wins[1]}</span>
            </p>
            <p className="ry-pair-score-label">Victorias</p>
          </div>
          <div className="ry-pair-person ry-pair-person-second">
            {portraits[1] && (
              <div className="ry-pair-photo">
                <Image
                  className="art-directed-photo"
                  src={portraits[1].src}
                  alt={portraits[1].alt}
                  width={640}
                  height={760}
                  sizes="(max-width: 649px) 44vw, (max-width: 1199px) 25vw, 320px"
                  priority
                  loading="eager"
                  style={imageFocus(portraits[1].objectPosition||'center top',portraits[1].mobileObjectPosition||portraits[1].objectPosition||'center top')}
                />
              </div>
            )}
            <h2>
              <Link href={`/jugadores/${playerSlug(people.names[1])}`}>
                {people.names[1]}
              </Link>
            </h2>
          </div>
        </div>
        <section className="ry-pair-surfaces" aria-labelledby="ry-pair-surfaces-title">
          <h2 id="ry-pair-surfaces-title">Por superficie</h2>
          <SurfaceScore names={people.names} rows={surfaces} />
        </section>
      </header>
      <section className="ry-people-section ry-pair-cuts" aria-labelledby="ry-pair-cuts-title">
          <h2 id="ry-pair-cuts-title">Partidos de máxima tensión</h2>
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
        <div className="ry-people-match-list">
          {matches.slice((page - 1) * 25, page * 25).map((match) => <Row key={match.match_id} match={match} firstPlayer={people.names[0]} />)}
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
