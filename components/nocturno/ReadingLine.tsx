"use client";
import { useState } from 'react';
import type { Match } from '@/lib/types';
import { matchStory } from '@/lib/match-story';
import { score } from '@/lib/cuaderno/model';
import ScoreText from '@/components/ScoreText';

export default function ReadingLine({match}: {match:Match}) {
  const sets=matchStory(match),names=[match.player1.name,match.player2.name];
  const [selected,setSelected]=useState(0),[game,setGame]=useState<number|null>(null);
  const current=sets[selected]||sets[0];
  if(!current?.games.length || match.status!=='Finished' || match.quality?.result==='review')return null;
  const item=game===null?null:current.games[game];
  return <section className="ds-match-story" aria-label="Cómo se decidió el partido">
    <div className="ry-section-heading"><h2>El partido, set a set.</h2><span>{sets.length} sets · {sets.reduce((n,s)=>n+s.games.length,0)} juegos</span></div>
    <p className="ds-chart-explainer">Quién ganó cada set y dónde cambió el servicio. Lee el resultado y explora los juegos registrados.</p>
    <div className="ds-set-picker" role="group" aria-label="Seleccionar set">{sets.map((set,i)=><button key={set.set} type="button" aria-pressed={i===selected} onClick={()=>{setSelected(i);setGame(null);}}><span>SET {set.set}</span><ScoreText value={score(match).split(', ')[i]||set.score.join('–')}/><small>{names[set.winner-1]}</small></button>)}</div>
    <div className="ds-set-summary"><span>Set {current.set}</span><strong>{names[current.winner-1]}</strong><span>Ganó {current.score[current.winner-1]} de los {current.games.length} juegos.</span></div>
    <div className="ds-set-balance" role="img" aria-label={`${names[0]}: ${current.score[0]} juegos. ${names[1]}: ${current.score[1]} juegos.`}><span style={{width:`${current.score[0]/current.games.length*100}%`}}/><span style={{width:`${current.score[1]/current.games.length*100}%`}}/></div>
    <div className="ds-story-legend"><span><i/>{names[0]}</span><span><i/>{names[1]}</span></div>
    {current.known>0 ? <><div className="ds-game-sequence" role="group" aria-label={`Juegos registrados del set ${current.set}`}>{current.games.map((g,i)=><button type="button" key={i} className={`ds-game-chip ds-game-side-${g.winner||'unknown'}${g.isBreak?' ds-game-break':''}`} aria-pressed={game===i} aria-label={`Juego ${g.number}: ${g.winner?names[g.winner-1]:'sin secuencia completa'}${g.isBreak?', break':''}${g.tiebreak?', tie-break':''}`} onClick={()=>setGame(i)}>{g.tiebreak?'TB':g.number}{g.isBreak&&<span aria-hidden="true">↗</span>}</button>)}</div>
    <p className="ds-game-detail" aria-live="polite">{item?<>Juego {item.number} · {item.winner?`Ganó ${names[item.winner-1]}${item.isBreak?' al resto: break.':item.tiebreak?' en el tie-break.':'.'}`:'No tenemos la secuencia completa de este juego.'}</>:<>Toca un juego para leerlo. ↗ = break. Gris = secuencia no disponible.</>}</p><p className="ry-data-note">{current.known} de {current.games.length} juegos con secuencia completa. No se rellenan huecos.</p></> : <p className="ds-game-detail">De este set tenemos el resultado, no una secuencia completa de juegos. No reconstruimos una evolución que la fuente no ofrece.</p>}
  </section>;
}
