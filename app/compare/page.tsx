import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { preparedArchive } from "@/lib/revista/read-records";
import { playerPhoto } from "@/lib/player-imagery";
import { normalizeText } from "@/lib/quality";
import { number, round, score, sentence, surfaceLabel, tapeState } from "@/lib/cuaderno/model";
import { tournamentName } from "@/lib/labels";
import type { Match } from "@/lib/types";
import ReadingLine from "@/components/nocturno/ReadingLine";
import "./compare.css";

type Query = { left?: string; right?: string; q?: string; side?: string };
type Props = { searchParams: Promise<Query> };
const examples = ["archive-148401", "live-95178"] as const;
const games = (match: Match) => match.score_summary.games.reduce((sum, [a, b]) => sum + a + b, 0);
const tieBreaks = (match: Match) => match.score_summary.games.filter(([a, b]) => Math.max(a, b) === 7 && Math.min(a, b) === 6).length;
const lastSetGames = (match: Match) => match.score_summary.games.at(-1)?.reduce((sum, value) => sum + value, 0) || 0;
const winner = (match: Match) => match.winner === 2 ? match.player2.name : match.player1.name;
const matchTitle = (match: Match) => match.player1.name + " contra " + match.player2.name;
const address = (left: string, right: string) => "/compare?" + new URLSearchParams({ left, right });
const samePair = (left: Match, right: Match) =>
  [left.player1.name, left.player2.name].every((name) => name === right.player1.name || name === right.player2.name);
const sharedPlayer = (left: Match, right: Match) =>
  [left.player1.name, left.player2.name].some((name) => name === right.player1.name || name === right.player2.name);

function relatedMatch(left: Match, matches: Match[]) {
  const nearest = (predicate: (match: Match) => boolean) => matches
    .filter((match) => match.match_id !== left.match_id && predicate(match))
    .sort((a, b) => Math.abs(a.year - left.year) - Math.abs(b.year - left.year) || b.year - a.year)[0];
  return nearest((match) => samePair(left, match))
    || nearest((match) => match.tournament === left.tournament && match.round === left.round && match.score_summary.games.length === left.score_summary.games.length)
    || nearest((match) => sharedPlayer(left, match) && match.score_summary.games.length === left.score_summary.games.length)
    || nearest((match) => match.tournament === left.tournament && match.round === left.round);
}

function relationship(left: Match, right: Match) {
  if (samePair(left, right)) return "Se enfrentaron dos veces en este archivo.";
  if (left.tournament === right.tournament && left.round === right.round && left.score_summary.games.length === right.score_summary.games.length)
    return "Mismo torneo, misma ronda y " + number(left.score_summary.games.length) + " sets.";
  if (left.tournament === right.tournament && left.round === right.round) return "Mismo torneo y misma ronda.";
  const common = [left.player1.name, left.player2.name].find((name) => name === right.player1.name || name === right.player2.name);
  if (common) return "Los dos partidos los jugó " + common + ".";
  if (left.score_summary.games.length === 5 && right.score_summary.games.length === 5) return "Los dos llegaron al quinto set.";
  if (left.tournament === right.tournament) return "Los dos se jugaron en " + tournamentName(left.tournament) + ".";
  return "Dos partidos de este archivo, elegidos para leer juntos.";
}

function MatchIdentity({ match, position }: { match: Match; position: string }) {
  const name = winner(match), portrait = playerPhoto(name);
  return <section className="ry-compare-identity" data-event-surface={match.surface} data-event-category={match.category} aria-label={position + ": " + matchTitle(match)}>
    <div className="ry-compare-identity-copy">
      <p className="ry-compare-ordinal">{position} · {tournamentName(match.tournament)} {match.year} · {round(match)} <span className={"ry-compare-surface ry-compare-surface--" + match.surface} aria-hidden="true" /> {surfaceLabel[match.surface]}</p>
      <h2>{matchTitle(match)}</h2>
      <p className="ry-compare-score">{score(match)}</p>
      <p className="ry-compare-winner">Ganador: <strong>{name}</strong></p>
      {sentence(match) && <p className="ry-compare-sentence">{sentence(match)}</p>}
      <Link href={"/match/" + match.match_id} className="ry-compare-match-link">Leer el partido</Link>
    </div>
    {portrait && <div className="ry-compare-portrait"><Image src={portrait.thumbnail || portrait.src} alt={"Fotografía de " + name} fill sizes="(max-width: 759px) 80px, 190px" unoptimized /></div>}
  </section>;
}

