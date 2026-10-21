import type { Match, Point } from './types'
import { analyzePointTape, chooseSocialHighlight } from './analytics/engine'
import { normalizeText } from './quality'
export function roundPosition(round: string) {
  const value = normalizeText(round)
  const order: Record<string,number> = { final:7, semifinal:6, 'semifinales':6, quarterfinal:5, 'cuartos de final':5, 'round of 16':4, 'octavos de final':4, 'round of 32':3, 'tercera ronda':3, 'round of 64':2, 'segunda ronda':2, 'round of 128':1, 'primera ronda':1 }
  return order[value] || 0
}
export function roundLabel(round:string) {
  const numeric=normalizeText(round).match(/^round of (32|64)$/)
  if(numeric) return `Ronda de ${numeric[1]}`
  return ({7:'Final',6:'Semifinal',5:'Cuartos de final',4:'Octavos de final',3:'Tercera ronda',2:'Segunda ronda',1:'Primera ronda'} as Record<number,string>)[roundPosition(round)] || round }
export function winnerName(match:Match) { return match.winner === 1 ? match.player1.name : match.winner === 2 ? match.player2.name : null }
export function twoSetComeback(match:Match) { return !!match.winner && match.score_summary.games.length === 5 && match.score_summary.games.slice(0,2).every(s=>s[match.winner!-1]<s[2-match.winner!]) }
export function matchStory(match:Match) {
  if (twoSetComeback(match)) return { headline: `${winnerName(match)} remontó dos sets en contra.`, evidence: match.final_score }
  return chooseSocialHighlight(match,analyzePointTape(match.point_tape))
}
export function chronological(a:Match,b:Match) { return a.year-b.year || a.score_summary.timestamp.localeCompare(b.score_summary.timestamp) || roundPosition(a.round)-roundPosition(b.round) || a.match_id.localeCompare(b.match_id) }
export function neighboringMeetings(matches:Match[],match:Match) {
  const names=[match.player1.name,match.player2.name]
  const meetings=matches.filter(m=>names.includes(m.player1.name)&&names.includes(m.player2.name)).sort(chronological)
  const index=meetings.findIndex(m=>m.match_id===match.match_id)
  return { previous:index>0 ? meetings[index-1] : undefined, next:index>=0 ? meetings[index+1] : undefined }
}
export function durationLabel(minutes:number) { return `${Math.floor(minutes/60)} h ${minutes%60} min` }
export function criticalPoints(points:Point[]) { return points.filter(p=>p.winner!==null && (p.is_break_point===true || p.is_match_point===true)).sort((a,b)=>a.point_number-b.point_number) }
export function decisiveMoments(match:Match,limit=6) {
  const tape=[...match.point_tape].sort((a,b)=>a.point_number-b.point_number)
  const games=new Map<string,Point[]>()
  for(const p of tape) {const key=`${p.set}:${p.game}`;games.set(key,[...(games.get(key)||[]),p])}
  const names=[match.player1.name,match.player2.name]
  const events=criticalPoints(tape).map(point=>{
    const score:[number,number]=[0,0]
    let complete=true
    for(let game=1;game<point.game;game++) {
      const rows=games.get(`${point.set}:${game}`),last=rows?.at(-1)
      if(!last?.winner || !last.game_ended) {complete=false;break}
      score[last.winner-1]++
    }
    const where=complete ? `${score[0]}–${score[1]} en el set ${point.set}` : `Set ${point.set}, juego ${point.game}`
    const beneficiary=point.is_match_point ? point.match_point_for : point.server ? (point.server===1?2:1) : null
    const kind=point.is_match_point ? 'bola de partido' : 'bola de break'
    const outcome=beneficiary ? point.winner===beneficiary ? 'la convirtió' : 'no la convirtió' : `ganó el punto ${names[point.winner!-1]}`
    return { point, label:`${where}: ${kind}${beneficiary ? ` para ${names[beneficiary-1]}` : ''}; ${outcome}.`, priority:point.is_match_point ? 3 : point.break_converted || (point.server && point.winner!==point.server) ? 2 : 1 }
  })
  // One decisive event per game; prefer conversions and match points, then retain chronology.
  const best=new Map<string,typeof events[number]>()
  for(const event of events) {const key=`${event.point.set}:${event.point.game}`;const previous=best.get(key);if(!previous || event.priority>=previous.priority) best.set(key,event)}
  return [...best.values()].sort((a,b)=>b.priority-a.priority || b.point.point_number-a.point.point_number).slice(0,limit).sort((a,b)=>a.point.point_number-b.point.point_number)
}
export const CIRCUIT = ['Australian Open','Indian Wells','Miami','Monte Carlo','Madrid','Rome','Roland Garros','Wimbledon','Canada','Cincinnati','US Open','Shanghai','Paris']
export function playerSeason(matches:Match[],name:string,year:number) {
  const season=matches.filter(m=>m.year===year&&(m.player1.name===name||m.player2.name===name))
  // Keep the core calendar visible while admitting the ATP 500/250 events
  // actually present in this season. An absent event remains "Sin registro".
  const tournaments=[...new Set([...CIRCUIT,...season.map(m=>m.tournament)])]
  return tournaments.map(tournament=>{
    const fixtures=matches.filter(m=>m.year===year&&m.tournament===tournament&&(m.player1.name===name||m.player2.name===name)).sort((a,b)=>roundPosition(b.round)-roundPosition(a.round)||chronological(b,a))
    const last=fixtures[0]
    const date=fixtures.reduce((earliest,m)=>{const current=m.context?.date||m.score_summary.timestamp;return current&&(!earliest||current<earliest)?current:earliest},'')
    return {tournament,last,played:fixtures.length,won:fixtures.filter(m=>winnerName(m)===name).length,outcome:!last ? 'Sin registro' : roundPosition(last.round)===7&&winnerName(last)===name ? 'Campeón' : winnerName(last)!==name ? `Cayó en ${roundLabel(last.round).toLowerCase()}` : `Último registro: ${roundLabel(last.round).toLowerCase()}`,date}
  }).sort((a,b)=>a.played&&b.played ? a.date.localeCompare(b.date)||a.tournament.localeCompare(b.tournament,'es') : a.played ? -1 : b.played ? 1 : CIRCUIT.indexOf(a.tournament)-CIRCUIT.indexOf(b.tournament))
}

/** Scores always follow the named player when only one name appears beside them. */
export function scoreFor(match:Match,name:string) {
  return match.player1.name===name ? match.final_score : match.final_score.replace(/(\d+)[–-](\d+)(\(\d+\))?/g,(_,a,b,tie)=>`${b}–${a}${tie||''}`)
}
