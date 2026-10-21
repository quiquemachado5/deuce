import type { Match, Point } from './types'
import { isRecordedTiebreak, tiebreakTarget } from './historical-rules'

const normalScore=(wins:number[])=>{
 if(wins[0]>=3&&wins[1]>=3)return wins[0]===wins[1]?'40-40':wins[0]>wins[1]?'AD-40':'40-AD'
 return wins.map(n=>['0','15','30','40'][Math.min(3,n)]).join('-')
}
const normalized=(score:string)=>score.toUpperCase().replace(/[–—:]/g,'-').replace(/\s/g,'').replace(/\bA\b/g,'AD')
/** Some tapes append a reset row after the numeric point that already closed a tie-break. */
export function normalizePointTape(points: Point[]) {
  const groups = new Map<string, number[]>()
  points.forEach((point,index) => { const key=`${point.set}/${point.game}`; const rows=groups.get(key)||[];rows.push(index);groups.set(key,rows) })
  const removed=new Set<number>(),replaced=new Map<number,Point>()
  for(const indices of groups.values()){
    const rows=indices.map(index=>points[index]),last=rows.at(-1)!,previous=rows.at(-2)
    // A fifth-set tie-break may play to ten. Without that target, leave its rows untouched.
    if(rows[0].set===5 || !previous || !last.game_ended || !last.winner || normalized(last.score)!=='0-0' || normalized(rows[0].score_before||'')!=='0-0' || !/^[01]-[01]$/.test(normalized(rows[0].score)))continue
    const running=[0,0]
    let valid=true
    for(const [index,point] of rows.slice(0,-1).entries()){
      if(!point.winner || point.game_ended || normalized(point.score_before||'')!==running.join('-') || (index>0 && point.point_number!==rows[index-1].point_number+1)){valid=false;break}
      running[point.winner-1]++
      if(normalized(point.score)!==running.join('-') || (index<rows.length-2 && Math.max(...running)>=7 && Math.abs(running[0]-running[1])>=2)){valid=false;break}
    }
    if(!valid || last.point_number!==previous.point_number+1 || normalized(last.score_before||'')!==running.join('-') || Math.max(...running)<7 || Math.abs(running[0]-running[1])<2 || running[last.winner-1]<=running[2-last.winner] || previous.winner!==last.winner)continue
    removed.add(indices.at(-1)!)
    replaced.set(indices.at(-2)!,{...previous,game_ended:true})
  }
  return removed.size ? points.flatMap((point,index)=>removed.has(index)?[]:[replaced.get(index)||point]) : points
}
/** A game is usable only when every point from love to its closing point is present. */
export function completeGames(points: Point[], match?: Match) {
  points = normalizePointTape(points)
  const groups = new Map<string, Point[]>()
  for (const p of points) { const key = `${p.set}/${p.game}`; const rows = groups.get(key) || []; rows.push(p); groups.set(key, rows) }
  return [...groups.values()].filter(rows => {
    const first = rows[0], last = rows.at(-1)!
    if (rows.length < 4 || !last.game_ended || !last.winner || first.score_before?.replace(/[–:]/g, '-') !== '0-0') return false
    if (rows.some((p,i) => !p.winner || (i > 0 && p.point_number !== rows[i-1].point_number + 1))) return false
    const numeric = /^([01])-([01])$/.test(normalized(first.score))
    const target = numeric ? tiebreakTarget(match,first.set) : 4
    const running=[0,0]
    for(const [i,p] of rows.entries()){
      if(normalized(p.score_before||'') !== (numeric?running.join('-'):normalScore(running)))return false
      running[p.winner!-1]++
      if(target !== null && i<rows.length-1 && Math.max(...running)>=target && Math.abs(running[0]-running[1])>=2)return false
      if(!p.game_ended && normalized(p.score)!==(numeric?running.join('-'):normalScore(running)))return false
    }
    const wins = [rows.filter(p=>p.winner===1).length,rows.filter(p=>p.winner===2).length]
    return wins[last.winner-1] >= (target ?? 7) && wins[last.winner-1] - wins[2-last.winner] >= 2
  })
}
export function tapeIntegrity(match: Match) {
  const tape = normalizePointTape(match.point_tape)
  if (!tape.length) return { state: 'none' as const, usable: [] as Point[] }
  const groups = completeGames(tape,match)
  const usable = groups.flat()
  const gameCounts = match.score_summary.games.map((_,i) => [groups.filter(g=>g[0].set===i+1 && g.at(-1)!.winner===1).length,groups.filter(g=>g[0].set===i+1 && g.at(-1)!.winner===2).length])
  const scoresMatch = gameCounts.every((pair,i)=>pair.every((n,side)=>n===match.score_summary.games[i][side]))
  const totals = [1,2].map(side=>match.statistics.find(s=>s.player===side && s.name==='Total points won' && ['match','all','total',''].includes(s.period.toLowerCase())))
  const totalsMatch = totals.every((s,i)=> !s || !Number.isFinite(s.won ?? Number(s.value.split('/')[0])) || (s.won ?? Number(s.value.split('/')[0])) === tape.filter(p=>p.winner===i+1).length)
  return { state: usable.length===tape.length && scoresMatch && totalsMatch ? 'reliable' as const : 'partial' as const, usable }
}
export function gameProgress(match: Match) {
  if (match.quality?.tape === 'partial' || match.quality?.result === 'review') return []
  const games = completeGames(match.point_tape,match)
  if (!games.length) return []
  let difference = 0
  return games.map(rows => { const p=rows.at(-1)!; difference += p.winner===1 ? 1 : -1; return { point:p, difference, isBreak:p.game!==13 && p.server!==null && p.winner!==p.server } })
}
export function recordedTiebreaks(match: Match) {
  return completeGames(match.point_tape,match).filter(rows => isRecordedTiebreak(match,rows[0].set-1) && rows[0].game === match.score_summary.games[rows[0].set-1].reduce((a,b)=>a+b,0))
}
