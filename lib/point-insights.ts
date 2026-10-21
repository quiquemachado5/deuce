import type { Point } from './types'

type Cell = { value: string; detail?: string }
export type InsightRow = { label: string; first: Cell; second: Cell }
export type InsightGroup = { title: string; description: string; rows: InsightRow[] }
const unavailable: Cell = { value: 'Sin datos' }
const count = (value: number, available: number): Cell => available ? { value: String(value) } : unavailable
const fraction = (won: number, total: number): Cell => total ? { value: `${Math.round(won / total * 100)} %`, detail: `${won} de ${total}` } : unavailable

export function pointInsights(points: Point[]) {
  const known = points.filter(p => p.winner !== null)
  const longest = Math.max(0, ...points.map(p => p.rally_length || 0))
  const longestPoint = points.find(p => p.rally_length === longest)
  const maxStreak: Record<1 | 2, number> = { 1: 0, 2: 0 }
  let last: 1 | 2 | null = null
  let run = 0
  for (const point of [...points].sort((a, b) => a.point_number - b.point_number)) {
    if (point.winner === null) { last = null; run = 0; continue }
    run = point.winner === last ? run + 1 : 1
    last = point.winner
    maxStreak[last] = Math.max(maxStreak[last], run)
  }
  const service = points.filter(p => p.server !== null && p.winner !== null)
  const breakPoints = service.filter(p => p.is_break_point === true)
  const matchPoints = points.filter(p => p.is_match_point === true && p.match_point_for && p.winner !== null)
  const rallyPoints = points.filter(p => p.rally_length !== null && p.winner !== null)
  const rows = (get: (player: 1 | 2) => Cell, label: string): InsightRow => ({ label, first: get(1), second: get(2) })
  const groups: InsightGroup[] = [
    { title: 'Quién ganó los puntos', description: 'Reparto y rachas en el registro de puntos.', rows: [
      rows(player => count(known.filter(p => p.winner === player).length, known.length), 'Puntos ganados'),
      rows(player => fraction(known.filter(p => p.winner === player).length, known.length), 'Porcentaje de puntos'),
      rows(player => count(maxStreak[player], known.length), 'Mayor racha de puntos seguidos'),
    ] },
    { title: 'Saque y resto', description: 'Eficacia según quién puso la bola en juego.', rows: [
      rows(player => { const subset = service.filter(p => p.server === player); return fraction(subset.filter(p => p.winner === player).length, subset.length) }, 'Puntos ganados al saque'),
      rows(player => { const subset = service.filter(p => p.server !== player); return fraction(subset.filter(p => p.winner === player).length, subset.length) }, 'Puntos ganados al resto'),
      rows(player => { const subset = points.filter(p => p.server === player && typeof p.first_serve_in === 'boolean'); return fraction(subset.filter(p => p.first_serve_in).length, subset.length) }, 'Primer saque dentro'),
      rows(player => { const subset = service.filter(p => p.server === player && p.first_serve_in === true); return fraction(subset.filter(p => p.winner === player).length, subset.length) }, 'Primer saque: puntos ganados'),
      rows(player => { const subset = service.filter(p => p.server === player && p.first_serve_in === false); return fraction(subset.filter(p => p.winner === player).length, subset.length) }, 'Segundo saque: puntos ganados'),
      rows(player => { const subset = points.filter(p => p.server === player && typeof p.is_ace === 'boolean'); return count(subset.filter(p => p.is_ace).length, subset.length) }, 'Saques directos'),
      rows(player => { const subset = points.filter(p => p.server === player && typeof p.is_double_fault === 'boolean'); return count(subset.filter(p => p.is_double_fault).length, subset.length) }, 'Dobles faltas'),
    ] },
    { title: 'Puntos de presión', description: 'Solo puntos marcados expresamente como ruptura o partido.', rows: [
      rows(player => { const subset = breakPoints.filter(p => p.server === player); return fraction(subset.filter(p => p.winner === player).length, subset.length) }, 'Puntos de ruptura salvados'),
      rows(player => { const subset = breakPoints.filter(p => p.server !== player); return fraction(subset.filter(p => p.winner === player).length, subset.length) }, 'Puntos de ruptura convertidos'),
      rows(player => { const subset = matchPoints.filter(p => p.match_point_for !== player); return count(subset.filter(p => p.winner === player).length, subset.length) }, 'Puntos de partido salvados'),
    ] },
    { title: 'Intercambios', description: 'Longitud de los puntos que ganó cada jugador.', rows: [
      rows(player => { const subset = rallyPoints.filter(p => p.winner === player); return subset.length ? { value: `${(subset.reduce((sum, p) => sum + (p.rally_length || 0), 0) / subset.length).toFixed(1)} golpes`, detail: `${subset.length} puntos` } : unavailable }, 'Media de golpes en puntos ganados'),
      rows(player => { const subset = rallyPoints.filter(p => p.winner === player); return subset.length ? { value: `${Math.max(...subset.map(p => p.rally_length || 0))} golpes` } : unavailable }, 'Intercambio más largo ganado'),
      rows(player => { const subset = rallyPoints.filter(p => (p.rally_length || 0) >= 9); return fraction(subset.filter(p => p.winner === player).length, subset.length) }, 'Intercambios largos ganados'),
    ] },
  ]
  const sets = [...new Set(points.map(p => p.set))].sort((a, b) => a - b).map(set => {
    const subset = points.filter(p => p.set === set && p.winner !== null)
    return { set, total: subset.length, first: subset.filter(p => p.winner === 1).length, second: subset.filter(p => p.winner === 2).length }
  })
  return { groups, sets, knownPoints: known.length, totalPoints: points.length, longestPoint: longestPoint && longest > 0 ? longestPoint : null }
}
