import type { Match, Surface, Tour } from './types'
import { dramaIndex } from './analytics/drama'

export function playerSlug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function pairSlug(first: string, second: string) {
  return [playerSlug(first), playerSlug(second)].sort().join('--')
}

export function comparisonHref(first: string, second: string, anchor = 'cara-a-cara') {
  const query = new URLSearchParams({ a: first, b: second }).toString()
  return `/comparar?${query}${anchor ? `#${anchor}` : ''}`
}

export type PlayerSummary = {
  name: string
  tour: Tour
  played: number
  won: number
  bySurface: Record<Surface, { played: number; won: number }>
  matches: Match[]
}

export function playerDirectory(matches: Match[]): PlayerSummary[] {
  const map = new Map<string, PlayerSummary>()
  for (const match of matches) {
    for (const side of [1, 2] as const) {
      const name = side === 1 ? match.player1.name : match.player2.name
      if (!name || !match.winner) continue
      const tour = match.tour || 'atp'
      const key = `${tour}:${name}`
      let entry = map.get(key)
      if (!entry) {
        entry = { name, tour, played: 0, won: 0, bySurface: { hard: { played: 0, won: 0 }, clay: { played: 0, won: 0 }, grass: { played: 0, won: 0 }, carpet: { played: 0, won: 0 }, unknown: { played: 0, won: 0 } }, matches: [] }
        map.set(key, entry)
      }
      entry.played++
      entry.won += Number(match.winner === side)
      entry.bySurface[match.surface].played++
      entry.bySurface[match.surface].won += Number(match.winner === side)
      entry.matches.push(match)
    }
  }
  return [...map.values()].sort((a, b) => b.won - a.won || b.played - a.played || a.name.localeCompare(b.name, 'es'))
}

export type RivalrySummary = { names: [string, string]; wins: [number, number]; matches: Match[]; slug: string }
export function rivalryDirectory(matches: Match[]): RivalrySummary[] {
  const map = new Map<string, RivalrySummary>()
  for (const match of matches) {
    if (!match.winner || !match.player1.name || !match.player2.name) continue
    const names = [match.player1.name, match.player2.name].sort((a, b) => a.localeCompare(b, 'es')) as [string, string]
    const slug = pairSlug(...names)
    const key = `${match.tour || 'atp'}:${slug}`
    let entry = map.get(key)
    if (!entry) { entry = { names, wins: [0, 0], matches: [], slug: key }; map.set(key, entry) }
    const winnerName = match.winner === 1 ? match.player1.name : match.player2.name
    entry.wins[winnerName === names[0] ? 0 : 1]++
    entry.matches.push(match)
  }
  return [...map.values()].filter(entry => entry.matches.length >= 2).sort((a, b) => b.matches.length - a.matches.length || a.slug.localeCompare(b.slug))
}

export function epicMatches(matches: Match[], limit = 24) {
  return matches.flatMap(match => {
    const drama = dramaIndex(match)
    return drama ? [{ match, drama }] : []
  }).sort((a, b) => b.drama.score - a.drama.score || b.match.year - a.match.year).slice(0, limit)
}
