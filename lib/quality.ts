import { referenceIssue, referenceScore } from './reviewed-finals'
import { tapeIntegrity, recordedTiebreaks, normalizePointTape } from './point-integrity'
import { orientMatch } from './match-presentation'
import aliases from './player-name-aliases.json'
import { verifiedResult } from './verified-results'
import { verifiedContext } from './verified-context'
import type { Match, Point } from './types'
import { normalizeSurface } from './surface'
import { historicalClosedSet } from './historical-rules'

export const ARCHIVE_CRITERIA = 'Individual masculino · cuadro principal · partidos terminados con sets cerrados y ganador coherente. Sin abandonos, incomparecencias ni marcadores en revisión. Cifras del archivo DEUCE, no de toda la carrera.'
export function normalizeText(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss') }
const names: Record<string, string> = {
  ...aliases,
  'alex corretja': 'Àlex Corretja',
  'felix auger aliassime': 'Félix Auger-Aliassime', 'gael monfils': 'Gaël Monfils', 'tomas berdych': 'Tomáš Berdych',
  'dusan lajovic': 'Dušan Lajović', 'dusan la jovic': 'Dušan Lajović', 'marin cilic': 'Marin Čilić', 'rainer schuettler': 'Rainer Schüttler', 'rainer schuttler': 'Rainer Schüttler',
  'rafael jodar': 'Rafael Jódar',
}
export function canonicalName(name: string) { return names[normalizeText(name).replace(/-/g, ' ').trim()] || name.trim() }
const tourVenueAliases: Record<string,string> = {
  'Eastbourne, Great Britain': 'Eastbourne',
  'Geneva, Switzerland': 'Geneva',
  'Halle, Germany': 'Halle',
  'Hamburg, Germany': 'Hamburg',
  'London, Great Britain': 'London',
  'Mallorca, Spain': 'Mallorca',
  'S-Hertogenbosch, Netherlands': 'Hertogenbosch',
  'Stuttgart, Germany': 'Stuttgart',
  'Winston Salem, USA': 'Winston-Salem',
}
export function canonicalTournamentName(name:string,year:number,category:string) {
  return year>=2023 && (category==='ATP 500'||category==='ATP 250') ? tourVenueAliases[name] || name : name
}
export function closedSet(pair: number[]) {
  if (pair.length !== 2 || pair.some(n => !Number.isInteger(n) || n < 0)) return false
  const high = Math.max(...pair), low = Math.min(...pair)
  return (high === 6 && low <= 4) || (high === 7 && (low === 5 || low === 6)) || (high >= 8 && high - low === 2)
}
export function resultIssue(match: Match): string | null {
  if (match.status.toLowerCase() !== 'finished') return 'El encuentro no tiene un resultado final completado.'
  if (match.winner !== 1 && match.winner !== 2) return 'Falta un ganador identificable.'
  const reference = referenceIssue(match)
  if (reference) return reference
  const sets = match.score_summary.games
  const format = match.context?.format || ''
  const bestOf = /(?:BO5|mejor de 5)/i.test(format) ? 5 : /(?:BO3|mejor de 3)/i.test(format) ? 3 : match.category === 'Grand Slam' ? 5 : 3
  const target = bestOf === 5 ? 3 : 2
  const wins = [0, 0]
  if (!sets.length || sets.length > bestOf) return 'El número de sets no corresponde al formato.'
  for (const [index, set] of sets.entries()) {
    if (wins.some(n => n >= target)) return 'Hay sets registrados después de finalizar el partido.'
    if (!closedSet(set) && !historicalClosedSet(match,index)) return 'El proveedor guarda al menos un set sin cerrar o imposible.'
    wins[set[0] > set[1] ? 0 : 1]++
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
  match = verifiedContext(verifiedResult(match))
  match = { ...match, surface: normalizeSurface(match.surface), tournament: canonicalTournamentName(match.tournament,match.year,match.category) }
  match = orientMatch(match)
  match = { ...match, point_tape: normalizePointTape(match.point_tape) }
  const issue = resultIssue(match)
  const tape = tapeIntegrity(match)
  const tapeIssue = tape.state === 'partial' ? 'Secuencia incompleta. Solo se muestran juegos con todos sus puntos registrados; no se reconstruye el desarrollo completo.' : undefined
  const points = issue ? [] : tape.state === 'partial' ? tape.usable : match.point_tape
  const tiebreaks=recordedTiebreaks({...match,point_tape:points})
  const score=referenceScore(match).split(/\s+/).map((token,i)=>{const game=tiebreaks.find(rows=>rows[0].set===i+1);return game&&!token.includes('(')?`${token}(${Math.min(game.filter(p=>p.winner===1).length,game.filter(p=>p.winner===2).length)})`:token}).join(' ')
  return { ...match, final_score: score.replace(/-/g, '–'), category: match.category === 'Masters 1000' && match.year < 1990 ? 'Precursores de Masters' : match.category, raw_fixture: undefined, raw_point_tape: undefined, player1: { ...match.player1, name: canonicalName(match.player1.name) }, player2: { ...match.player2, name: canonicalName(match.player2.name) },
    status: issue && match.status.toLowerCase() === 'finished' ? 'Review' : match.status, winner: issue ? null : match.winner,
    quality: { result: issue ? 'review' : 'consistent', reason: issue || undefined, tapeIssue, tape: tape.state },
    context: match.context?.rankLabel !== 'Ranking al jugar' ? { ...match.context, rank1: null, rank2: null, rankLabel: undefined } : match.context,
    point_tape: points, statistics: issue ? [] : match.statistics,
    coverage: points.length ? 'Puntos documentados' : match.statistics.length && !issue ? 'Estadísticas disponibles' : 'Solo resultado',
  }
}
