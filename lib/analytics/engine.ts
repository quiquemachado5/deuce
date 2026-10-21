import type { Match, Point } from '../types'
import { findStat } from '../statistics'

export type Rate = { won: number; total: number; percent: number | null }
export type PlayerPair<T> = { first: T; second: T }
export type ThirtyAllPlayer = { leverWon: number; gamesWonAfterLever: number; conversion: number | null }
export type Pivot = { pointNumber: number; set: number; game: number; before: number; after: number; changePoints: number }
export type AdvancedReport = {
  coverage: { points: number; winners: number; firstServes: number; rallies: number; probabilities: number; unforcedErrors: number }
  pressure: { firstServeMisses: PlayerPair<Rate>; thirtyAll: PlayerPair<ThirtyAllPlayer>; thirtyAllGames: number; breakAgainstSecondServe: PlayerPair<Rate>; unforcedErrorsAvailable: boolean }
  rallies: { firstStrike: PlayerPair<Rate>; afterLongRally: PlayerPair<Rate>; longRallies: number; baseline: PlayerPair<Rate> }
  pivot: Pivot | null
}

const emptyRate = (): Rate => ({ won: 0, total: 0, percent: null })
const pair = <T>(make: () => T): PlayerPair<T> => ({ first: make(), second: make() })
const playerRate = (rows: Point[], player: 1 | 2): Rate => ({ won: rows.filter(p => p.winner === player).length, total: rows.length, percent: rows.length ? Math.round(rows.filter(p => p.winner === player).length / rows.length * 100) : null })
const finish = (rate: Rate) => { rate.percent = rate.total ? Math.round(rate.won / rate.total * 100) : null }
const scoreKey = (score: string) => score.toLowerCase().replace(/\s/g, '').replace(/[–—:]/g, '-')
const pressureScore = (score: string) => scoreKey(score) === '30-30' || scoreKey(score) === '40-40' || scoreKey(score) === 'deuce'
const gameKey = (point: Point) => `${point.set}/${point.game}`

/** All percentages require observed denominators. Missing data stays null, never zero. */
export function analyzePointTape(points: Point[]): AdvancedReport {
  const tape = [...points].sort((a, b) => a.point_number - b.point_number)
  const byGame = new Map<string, Point[]>()
  const before = new Map<number, string>()
  for (const point of tape) {
    const key = gameKey(point)
    const game = byGame.get(key) || []
    before.set(point.point_number, point.score_before ?? (game.length ? game[game.length - 1].score : '0-0'))
    game.push(point)
    byGame.set(key, game)
  }
  const pressure = tape.filter(p => p.is_break_point === true || pressureScore(before.get(p.point_number) || '0-0'))
  const firstServeMisses = pair(emptyRate)
  for (const point of pressure) {
    if (!point.server || point.first_serve_in === null) continue
    const rate = point.server === 1 ? firstServeMisses.first : firstServeMisses.second
    rate.total++
    if (point.first_serve_in === false) rate.won++
  }
  finish(firstServeMisses.first); finish(firstServeMisses.second)

  const thirtyAll = pair<ThirtyAllPlayer>(() => ({ leverWon: 0, gamesWonAfterLever: 0, conversion: null }))
  let thirtyAllGames = 0
  for (const game of byGame.values()) {
    const last = game[game.length - 1]
    if (!last?.winner || (!last.game_ended && scoreKey(last.score) !== '0-0')) continue
    const lever = game.find(point => pressureScore(before.get(point.point_number) || '') && scoreKey(before.get(point.point_number) || '') === '30-30' && point.winner)
    if (!lever?.winner) continue
    thirtyAllGames++
    const entry = lever.winner === 1 ? thirtyAll.first : thirtyAll.second
    entry.leverWon++
    if (last.winner === lever.winner) entry.gamesWonAfterLever++
  }
  for (const entry of [thirtyAll.first, thirtyAll.second]) entry.conversion = entry.leverWon ? Math.round(entry.gamesWonAfterLever / entry.leverWon * 100) : null

  const breakAgainstSecondServe = pair(emptyRate)
  for (const point of tape) {
    if (!point.server || point.winner === null || point.is_break_point !== true || point.first_serve_in !== false) continue
    const returner = point.server === 1 ? 2 : 1
    const rate = returner === 1 ? breakAgainstSecondServe.first : breakAgainstSecondServe.second
    rate.total++
    if (point.winner === returner) rate.won++
  }
  finish(breakAgainstSecondServe.first); finish(breakAgainstSecondServe.second)

  const firstStrikePoints = tape.filter(p => p.winner !== null && p.rally_length !== null && p.rally_length >= 1 && p.rally_length <= 4)
  const afterLong = tape.filter((p, index) => index > 0 && tape[index - 1].rally_length !== null && tape[index - 1].rally_length! > 10 && p.point_number === tape[index - 1].point_number + 1 && p.winner !== null)
  const known = tape.filter(p => p.winner !== null)
  const pivot = tape.reduce<Pivot | null>((best, point, index) => {
    const previous = tape[index - 1]
    if (!previous || point.point_number !== previous.point_number + 1 || typeof point.win_probability_p1 !== 'number' || typeof previous.win_probability_p1 !== 'number') return best
    const changePoints = Math.round(Math.abs(point.win_probability_p1 - previous.win_probability_p1) * 1000) / 10
    return !best || changePoints > best.changePoints ? { pointNumber: point.point_number, set: point.set, game: point.game, before: previous.win_probability_p1, after: point.win_probability_p1, changePoints } : best
  }, null)

  return {
    coverage: { points: tape.length, winners: known.length, firstServes: tape.filter(p => p.first_serve_in !== null).length, rallies: tape.filter(p => p.rally_length !== null).length, probabilities: tape.filter(p => typeof p.win_probability_p1 === 'number').length, unforcedErrors: tape.filter(p => p.is_unforced_error !== null && p.is_unforced_error !== undefined).length },
    pressure: { firstServeMisses, thirtyAll, thirtyAllGames, breakAgainstSecondServe, unforcedErrorsAvailable: tape.some(p => p.is_unforced_error !== null && p.is_unforced_error !== undefined) },
    rallies: { firstStrike: { first: playerRate(firstStrikePoints, 1), second: playerRate(firstStrikePoints, 2) }, afterLongRally: { first: playerRate(afterLong, 1), second: playerRate(afterLong, 2) }, longRallies: tape.filter(p => p.rally_length !== null && p.rally_length > 10).length, baseline: { first: playerRate(known, 1), second: playerRate(known, 2) } },
    pivot,
  }
}

