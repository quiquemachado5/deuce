import PlayerAvatar from '@/components/PlayerAvatar';
import Image from "next/image";
import Link from "next/link";
import { playerSlug, rivalryDirectory } from "@/lib/explore";
import { preparedGeneration } from "@/lib/revista/read-records";
import { number, description } from "@/lib/cuaderno/model";
import FilterForm from "@/components/revista/FilterForm";
import { Pagination } from "@/components/nocturno/Row";
import { normalizeText } from "@/lib/quality";
import { playerPhoto } from "@/lib/player-imagery";
import PairPicker from "@/components/analytics/PairPicker";

export const metadata = {
  title: "Jugadores y cara a cara — DEUCE",
  description,
  alternates: { canonical: "/jugadores" },
};

export default async function Players({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string; tipo?: string; sort?: string; letter?: string }>;
}) {
  const query = await searchParams;
  const pairs = query.tipo === "parejas";
  const generation = await preparedGeneration();
  const [recordSource, pairSource] = await Promise.all([
    pairs ? Promise.resolve([]) : generation.records(),
    pairs ? generation.matches() : Promise.resolve([]),
  ]);
  const term = normalizeText(query.q || "");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const requestedLetter = (query.letter || "").toUpperCase();
  const letter = alphabet.includes(requestedLetter) ? requestedLetter : "";
  const sort = query.sort === "played" || query.sort === "finals" ? query.sort : "wins";
  const records = new Map(recordSource.map((record) => [record.name, record]));
  const availableLetters = new Set(recordSource.map((record) => normalizeText(record.name).charAt(0).toUpperCase()));
  const players = recordSource.map((record) => ({ name: record.name, won: record.wins, played: record.played }))
    .filter((player) => normalizeText(player.name).includes(term))
    .filter((player) => !letter || normalizeText(player.name).charAt(0).toUpperCase() === letter)
    .sort((a, b) => {
      const primary = sort === "played" ? b.played - a.played
        : sort === "finals" ? (records.get(b.name)?.finalsWon || 0) - (records.get(a.name)?.finalsWon || 0)
        : b.won - a.won;
      return primary || b.won - a.won || a.name.localeCompare(b.name, "es");
    });
  const duels = pairs ? rivalryDirectory(pairSource).filter((pair) => normalizeText(pair.names.join(" ")).includes(term)) : [];
  const total = pairs ? duels.length : players.length;
  const page = Math.max(1, Math.min(Math.ceil(total / 25) || 1, Number(query.page) || 1));
  const url = (params: Record<string, string>) => {
    const next = new URLSearchParams();
    Object.entries({ ...query, ...params }).forEach(([key, value]) => {
      if (value && value !== "all" && !(key === "page" && value === "1")) next.set(key, value);
    });
    const search = next.toString();
    return `/jugadores${search ? `?${search}` : ""}`;
  };
  const leader = !term && !letter && !pairs ? players[0] : undefined;
  const runner = !term && !letter && !pairs ? players[1] : undefined;
  const metric = sort === "played" ? "partidos disputados" : sort === "finals" ? "finales ganadas" : "victorias";
  const valueOf = (name: string, won: number, played: number) => sort === "played" ? played : sort === "finals" ? records.get(name)?.finalsWon || 0 : won;
  const leadValue = leader ? valueOf(leader.name, leader.won, leader.played) : 0;
  const nextValue = runner ? valueOf(runner.name, runner.won, runner.played) : 0;
  const topPair = !term && pairs ? duels[0] : undefined;
  const pairPhotos = topPair?.names.map(playerPhoto) || [];

  return (
    <div className="nc-wrap ry-directory">
      <header className="ry-directory-head">
        <div>
          <div className="ry-directory-title-row"><h1>{pairs ? "Cara a cara" : "Jugadores"}</h1>
            <nav className="ry-directory-modes" aria-label="Explorar jugadores">
              <Link href="/jugadores" aria-current={!pairs ? "page" : undefined}>Jugadores</Link>
              <Link href="/jugadores?tipo=parejas" aria-current={pairs ? "page" : undefined}>Cara a cara</Link>
            </nav>
          </div>
          <p>{number(total)} {pairs ? "parejas" : "jugadores"} de este archivo.</p>
        </div>
      </header>

      <div className="ry-directory-toolbar ry-directory-toolbar-top">
        <FilterForm action="/jugadores">
          <input type="hidden" name="tipo" value={pairs ? "parejas" : "jugadores"} />
          <label className="nc-field nc-filter-query"><span>Buscar {pairs ? "un enfrentamiento" : "jugadores"}</span>
            <input name="q" defaultValue={query.q} placeholder={pairs ? "Djokovic, Nadal…" : "Buscar jugadores por nombre"} />
          </label>
          {!pairs && <label className="nc-field"><span>Ordenar por</span>
            <select name="sort" defaultValue={sort}>
              <option value="wins">Victorias</option>
              <option value="played">Partidos</option>
              <option value="finals">Finales ganadas</option>
            </select>
          </label>}
        </FilterForm>
      </div>

      {!pairs && <nav className="ry-player-alphabet" aria-label="Índice alfabético de jugadores">
        <Link href={url({ letter: "", page: "1" })} aria-current={!letter ? "page" : undefined}>Todos</Link>
        {alphabet.map((initial) => availableLetters.has(initial)
          ? <Link key={initial} href={url({ letter: initial, page: "1" })} aria-current={letter === initial ? "page" : undefined}>{initial}</Link>
          : <span key={initial} aria-disabled="true">{initial}</span>)}
      </nav>}

      {leader && (
        <section className="ry-directory-feature ry-directory-leader-feature">
          <div className="ry-directory-feature-copy">
            <div className="ry-directory-leader-heading"><PlayerAvatar name={leader.name} size={72} /><div><h2><Link href={`/players/${playerSlug(leader.name)}`}>{leader.name}</Link></h2><p className="ry-directory-feature-figure">{number(leadValue)}<span>{metric}</span></p></div></div>
            <p className="ry-directory-feature-context">
              {runner && leadValue > nextValue
                ? `${number(leadValue - nextValue)} más que ${runner.name}, segundo en esta lista.`
                : `${number(leader.won)} victorias en ${number(leader.played)} partidos de este archivo.`}
            </p>
            {runner && leadValue > 0 && <div className="ry-directory-lead-comparison" aria-label={`Comparación de ${metric}: ${leader.name}, ${number(leadValue)}; ${runner.name}, ${number(nextValue)}. Ambas barras utilizan la misma escala.`}>
              <div><span>{leader.name}</span><strong>{number(leadValue)}</strong><span className="ry-directory-lead-track" aria-hidden="true"><i style={{ width: `${leadValue / (leadValue * 1.08) * 100}%` }} /></span></div>
              <div><span>{runner.name}</span><strong>{number(nextValue)}</strong><span className="ry-directory-lead-track" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, nextValue / (leadValue * 1.08) * 100))}%` }} /></span></div>
            </div>}
          </div>
        </section>
      )}

      {topPair && (
        <section className="ry-directory-feature ry-directory-pair-feature">
          <div className="ry-directory-feature-copy">
            <p className="ry-directory-feature-label">El duelo más repetido en este archivo</p>
            <p className="ry-directory-feature-figure">{topPair.wins.join("–")}<span>{number(topPair.matches.length)} partidos</span></p>
            <h2><Link href={`/rivalries/${topPair.slug}`}>{topPair.names[0]} <span>contra</span> {topPair.names[1]}</Link></h2>
            <p className="ry-directory-feature-context">Parcial de estos torneos. No es el cara a cara de toda la carrera.</p>
          </div>
          {pairPhotos.some(Boolean) && <div className="ry-directory-pair-photos" aria-hidden="true">
            {pairPhotos.map((photo, index) => photo ? <div className="ry-directory-pair-photo" key={topPair.names[index]}>
              <Image src={photo.src} alt="" fill sizes="(max-width: 759px) 48vw, (max-width: 1099px) 20vw, 260px" unoptimized />
            </div> : null)}
          </div>}
        </section>
      )}

      {pairs && <details className="ry-directory-compare">
        <summary>Elegir dos jugadores para comparar</summary>
        <PairPicker />
      </details>}

      <section className="ry-directory-results" aria-labelledby="directory-results-title">
        <div className="ry-directory-results-head">
          <div>
            <h2 id="directory-results-title">{pairs ? "Enfrentamientos" : "Clasificación de jugadores"}</h2>
            {(term || letter || pairs) && <p>{term ? `${number(total)} resultados para «${query.q}»` : letter ? `${number(total)} jugadores cuyo nombre empieza por ${letter}` : "Ordenados por encuentros entre ambos."}</p>}
          </div>
          {(term || letter) && <Link href={pairs ? "/jugadores?tipo=parejas" : "/jugadores"}>Limpiar filtros</Link>}
        </div>

        {pairs ? <div className="ry-directory-pair-list">
          {duels.slice((page - 1) * 25, page * 25).map((pair, index) => <Link className="ry-directory-pair-row" key={pair.slug} href={`/rivalries/${pair.slug}`}>
            <span className="ry-directory-rank">{number((page - 1) * 25 + index + 1)}</span>
            <span className="ry-directory-pair-names">{pair.names[0]} <span>contra</span> {pair.names[1]}
              <small>{number(pair.matches.length)} partidos</small>
            </span>
            <strong>{pair.wins.join("–")}</strong>
          </Link>)}
        </div> : <div className="ry-directory-table-wrap">
          <p className="ry-directory-table-note">Resultados de este archivo; no es la clasificación ATP.</p>
          <table className="ry-directory-table">
            <caption className="nc-sr">Clasificación de jugadores por resultados de este archivo.</caption>
            <thead><tr>
              <th scope="col">Jugador</th>
              <th scope="col" aria-sort={sort === "wins" ? "descending" : "none"}><Link href={url({ sort: "wins", page: "1" })}>Victorias</Link></th>
              <th className="ry-directory-col-played" scope="col" aria-sort={sort === "played" ? "descending" : "none"}><Link href={url({ sort: "played", page: "1" })}>Partidos</Link></th>
              <th scope="col">Efectividad</th>
              <th className="ry-directory-col-finals" scope="col" aria-sort={sort === "finals" ? "descending" : "none"}><Link href={url({ sort: "finals", page: "1" })}>Títulos</Link></th>
            </tr></thead>
            <tbody>{players.slice((page - 1) * 25, page * 25).map((player, index) => <tr key={player.name}>
              <th scope="row"><span className="ry-directory-rank">{number((page - 1) * 25 + index + 1)}</span>
                <Link href={`/players/${playerSlug(player.name)}`}><PlayerAvatar name={player.name} size={40} />{player.name}</Link></th>
              <td className="ry-directory-wins">{number(player.won)}</td>
              <td className="ry-directory-col-played">{number(player.played)}</td>
              <td className="ry-directory-rate"><span>{number((100 * player.won) / player.played, 1)} %</span></td>
              <td className="ry-directory-col-finals">{number(records.get(player.name)?.finalsWon || 0)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        {!total && <p className="ry-directory-empty">Nada con ese nombre en el archivo. <Link href={pairs ? "/jugadores?tipo=parejas" : "/jugadores"}>Limpiar</Link></p>}
        <Pagination page={page} total={total} href={(nextPage) => url({ page: String(nextPage) })} />
      </section>
    </div>
  );
}
