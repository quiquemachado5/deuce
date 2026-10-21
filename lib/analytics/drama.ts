import type { Match, Point } from '../types'
import { eligibleMatch } from '../quality'

export type KeyMoment = { point: Point; change: number; before: number; after: number }

export function keyMoments(points: Point[], limit = 6): KeyMoment[] {
  const ordered = [...points].sort((a, b) => a.point_number - b.point_number)
  return ordered.flatMap((point, index) => {
    const previous = ordered[index - 1]
    if (!previous || point.point_number !== previous.point_number + 1 ||
      typeof previous.win_probability_p1 !== 'number' || typeof point.win_probability_p1 !== 'number') return []
    const change = Math.abs(point.win_probability_p1 - previous.win_probability_p1)
    return change >= .04 ? [{ point, change: Math.round(change * 100), before: previous.win_probability_p1, after: point.win_probability_p1 }] : []
  }).sort((a, b) => b.change - a.change || a.point.point_number - b.point.point_number).slice(0, limit)
}

export const DRAMA_FORMULA = 'Índice de tensión del marcador (0–100): 40 × proporción media de juegos del perdedor de cada set respecto al ganador; 30 si se disputa el set decisivo; 20 × proporción de sets resueltos en desempate; 10 × min(1, juegos del perdedor del último set / 6). Se redondea al entero. Misma fórmula para todos; sin puntos, duración, ronda ni prestigio. No mide calidad ni importancia histórica.'
export function dramaIndex(match: Match): { score: number; explanation: string } | null {
  if (!eligibleMatch(match)) return null
  const games = match.score_summary.games
  const needed = Math.max(...match.score_summary.sets, games.filter(([a,b]) => a>b).length, games.filter(([a,b]) => b>a).length)
  const balance = games.reduce((sum,[a,b]) => sum + Math.min(a,b)/Math.max(a,b),0)/games.length
  const deciding = games.length === needed * 2 - 1
  const tiebreaks = games.filter(([a,b]) => Math.max(a,b) === 7 && Math.min(a,b) === 6).length / games.length
  const last = games.at(-1)!
  const score = Math.round(40*balance + (deciding ? 30 : 0) + 20*tiebreaks + 10*Math.min(1,Math.min(...last)/6))
  return { score, explanation: 'Tensión del marcador: equilibrio entre juegos, set decisivo y desempates.' }
}