function SetPath({ match, maximum }: { match: Match; maximum: number }) {
  const side = match.winner === 2 ? 1 : 0;
  const setScores = score(match).split(", ");
  return <div className="ry-compare-setpath" style={{ gridTemplateColumns: "repeat(" + match.score_summary.games.length + ",minmax(0,1fr))" }} aria-label={"Diferencia de juegos de " + winner(match) + " en cada set"}>
    {match.score_summary.games.map((set, index) => {
      const difference = set[side] - set[1 - side];
      return <div className={"ry-compare-set" + (difference < 0 ? " is-lost" : "")} key={index}>
        <span>Set {index + 1}</span>
        <span className="ry-compare-set-plot" aria-hidden="true"><i style={{ height: `${Math.abs(difference) / maximum * 45}%` }} /></span>
        <strong>{difference > 0 ? "+" : ""}{number(difference)}</strong>
        <small>{setScores[index] || String(set[0]) + "–" + String(set[1])}</small>
      </div>;
    })}
  </div>;
}

function Measure({ label, left, right, maximum }: { label: string; left: number; right: number; maximum: number }) {
  return <div className="ry-compare-measure">
    <h3>{label}</h3>
    <div className="ry-compare-measure-pair">
      {[left, right].map((value, index) => <div key={index}>
        <strong>{number(value)}</strong>
        <span className="ry-compare-track" aria-hidden="true"><i style={{ width: (maximum ? value / maximum * 100 : 0) + "%" }} /></span>
      </div>)}
    </div>
  </div>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await searchParams;
  if (!query.left && !query.right) return { title: "Comparar partidos — DEUCE", description: "Dos partidos, el mismo criterio y sus resultados por sets.", alternates: { canonical: "/compare" } };
  const matches = await preparedArchive();
  const left = matches.find((match) => match.match_id === query.left), right = matches.find((match) => match.match_id === query.right);
  return { title: left && right ? winner(left) + " y " + winner(right) + " · Comparar partidos — DEUCE" : "Comparar partidos — DEUCE", alternates: { canonical: left && right ? address(left.match_id, right.match_id) : "/compare" } };
}

