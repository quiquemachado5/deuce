"use client";

import { useState } from "react";
import { ArchiveMatchRow } from './deuce/MatchArchivePage';
import type { TournamentBracketMatch, TournamentBracketRound } from '@/lib/tournament-bracket';
import styles from "./tournament-detail.module.css";

export default function TournamentBracket({ rounds, heading = 'El cuadro de la edición' }: { rounds: TournamentBracketRound[]; heading?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [activeRound, setActiveRound] = useState(() => rounds[0]?.position || 0);
  if (!rounds.length) return null;
  const hiddenMatches = rounds.reduce((total, round) => total + Math.max(0, round.results.length - 6), 0);
  const renderMatch = (entry: TournamentBracketMatch) => {
    return <li className={styles.bracketMatch} key={entry.match.id} data-champion-path={entry.champion ? true : undefined}>
      <ArchiveMatchRow match={entry.match} showContext />
      {entry.champion && <span className={styles.championPath}>Camino de {entry.champion}</span>}
    </li>;
  };
  const headingId=`td-bracket-${rounds[0]?.results[0]?.match.tour||'atp'}`;
  return <section className={styles.bracket} id="cuadro" aria-labelledby={headingId}>
    <div className={styles.bracketHeader}><h2 id={headingId}>{heading}</h2><p>Resultados documentados por ronda.</p></div>
    <div className={styles.bracketRoundPicker} role="group" aria-label="Elegir ronda del cuadro">{rounds.map(round=><button type="button" aria-pressed={activeRound===round.position} onClick={()=>setActiveRound(round.position)} key={round.position}>{round.label}<span>{round.results.length}</span></button>)}</div>
    <div className={styles.bracketViewport} tabIndex={0} aria-label="Cuadro por rondas, desplazable horizontalmente">
      <div className={styles.bracketColumns}>
        {rounds.map((round) => {
          const visible = expanded ? round.results : round.results.slice(0, 6);
          return <section className={styles.bracketRound} data-active={activeRound===round.position||undefined} key={round.position} aria-label={round.label}>
            <div className={styles.bracketRoundHead}><h3>{round.label}</h3><span>{round.results.length} {round.results.length === 1 ? "partido" : "partidos"}</span></div>
            <ol className={styles.bracketResults}>{visible.map(renderMatch)}</ol>
          </section>;
        })}
      </div>
    </div>
    {!expanded && hiddenMatches > 0 && (
      <button className={styles.bracketReveal} type="button" onClick={() => setExpanded(true)} aria-label={`Ver todos los partidos, ${hiddenMatches} resultados adicionales`}>
        Ver todos los partidos
      </button>
    )}
  </section>;
}
