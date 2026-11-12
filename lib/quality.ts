import { referenceIssue, referenceScore } from './reviewed-finals'
import { tapeIntegrity, recordedTiebreaks, normalizePointTape } from './point-integrity'
import { orientMatch } from './match-presentation'
import aliases from './player-name-aliases.json'
import { verifiedResult } from './verified-results'
import { verifiedContext } from './verified-context'
import type { Match, Point } from './types'
import { normalizeSurface } from './surface'
import { historicalClosedSet } from './historical-rules'
import { historicalFormat } from './historical-formats'
import { canonicalTournamentName } from './tournament-identity'

export { canonicalTournamentName } from './tournament-identity'

export const ARCHIVE_CRITERIA = 'Individuales ATP y WTA · Grand Slam y categorías 1000, 500 y 250 · cuadro principal · resultados y retiradas durante el juego con ganador identificado. Sin incomparecencias ni marcadores en revisión. Cifras del archivo DEUCE, no de toda la carrera.'
export function normalizeText(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss') }
const names: Record<string, string> = {
  ...aliases,
  'alex corretja': 'Àlex Corretja',
  'felix auger aliassime': 'Félix Auger-Aliassime', 'gael monfils': 'Gaël Monfils', 'tomas berdych': 'Tomáš Berdych',
  'dusan lajovic': 'Dušan Lajović', 'dusan la jovic': 'Dušan Lajović', 'marin cilic': 'Marin Čilić', 'rainer schuettler': 'Rainer Schüttler', 'rainer schuttler': 'Rainer Schüttler',
  'rafael jodar': 'Rafael Jódar',
  'joao fonseca': 'João Fonseca',
}
export function canonicalName(name: string) { return names[normalizeText(name).replace(/-/g, ' ').trim()] || name.trim() }
export function closedSet(pair: number[]) {
  if (pair.length !== 2 || pair.some(n => !Number.isInteger(n) || n < 0)) return false
  const high = Math.max(...pair), low = Math.min(...pair)
  return (high === 6 && low <= 4) || (high === 7 && (low === 5 || low === 6)) || (high >= 8 && high - low === 2)
}
function documentedMatchTiebreak(match: Match) {
  if(match.tour!=='wta'||match.year!==2021)return false;
  if(match.tournament==='Grampians Trophy')return true;
  return ['Gippsland Trophy','Yarra Valley Classic'].includes(match.tournament)&&['Cuartos de final','Semifinal','Final'].includes(match.round);
}
export function isRetirement(match:Match){return /^(retired|retirement|ret|abandoned)$/i.test(match.status.trim())}
export function completedSets(match:Match){return match.score_summary.games.filter((set,index)=>closedSet(set)||historicalClosedSet(match,index))}
export function resultIssue(match: Match): string | null {
  if(isRetirement(match)){
    if(match.winner!==1&&match.winner!==2)return 'Falta el ganador documentado de la retirada.';
    const sets=match.score_summary.games;
    if(!sets.length||sets.length>5)return 'No hay juego documentado antes de la retirada.';
    if(sets.some(set=>set.length!==2||set.some(n=>!Number.isSafeInteger(n)||n<0)))return 'Marcador de retirada inválido.';
    if(sets.slice(0,-1).some((set,index)=>!closedSet(set)&&!historicalClosedSet(match,index)))return 'Set anterior a la retirada sin cerrar.';
    const last=sets.at(-1)!;
    if(!closedSet(last)&&!historicalClosedSet(match,sets.length-1)&&Math.max(...last)>=6&&Math.abs(last[0]-last[1])>1)return 'Set interrumpido imposible.';
    return null;
  }
  if (match.status.toLowerCase() !== 'finished') return 'El encuentro no tiene un resultado final completado.'
  if (match.winner !== 1 && match.winner !== 2) return 'Falta un ganador identificable.'
  const reference = referenceIssue(match)
  if (reference) return reference
  const sets = match.score_summary.games
  const format = match.context?.format || ''
  const bestOf = historicalFormat(match)?.bestOf || (/(?:BO5|mejor de 5)/i.test(format) ? 5 : /(?:BO3|mejor de 3)/i.test(format) ? 3 : match.category === 'Grand Slam' && match.tour !== 'wta' ? 5 : 3)
  const target = bestOf === 5 ? 3 : 2
  const wins = [0, 0]
  if (!sets.length || sets.length > bestOf) return 'El número de sets no corresponde al formato.'
  for (const [index, set] of sets.entries()) {
    if (wins.some(n => n >= target)) return 'Hay sets registrados después de finalizar el partido.'
    if (!closedSet(set) && !historicalClosedSet(match,index)) return 'El proveedor guarda al menos un set sin cerrar o imposible.'
    wins[set[0] > set[1] ? 0 : 1]++
  }
  const mt=match.score_summary.match_tiebreak;
  if(mt){
    // Pandemic Melbourne format: a match tiebreak replaces the third set, not extra games.
    if(!documentedMatchTiebreak(match)||target!==2||sets.length!==2||wins[0]!==1||wins[1]!==1||mt.length!==2||mt.some(n=>!Number.isInteger(n)||n<0)||Math.max(...mt)<10||Math.abs(mt[0]-mt[1])<2)return 'El desempate de partido no corresponde al formato documentado.';
    wins[mt[0]>mt[1]?0:1]++;
  }
  if (wins[match.winner - 1] !== target || wins[2 - match.winner] >= target) return 'El ganador no coincide con los sets necesarios para ganar.'
  return null
}
export function eligibleMatch(match: Match) { return !resultIssue(match) }
export function pointHeight(point: Point) {
  // Height measures documented pressure, never an invented rally length.
  return point.is_match_point ? 95 : point.is_break_point ? 75 : 38
}
export function prepareMatch(match: Match): Match {
  match = { ...match, statistics:match.statistics.filter(stat=>typeof stat.name==='string'&&typeof stat.period==='string'&&typeof stat.value==='string'), surface: normalizeSurface(match.surface), tournament: canonicalTournamentName(match.tournament,match.year,match.category,match.tour) }
  match = verifiedContext(verifiedResult(match))
  const reviewedFormat=historicalFormat(match)
  if(reviewedFormat)match={...match,context:{...match.context,format:`Al mejor de ${reviewedFormat.bestOf} sets`,metadataSources:[...(match.context?.metadataSources||[]).filter(row=>row.field!=='formato'),{field:'formato',url:reviewedFormat.source},{field:'formato',url:reviewedFormat.corroboration}]}}
  if(match.tour==='wta'&&match.tournament==='Grampians Trophy'&&match.year===2021&&match.score_summary.match_tiebreak)match={...match,context:{...match.context,metadataSources:[...(match.context?.metadataSources||[]).filter(row=>row.field!=='formato'),{field:'formato',url:'https://www.wtatennis.com/news/2018376/grampians'},{field:'formato',url:'https://www.wtatennis.com/news/2015350/__grampians___'}]}};
  if(documentedMatchTiebreak(match)&&match.tournament!=='Grampians Trophy'&&match.score_summary.match_tiebreak)match={...match,context:{...match.context,metadataSources:[...(match.context?.metadataSources||[]).filter(row=>row.field!=='formato'),{field:'formato',url:'https://ausopen.com/articles/news/melbourne-summer-series-womens-wrap-osaka-triumphs-barty-final-bound'},{field:'formato',url:'https://www.tennismajors.com/wta-tour-news/serena-barty-halep-kenin-to-play-in-stacked-friday-schedule-318587.html'}]}};
  match = orientMatch(match)
  match = { ...match, point_tape: normalizePointTape(match.point_tape) }
  const issue = resultIssue(match)
  const tape = tapeIntegrity(match)
  const tapeIssue = tape.state === 'partial' ? 'Solo se muestran juegos completos validados.' : undefined
  const points = issue ? [] : tape.state === 'partial' ? tape.usable : match.point_tape
  const tiebreaks=recordedTiebreaks({...match,point_tape:points})
  const score=referenceScore(match).split(/\s+/).map((token,i)=>{const game=tiebreaks.find(rows=>rows[0].set===i+1);return game&&!token.includes('(')?`${token}(${Math.min(game.filter(p=>p.winner===1).length,game.filter(p=>p.winner===2).length)})`:token}).join(' ')
  return { ...match, ...(isRetirement(match)?{score_summary:{...match.score_summary,sets:[completedSets(match).filter(s=>s[0]>s[1]).length,completedSets(match).filter(s=>s[1]>s[0]).length]}}:{}), final_score: score.replace(/-/g, '–'), category: match.category === 'Masters 1000' && match.year < 1990 ? 'Precursores de Masters' : match.category, raw_fixture: undefined, raw_point_tape: undefined, player1: { ...match.player1, name: canonicalName(match.player1.name) }, player2: { ...match.player2, name: canonicalName(match.player2.name) },
    status: issue && match.status.toLowerCase() === 'finished' ? 'Review' : match.status, winner: issue ? null : match.winner,
    quality: { result: issue ? 'review' : 'consistent', reason: issue || undefined, tapeIssue, tape: tape.state },
    context: match.context?.rankLabel !== 'Ranking al jugar' ? { ...match.context, rank1: null, rank2: null, rankLabel: undefined } : match.context,
    point_tape: points, statistics: issue ? [] : match.statistics,
    coverage: points.length ? 'Puntos documentados' : match.statistics.length && !issue ? 'Estadísticas disponibles' : 'Solo resultado',
  }
}
