"use client";

import { useState } from "react";
import { toMatchRecord } from '@/data/map-match';
import { ArchiveMatchRow } from './deuce/MatchArchivePage';
import { roundLabel, roundPosition, winnerName } from "@/lib/editorial";
import type { Match } from "@/lib/types";
import styles from "./tournament-detail.module.css";

export default function TournamentBracket({ matches }: { matches: Match[] }) {
  const [expanded, setExpanded] = useState(false);
  const final = matches.find((match) => roundPosition(match.round) === 7 && match.winner);
  const champion = final ? winnerName(final) : null;
  const groups = new Map<number, Match[]>();
  for (const match of matches) {
    const position = roundPosition(match.round);
    if (!position) continue;
    groups.set(position, [...(groups.get(position) || []), match]);
  }
  const rounds = [...groups].sort(([a], [b]) => a - b).map(([position, results]) => ({ position, label: roundLabel(results[0].round), results }));
  if (!rounds.length) return null;
  const hiddenMatches = rounds.reduce((total, round) => total + Math.max(0, round.results.length - 6), 0);
  const renderMatch = (match: Match) => {
    const onPath = champion !== null && winnerName(match) === champion;
    return <li className={styles.bracketMatch} key={match.match_id} data-champion-path={onPath}>
      <ArchiveMatchRow match={toMatchRecord(match)} showContext />
      {onPath && <span className={styles.championPath}>Camino de {champion}</span>}
    </li>;
  };
  return <section className={styles.bracket} aria-labelledby="td-bracket-title">
    <div className={styles.bracketHeader}><h2 id="td-bracket-title">El cuadro de la edición</h2></div>
    <div className={styles.bracketViewport} tabIndex={0} aria-label="Cuadro por rondas, desplazable horizontalmente">
      <div className={styles.bracketColumns}>
        {rounds.map((round) => {
          const visible = expanded ? round.results : round.results.slice(0, 6);
          return <section className={styles.bracketRound} key={round.position} aria-label={round.label}>
            <div className={styles.bracketRoundHead}><h3>{round.label}</h3><span>{round.results.length} {round.results.length === 1 ? "partido" : "partidos"}</span></div>
            <ol className={styles.bracketResults}>{visible.map(renderMatch)}</ol>
          </section>;
        })}
      </div>
    </div>
    {!expanded && hiddenMatches > 0 && (
      <button className={styles.bracketReveal} type="button" onClick={() => setExpanded(true)}>
        Ver todos los partidos <span>{hiddenMatches} más</span>
      </button>
    )}
  </section>;
}
