import type { Match } from '@/lib/types'
import { gameProgress, recordedTiebreaks } from '@/lib/point-integrity'

export default function MatchFlow({match, compact=false, axisMax,axisRange}:{match:Match;compact?:boolean;axisMax?:number;axisRange?:number}) {
 const games=gameProgress(match), ties=recordedTiebreaks(match)
 const maxPoint=axisMax || Math.max(1,...match.point_tape.map(p=>p.point_number))
 const range=axisRange || Math.max(2,...games.map(g=>Math.abs(g.difference)))
 const x=(n:number)=>40+n/maxPoint*660, y=(n:number)=>100-n/range*65
 return <>
 {games.length>0&&<figure className="game-line">
 {!compact&&<h3>La forma del partido</h3>}
 <svg viewBox="0 0 750 210" role="img" aria-label={`Diferencia acumulada de juegos: positivo para ${match.player1.name}, negativo para ${match.player2.name}. Un punto marca cada break.`}>
 <line x1="40" y1="100" x2="700" y2="100" stroke="var(--line)"/>
 <text x="12" y="104">0</text><text x="12" y="39">+{range}</text><text x="12" y="169">−{range}</text>
 <polyline points={`40,100 ${games.map(g=>`${x(g.point.point_number)},${y(g.difference)}`).join(' ')}`} fill="none" stroke="var(--text)" strokeWidth="2"/>
 {games.filter(g=>g.isBreak).map(g=><circle key={g.point.point_number} cx={x(g.point.point_number)} cy={y(g.difference)} r="4" fill={g.point.winner===1?'var(--player-one)':'var(--player-two)'}><title>Set {g.point.set}, juego {g.point.game}: break de {g.point.winner===1?match.player1.name:match.player2.name}. Diferencia {g.difference}.</title></circle>)}
 <text x="40" y="202">Punto 1</text><text x="700" y="202" textAnchor="end">Punto {maxPoint}</text>
 </svg>
 {!compact&&<p>Juegos acumulados: arriba, {match.player1.name}; abajo, {match.player2.name}. Cada punto de color es un break. El eje horizontal cuenta puntos, no minutos.</p>}
 </figure>}
 {!compact&&ties.map(points=><section key={points[0].set} className="tiebreak-sequence"><h3>El desempate del set {points[0].set}</h3><div className="tiebreak-beads">{points.map((p,i)=><span key={p.point_number} className={`${p.winner!==p.server?'mini-break ':''}${p.server===1?'serving':''}`} title={`Punto ${i+1}. Saca ${p.server===1?match.player1.name:match.player2.name}; gana ${p.winner===1?match.player1.name:match.player2.name}. ${p.score_before}`} aria-label={`Punto ${i+1}: saca ${p.server===1?match.player1.name:match.player2.name}; gana ${p.winner===1?match.player1.name:match.player2.name}${p.winner!==p.server?', mini-break':''}.`}>{p.winner}</span>)}</div><p>1: {match.player1.name} · 2: {match.player2.name}. El número indica quién ganó; anillo verde cuando sacó el primero, sin anillo cuando sacó el segundo. Terracota: mini-break.</p></section>)}
 </>
}
