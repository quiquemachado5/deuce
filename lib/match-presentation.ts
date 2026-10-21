import type { Match, Point } from './types'
const flip = (side: number | null) => side === 1 ? 2 : side === 2 ? 1 : null
const reverseScore = (score: string) => score.split(/[–-]/).reverse().join('–')
/** Stable alphabetical ordering across results, profiles, H2H and comparison. */
export function orientMatch(match: Match): Match {
  if (match.player1.name.localeCompare(match.player2.name, 'es') <= 0) return match
  return { ...match, player1: match.player2, player2: match.player1, winner: flip(match.winner),
    final_score: match.final_score.split(/\s+/).map(set=>set.replace(/^(\d+)[–-](\d+)/,'$2–$1')).join(' '),
    score_summary: {...match.score_summary, sets:[...match.score_summary.sets].reverse(), games:match.score_summary.games.map(s=>[...s].reverse()), points:[...match.score_summary.points].reverse(),server:flip(match.score_summary.server),win_probability_p1:match.score_summary.win_probability_p1===null?null:1-match.score_summary.win_probability_p1},
    statistics:match.statistics.map(s=>({...s,player:flip(s.player)})),
    point_tape:match.point_tape.map((p):Point=>({...p,winner:flip(p.winner),server:flip(p.server),match_point_for:flip(p.match_point_for??null),score:reverseScore(p.score),score_before:p.score_before?reverseScore(p.score_before):undefined,win_probability_p1:typeof p.win_probability_p1==='number'?1-p.win_probability_p1:p.win_probability_p1})),
    context:match.context?{...match.context,rank1:match.context.rank2,rank2:match.context.rank1,age1:match.context.age2,age2:match.context.age1}:undefined,
  }
}
export const MATCH_TYPES = ['Cerrado','Roto','Remontada','Al límite'] as const
export function matchType(match: Match): typeof MATCH_TYPES[number] {
  const games=match.score_summary.games, side=match.winner===2?1:0
  if (!games.length) return 'Cerrado'
  if (games[0][side] < games[0][1-side]) return 'Remontada'
  const wins=[games.filter(([a,b])=>a>b).length,games.filter(([a,b])=>b>a).length]
  if (games.length===Math.max(...wins)*2-1 || games.some(([a,b])=>Math.max(a,b)>7)) return 'Al límite'
  const loserGames=games.reduce((sum,g)=>sum+g[1-side],0),winnerGames=games.reduce((sum,g)=>sum+g[side],0)
  return loserGames/winnerGames<=.5?'Roto':'Cerrado'
}
export const MATCH_TYPE_DEFINITION='Remontada: el ganador perdió el primer set. Al límite: manga decisiva o set de más de siete juegos. Roto: el perdedor ganó como máximo la mitad de juegos que el ganador. Cerrado: el resto.'
