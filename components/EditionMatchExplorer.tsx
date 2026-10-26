"use client";

import { useMemo, useState } from "react";
import type { MatchRecord } from "@/types/deuce";
import { MatchScoreboard } from "@/components/deuce/MatchScoreboard";

type EditionResult = { key: string; label: string; position: number; championPath: boolean; match: MatchRecord };

export default function EditionMatchExplorer({ results }: { results: EditionResult[] }) {
  const lateCount = results.filter(result => result.position >= 5).length;
  const [round, setRound] = useState(lateCount ? "late" : "all");
  const [limit, setLimit] = useState(12);
  const rounds = useMemo(() => [...new Map(results.map(result => [result.key, { key: result.key, label: result.label }])).values()].sort((a,b) => {
    const ap=results.find(result=>result.key===a.key)?.position||0;
    const bp=results.find(result=>result.key===b.key)?.position||0;
    return bp-ap;
  }), [results]);
  const filtered = results.filter(result => round === "all" || round === "late" ? round === "all" || result.position >= 5 : result.key === round);
  const visible = filtered.slice(0, limit);
  const choose = (next: string) => { setRound(next); setLimit(12); };
  return <section className="nc-section edition-match-explorer" aria-labelledby="edition-results-title">
    <div className="td-section-heading">
      <div><h2 id="edition-results-title">Partidos de esta edición</h2><p>Resultados publicados, ordenados por ronda y con columnas de set estables.</p></div>
      <span>{filtered.length} {filtered.length === 1 ? "partido" : "partidos"}</span>
    </div>
    <div className="edition-filter-bar">
      <span className="edition-discipline"><small>Modalidad</small><strong>Individual masculino</strong></span>
      <div className="edition-round-filters" role="group" aria-label="Filtrar partidos por ronda">
        <button type="button" aria-pressed={round === "late"} onClick={() => choose("late")}>Rondas finales</button>
        <button type="button" aria-pressed={round === "all"} onClick={() => choose("all")}>Todas</button>
        {rounds.map(option => <button type="button" key={option.key} aria-pressed={round === option.key} onClick={() => choose(option.key)}>{option.label}</button>)}
      </div>
    </div>
    <ol className="edition-result-list">
      {visible.map(result => <li key={result.match.id} data-champion-path={result.championPath}>
        <span className="edition-round-label">{result.label}{result.championPath ? <small>Camino del campeón</small> : null}</span>
        <MatchScoreboard match={result.match} variant="compact" />
      </li>)}
    </ol>
    {visible.length < filtered.length && <button className="edition-load-more" type="button" onClick={() => setLimit(value => value + 12)}>Mostrar 12 partidos más</button>}
  </section>;
}
