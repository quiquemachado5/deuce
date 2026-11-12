'use client';

import { useState } from 'react';
import type { RoundReading } from '@/lib/tournament-story';
import { number } from '@/lib/cuaderno/model';
import styles from './tournament-experience.module.css';

export function TournamentRoundLens({rounds}:{rounds:RoundReading[]}){
  const [selected,setSelected]=useState('all');
  const row=rounds.find(round=>round.key===selected)||rounds[0];
  if(!row||!row.matches)return null;
  const deciding=row.deciding/row.matches*100;
  return <section className={styles.roundLens} aria-labelledby="edition-round-title">
    <div className={styles.sectionTitle}><div><h2 id="edition-round-title">Ronda a ronda.</h2><p>Elige una fase para ver cuánto se jugó y cuántos partidos llegaron al set decisivo.</p></div></div>
    <div className={styles.roundOptions} role="group" aria-label="Explorar estadísticas por ronda">{rounds.map(round=><button type="button" aria-pressed={round.key===row.key} onClick={()=>setSelected(round.key)} key={round.key}>{round.label}</button>)}</div>
    <div className={styles.roundCanvas} aria-live="polite">
      <div className={styles.roundVolume}><h3>{row.label}</h3><dl>{[['Partidos',row.matches],['Sets',row.sets],['Juegos',row.games]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{number(Number(value))}</dd></div>)}</dl></div>
      <div className={styles.roundRing}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50"/><circle cx="60" cy="60" r="50" pathLength="100" strokeDasharray={`${deciding} 100`}/></svg><strong>{number(deciding,1)} %</strong><span>Al set decisivo</span></div>
      <div className={styles.roundFacts}><p><strong>{number(row.comebacks)}</strong><span>Remontadas tras perder el primer set</span></p><p><strong>{number(row.tiebreaks)}</strong><span>Tie-breaks disputados</span></p></div>
    </div>
  </section>;
}