export function chooseSocialHighlight(match: Match, report: AdvancedReport): { headline: string; evidence: string } {
  const players = [match.player1.name, match.player2.name]
  const lever = [report.pressure.thirtyAll.first, report.pressure.thirtyAll.second]
  const leverIndex = lever.findIndex(row => row.leverWon >= 2 && row.conversion !== null && row.conversion >= 75)
  if (leverIndex >= 0) return { headline: `${players[leverIndex]} ganó ${lever[leverIndex].gamesWonAfterLever} de ${lever[leverIndex].leverWon} juegos tras imponerse en el 30-30.`, evidence: 'Juegos completos con secuencia de puntos disponible' }
  const breakRows = [report.pressure.breakAgainstSecondServe.first, report.pressure.breakAgainstSecondServe.second]
  const breakIndex = breakRows.findIndex(row => row.total >= 2)
  if (breakIndex >= 0) return { headline: `${players[breakIndex]} convirtió ${breakRows[breakIndex].won} de ${breakRows[breakIndex].total} bolas de break ante un segundo saque.`, evidence: 'Bolas de break con primer servicio fallado registrado' }
  const strike = [report.rallies.firstStrike.first, report.rallies.firstStrike.second]
  const strikeIndex = strike.findIndex(row => row.total >= 8 && row.percent !== null && row.percent >= 60)
  if (strikeIndex >= 0) return { headline: `${players[strikeIndex]} ganó el ${strike[strikeIndex].percent}% de los puntos de 1 a 4 golpes.`, evidence: `${strike[strikeIndex].won} de ${strike[strikeIndex].total} intercambios cortos registrados` }
  const pivot = report.pivot
  if (pivot) return { headline: `Un solo punto movió ${pivot.changePoints} puntos la probabilidad de victoria.`, evidence: `Set ${pivot.set}, juego ${pivot.game}, punto ${pivot.pointNumber} · modelo del proveedor` }
  const aces = ([1, 2] as const).map(player => Number(findStat(match.statistics, player, 'Aces')?.value))
  const aceLeader = aces[1] > aces[0] ? 1 : 0
  if (Number.isFinite(aces[aceLeader]) && aces[aceLeader] >= 10) return { headline: `${players[aceLeader]} firmó ${aces[aceLeader]} saques directos.`, evidence: 'Saques directos registrados durante el encuentro' }
  const games = match.score_summary.games
  if (games.length && games.every(set => set.length === 2)) {
    const total = games.reduce((sum, set) => sum + set[0] + set[1], 0)
    const tight = games.filter(([a,b]) => Math.min(a,b) >= 5).length
    return { headline: `${total} juegos para decidir el partido.`, evidence: `${games.length} sets${tight ? ` · ${tight} decididos por dos juegos o en un desempate` : ''}` }
  }
  return { headline: `${players[match.winner === 2 ? 1 : 0]} cerró el partido ${match.final_score || 'con victoria'}.`, evidence: 'Marcador final guardado en DEUCE' }
}