export default async function ComparePage({ searchParams }: Props) {
  const query = await searchParams, matches = await preparedArchive();
  const left = matches.find((match) => match.match_id === query.left) || matches.find((match) => match.match_id === examples[0]);
  const right = matches.find((match) => match.match_id === query.right && match.match_id !== left?.match_id)
    || (query.left && left ? relatedMatch(left, matches) : null)
    || matches.find((match) => match.match_id === examples[1] && match.match_id !== left?.match_id)
    || matches.find((match) => match.match_id === examples[0] && match.match_id !== left?.match_id);
  if (!left || !right) return <main className="nc-wrap ry-compare-page"><h1>No se pudo abrir la comparación.</h1><p>Elige dos partidos del archivo para leerlos juntos.</p><Link href="/buscar">Buscar partidos</Link></main>;
  const changing = query.side === "left" ? "left" : "right";
  const term = normalizeText(query.q || "").trim();
  const results = term ? matches.filter((match) => match.match_id !== (changing === "left" ? right.match_id : left.match_id) && normalizeText(match.player1.name + " " + match.player2.name + " " + tournamentName(match.tournament) + " " + match.year + " " + round(match)).includes(term)).slice(0, 25) : [];
  const total = Math.max(games(left), games(right));
  const setExtent = Math.max(1, ...[left, right].flatMap((match) => {
    const side = match.winner === 2 ? 1 : 0;
    return match.score_summary.games.map((set) => Math.abs(set[side] - set[1 - side]));
  }));
  return <main className="nc-wrap ry-compare-page">
    <header className="ry-compare-intro">
      <div><Link href="/buscar" className="ry-compare-back">Partidos</Link><h1>Comparar partidos</h1><p>{relationship(left, right)}</p></div>
    </header>
    <div className="ry-compare-identities"><MatchIdentity match={left} position="Partido 1" /><MatchIdentity match={right} position="Partido 2" /></div>
    <section className="ry-compare-analysis" aria-labelledby="ry-compare-analysis-title">
      <div className="ry-compare-heading"><h2 id="ry-compare-analysis-title">El set final, en cifras</h2></div>
      <div className="ry-compare-stat-head"><span>Medida</span><span>{winner(left)} · {left.year}</span><span>{winner(right)} · {right.year}</span></div>
      <Measure label="Juegos en el último set" left={lastSetGames(left)} right={lastSetGames(right)} maximum={Math.max(lastSetGames(left), lastSetGames(right))}/>
      <Measure label="Juegos disputados" left={games(left)} right={games(right)} maximum={total}/>
      <Measure label="Tie-breaks" left={tieBreaks(left)} right={tieBreaks(right)} maximum={Math.max(tieBreaks(left), tieBreaks(right))}/>
    </section>
    <section className="ry-compare-path" aria-labelledby="ry-compare-path-title">
      <div className="ry-compare-heading"><h2 id="ry-compare-path-title">Set a set</h2><p>Diferencia de juegos desde el ganador de cada partido. Barras en la misma escala; por debajo de cero, set perdido.</p></div>
      <div className="ry-compare-path-grid"><div><h3>{winner(left)}</h3><SetPath match={left} maximum={setExtent} /></div><div><h3>{winner(right)}</h3><SetPath match={right} maximum={setExtent} /></div></div>
    </section>
    <section className="ry-compare-progress" aria-labelledby="ry-compare-progress-title">
      <div className="ry-compare-heading"><h2 id="ry-compare-progress-title">Cómo se decidió cada set</h2><p>Resultados, breaks y juegos documentados. Los huecos de la fuente permanecen visibles.</p></div>
      <div className="ry-compare-progress-grid">{[left, right].map((match) => <div key={match.match_id}><h3>{tournamentName(match.tournament)} {match.year} <span>{tapeState(match)}</span></h3><ReadingLine match={match}/></div>)}</div>
    </section>
    <section className="ry-compare-choice" aria-labelledby="ry-compare-choice-title">
      <div><h2 id="ry-compare-choice-title">Elige otra lectura</h2><p>Busca por jugador, torneo o año. El otro partido permanece fijo.</p></div>
      <div className="ry-compare-change"><Link href={address(left.match_id, right.match_id) + "&side=left#elegir"} aria-current={changing === "left" ? "true" : undefined}>Cambiar el primero</Link><Link href={address(left.match_id, right.match_id) + "&side=right#elegir"} aria-current={changing === "right" ? "true" : undefined}>Cambiar el segundo</Link></div>
      <form id="elegir" action="/compare" method="get" role="search"><input type="hidden" name="left" value={left.match_id}/><input type="hidden" name="right" value={right.match_id}/><input type="hidden" name="side" value={changing}/><label htmlFor="ry-compare-query">Buscar partido</label><div><input id="ry-compare-query" name="q" defaultValue={query.q || ""} type="search" placeholder="Jugador, torneo o año"/><button type="submit">Buscar</button></div></form>
      {term && <div className="ry-compare-found"><p>{results.length ? "Resultados para «" + query.q + "»" : "Nada con ese nombre en el archivo."}</p>{results.length ? <ol>{results.map((match) => <li key={match.match_id}><Link href={changing === "left" ? address(match.match_id, right.match_id) : address(left.match_id, match.match_id)}><span>{matchTitle(match)}<small>{tournamentName(match.tournament)} · {match.year} · {round(match)}</small></span><strong>{score(match)}</strong></Link></li>)}</ol> : <Link href={address(left.match_id, right.match_id) + "&side=" + changing + "#elegir"}>Limpiar búsqueda</Link>}</div>}
    </section>
  </main>;
}
