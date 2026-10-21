import type { Match } from '@/lib/types'
import { criticalPoints } from '@/lib/editorial'
export default function CriticalDNA({match}:{match:Match}) {
  const points=criticalPoints(match.point_tape)
  if(!points.length) return null
  return <div className="critical-dna"><svg viewBox={`0 0 ${Math.max(points.length*12,120)} 100`} role="img" aria-label={`${points.length} oportunidades registradas: barras de break y de partido, en orden cronológico.`}>{points.map((p,i)=><rect key={p.point_number} x={i*12+2} y={p.is_match_point?5:30} width={7} height={p.is_match_point?90:65} rx={2} fill={p.winner===1?'var(--player-one)':'var(--player-two)'}><title>{`Set ${p.set}, juego ${p.game}. ${p.is_match_point?'Bola de partido':'Bola de break'}. Punto ganado por ${p.winner===1?match.player1.name:match.player2.name}.`}</title></rect>)}</svg><p>Una barra por bola de break; más alta si es bola de partido. El color indica quién ganó el punto.</p><div className="critical-legend"><span>{match.player1.name}</span><span>{match.player2.name}</span></div></div>
}
