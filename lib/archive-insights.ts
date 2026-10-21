import type { Match, MatchStat } from './types'
import { eligibleMatch } from './quality'
import { publishedMatchMinutes } from './duration'

export type InsightGroup = 'Resultados' | 'Presión' | 'Servicio' | 'Resto' | 'Contexto' | 'Golpes'
export type Observation = { value: number; sample: number; numerator?: number; denominator?: number; matchId?: string }
export type ArchiveMetric = { key: string; label: string; group: InsightGroup; unit: string; definition: string; read: (matches: Match[]) => Observation | null }
const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '')
const round = (value: number) => Math.round(value * 10) / 10
export function matchStat(match: Match, side: 1 | 2, name: string): MatchStat | undefined {
  return match.statistics.find(s => s.player === side && s.period.toLowerCase() === 'match' && norm(s.name) === norm(name))
}
export function statNumber(stat?: MatchStat): number | null {
  if (!stat) return null
  if (stat.won !== null && Number.isFinite(stat.won)) return stat.won
  if (stat.value.includes('%')) return null
  const value = Number(stat.value.split('/')[0].trim().replace(',', '.'))
  return stat.value.trim() && Number.isFinite(value) && value >= 0 ? value : null
}
export function statFraction(match: Match, side: 1 | 2, name: string): [number, number] | null {
  const stat = matchStat(match, side, name)
  if (!stat) {
    // Exact identities from documented counts; never infer from rounded percentages.
    if (name === 'Service games won') {
      const played=statNumber(matchStat(match,side,'Service games played'))
      const saved=matchStat(match,side,'Break points saved')
      const won=statNumber(saved),faced=saved?.total??null
      if(played!==null&&played>0&&won!==null&&faced!==null&&faced>=won&&faced-won<=played)return [played-(faced-won),played]
    }
    if (name === 'Service points won') {
      const first=statFraction(match,side,'1st serve points won'),second=statFraction(match,side,'2nd serve points won')
      if(first&&second)return [first[0]+second[0],first[1]+second[1]]
    }
    if (name === 'Return games won' || name === 'Return points won') {
      const serving=statFraction(match,side===1?2:1,name==='Return games won'?'Service games won':'Service points won')
      if(serving)return [serving[1]-serving[0],serving[1]]
    }
    if (name === 'Total points won') {
      const serving=statFraction(match,side,'Service points won'),returning=statFraction(match,side,'Return points won')
      if(serving&&returning)return [serving[0]+returning[0],serving[1]+returning[1]]
    }
  }
  const won = statNumber(stat)
  const denominator: Record<string, string> = { 'Service games won': 'Service games played', 'Return games won': 'Return games played', 'Service points won': 'Service points played', 'Return points won': 'Return points played', 'Total points won': 'Points played', 'Break points converted': 'Break points played', 'Break points saved': 'Break points faced' }
  const total = stat?.total ?? (denominator[name] ? statNumber(matchStat(match, side, denominator[name])) : null)
  return won !== null && total !== null && total > 0 && won <= total ? [won, total] : null
}
export const gamesInMatch = (match: Match) => match.score_summary.games.reduce((sum, set) => sum + set[0] + set[1], 0)
export const tiebreakCount = (match: Match) => match.score_summary.games.filter(([a,b]) => Math.max(a,b) === 7 && Math.min(a,b) === 6).length
export const isDeciding = (match: Match) => { const sets = match.score_summary.games; const wins = sets.filter(([a,b])=>a>b).length; return sets.length > 1 && Math.abs(wins-(sets.length-wins)) === 1 }
export const lostOpening = (match: Match, count = 1) => !!match.winner && match.score_summary.games.length > count && match.score_summary.games.slice(0,count).every(set=>set[match.winner!-1]<set[2-match.winner!])
const final = (m: Match) => /^final$/i.test(m.round)
const measured = (matches: Match[], field: (m: Match)=>number|null) => matches.flatMap(match=>{const value=field(match);return value !== null && Number.isFinite(value) ? [{value,match}] : []})
const rate = (key: string,label: string,group: InsightGroup,definition: string,test:(m:Match)=>boolean,eligible:(m:Match)=>boolean=()=>true): ArchiveMetric => ({key,label,group,unit:'%',definition,read:matches=>{const sample=matches.filter(eligible),won=sample.filter(test).length;return sample.length?{value:round(won/sample.length*100),sample:sample.length,numerator:won,denominator:sample.length}:null}})
const average = (key:string,label:string,group:InsightGroup,unit:string,definition:string,field:(m:Match)=>number|null):ArchiveMetric=>({key,label,group,unit,definition,read:matches=>{const rows=measured(matches,field);return rows.length?{value:round(rows.reduce((sum,r)=>sum+r.value,0)/rows.length),sample:rows.length}:null}})
const extreme = (key:string,label:string,unit:string,definition:string,field:(m:Match)=>number|null,descending=true):ArchiveMetric=>({key,label,group:'Contexto',unit,definition,read:matches=>{const rows=measured(matches,field).sort((a,b)=>(descending?-1:1)*(a.value-b.value));return rows.length?{value:rows[0].value,sample:rows.length,matchId:rows[0].match.match_id}:null}})
const pooled = (key:string,label:string,group:InsightGroup,name:string,definition:string):ArchiveMetric=>({key,label,group,unit:'%',definition,read:matches=>{let won=0,total=0,sample=0;for(const m of matches){let present=false;for(const side of [1,2] as const){const fraction=statFraction(m,side,name);if(fraction){won+=fraction[0];total+=fraction[1];present=true}}if(present)sample++}return total?{value:round(won/total*100),sample,numerator:won,denominator:total}:null}})
const bothStat = (m:Match,name:string) => {const a=statNumber(matchStat(m,1,name)),b=statNumber(matchStat(m,2,name));return a!==null&&b!==null?a+b:null}
const ranked = (m:Match) => !!m.context?.rankLabel && !/descarga/i.test(m.context.rankLabel) && (m.context.rank1||0)>0 && (m.context.rank2||0)>0
const winnerAge = (m:Match) => m.winner===1?m.context?.age1??null:m.winner===2?m.context?.age2??null:null
export const archiveMetrics: ArchiveMetric[] = [
 average('games-average','Juegos por partido','Resultados','','Suma de juegos del marcador dividida entre encuentros válidos.',gamesInMatch),
 average('sets-average','Sets por partido','Resultados','','Sets disputados por encuentro. El formato del torneo afecta al promedio.',m=>m.score_summary.games.length),
 rate('deciding-share','Partidos al set decisivo','Presión','Encuentros que necesitaron la última manga posible de su formato.',isDeciding),
 rate('comeback-share','Remontadas tras perder el primer set','Presión','Porcentaje de partidos cuyo ganador perdió la primera manga.',m=>lostOpening(m)),
 rate('two-down-share','Remontadas desde dos sets abajo','Presión','Sobre partidos en los que un jugador quedó 0–2 en sets; solo marcadores válidos.',m=>lostOpening(m,2),m=>m.score_summary.games.length>=3&&m.score_summary.games[0][0]>m.score_summary.games[0][1]=== (m.score_summary.games[1][0]>m.score_summary.games[1][1])),
 rate('straight-share','Victorias sin ceder un set','Resultados','Partidos en los que el perdedor no ganó ninguna manga.',m=>m.score_summary.games.every(set=>set[m.winner!-1]>set[2-m.winner!])),
 rate('tiebreak-share','Partidos con desempate','Presión','Encuentros con al menos un set terminado 7–6. No incluye desempates sin marcador identificable.',m=>tiebreakCount(m)>0),
 average('tiebreak-average','Desempates por partido','Presión','','Número de sets 7–6 por encuentro válido.',tiebreakCount),
 rate('bagel-share','Partidos con un 6–0','Resultados','Encuentros con al menos una manga terminada 6–0.',m=>m.score_summary.games.some(set=>Math.max(...set)===6&&Math.min(...set)===0)),
 rate('final-deciding-share','Finales al set decisivo','Presión','Finales válidas que llegaron al último set posible.',isDeciding,final),
 rate('final-comeback-share','Finales con remontada','Presión','Finales cuyo campeón perdió la primera manga.',m=>lostOpening(m),final),
 average('minutes-average','Duración media','Contexto',' min','Solo minutos publicados de hasta 12 horas; no estima duración del resto.',publishedMatchMinutes),
 extreme('longest','El partido más largo',' min','Máxima duración publicada de hasta 12 horas.',publishedMatchMinutes),
 extreme('most-games','Más juegos en un partido','','Mayor suma de juegos del marcador final.',gamesInMatch),
 rate('four-hours','Partidos de cuatro horas o más','Contexto','Porcentaje entre los encuentros con minutos publicados de hasta 12 horas.',m=>publishedMatchMinutes(m)!>=240,m=>publishedMatchMinutes(m)!==null),
 rate('upsets','Victorias del peor clasificado','Contexto','Solo rankings documentados en la fecha del partido y diferentes entre sí.',m=>m.winner===1?m.context!.rank1!>m.context!.rank2!:m.context!.rank2!>m.context!.rank1!,m=>ranked(m)&&m.context!.rank1!==m.context!.rank2),
 extreme('youngest-champion','Campeón más joven',' años','Edad documentada del ganador de una final. No estima fechas ni edades.',m=>final(m)?winnerAge(m):null,false),
 extreme('oldest-champion','Campeón de mayor edad',' años','Edad documentada del ganador de una final.',m=>final(m)?winnerAge(m):null),
 average('aces-average','Aces por encuentro','Servicio','','Suma de ambos jugadores, solo con dato de los dos.',m=>bothStat(m,'Aces')),
 average('faults-average','Dobles faltas por encuentro','Servicio','','Suma de ambos jugadores, solo con dato de los dos.',m=>bothStat(m,'Double Faults')),
 pooled('hold-rate','Juegos de saque conservados','Servicio','Service games won','Suma de juegos de servicio ganados sobre juegos de servicio jugados; ponderado por oportunidades.'),
 pooled('break-rate','Juegos al resto ganados','Resto','Return games won','Suma de juegos al resto ganados sobre juegos al resto disputados.'),
 pooled('break-efficiency','Conversión de bolas de break','Presión','Break points converted','Oportunidades convertidas sobre oportunidades registradas. No promedia porcentajes individuales.'),
 pooled('break-rescue','Bolas de break salvadas','Presión','Break points saved','Oportunidades salvadas sobre oportunidades afrontadas.'),
 pooled('first-return','Resto frente a primer saque','Resto','1st return points won','Puntos ganados al resto frente a primeros servicios, ponderados por puntos.'),
 pooled('second-return','Resto frente a segundo saque','Resto','2nd return points won','Puntos ganados al resto frente a segundos servicios, ponderados por puntos.'),
 average('winners-average','Golpes ganadores por encuentro','Golpes','','Solo encuentros que registran golpes ganadores de ambos jugadores.',m=>bothStat(m,'Golpes ganadores')),
 average('errors-average','Errores no forzados por encuentro','Golpes','','Solo encuentros con errores no forzados publicados de ambos jugadores.',m=>bothStat(m,'Errores no forzados')),
]
const summaries = new WeakMap<Match[],ReturnType<typeof calculateSummary>>()
export function archiveSummary(input: Match[]) {
 const saved=summaries.get(input)
 if(saved)return saved
 const result=calculateSummary(input)
 summaries.set(input,result)
 return result
}
function calculateSummary(input: Match[]) {
 const matches=input.filter(eligibleMatch)
 return {matches,observations:archiveMetrics.flatMap(metric=>{const observation=metric.read(matches);return observation?[{metric,...observation}]:[]})}
}
export function tournamentInsights(input: Match[]) {
 const groups=new Map<string,Match[]>()
 for(const match of input.filter(eligibleMatch)){const key=`${match.tournament}|${match.category}`; const rows=groups.get(key)||[];rows.push(match);groups.set(key,rows)}
 return [...groups].map(([key,matches])=>({key,name:matches[0].tournament,category:matches[0].category,editions:new Set(matches.map(m=>m.year)).size,...archiveSummary(matches)}))
}
