import type { Match, Surface, Tour } from './types'
import { dramaIndex } from './analytics/drama'

export function playerSlug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Internal identities always include the circuit; display slugs intentionally do not. */
export function playerIdentity(name: string, tour: Tour) {
  return `${tour}:${playerSlug(name)}`
}

export function pairSlug(first: string, second: string) {
  return [playerSlug(first), playerSlug(second)].sort().join('--')
}

export function rivalryIdentity(first: string, second: string, tour: Tour) {
  return `${tour}:${pairSlug(first, second)}`
}

export function comparisonHref(first: string, second: string, anchor = 'cara-a-cara', tour:Tour='atp') {
  const query = new URLSearchParams({ a: first, b: second,...(tour==='wta'?{tour}: {}) }).toString()
  return `/comparar?${query}${anchor ? `#${anchor}` : ''}`
}

export function matchArchiveHref(tour: Tour) {
  return tour === 'wta' ? '/partidos?tour=wta' : '/partidos'
}

export function tournamentHref(slug: string, tour: Tour, year?: number) {
  const path = `/torneos/${slug}${year === undefined ? '' : `/${year}`}`
  return tour === 'wta' ? `${path}?cuadro=wta` : path
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
      const key = playerIdentity(name, tour)
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

export function rivalryPair(matches: Match[], requested: [string, string], tour: Tour) {
  const identities = requested.map(name => playerIdentity(name, tour)) as [string, string]
  if (identities[0] === identities[1]) return null
  const rows = matches.filter(match => {
    if ((match.tour || 'atp') !== tour) return false
    const sides = [playerIdentity(match.player1.name, tour), playerIdentity(match.player2.name, tour)]
    return sides.includes(identities[0]) && sides.includes(identities[1])
  })
  if (!rows.length) return null
  const names = identities.map((identity, index) => {
    return [rows[0].player1.name, rows[0].player2.name].find(name => playerIdentity(name, tour) === identity) || requested[index]
  }) as [string, string]
  const wins = identities.map(identity => rows.filter(match => {
    const winner = match.winner === 1 ? match.player1.name : match.winner === 2 ? match.player2.name : ''
    return winner ? playerIdentity(winner, tour) === identity : false
  }).length) as [number, number]
  return { names, wins, played: rows.length, slug: pairSlug(...names) }
}

export function rivalryDirectory(matches: Match[]): RivalrySummary[] {
  const map = new Map<string, RivalrySummary>()
  for (const match of matches) {
    if (!match.winner || !match.player1.name || !match.player2.name) continue
    const names = [match.player1.name, match.player2.name].sort((a, b) => a.localeCompare(b, 'es')) as [string, string]
    const key = rivalryIdentity(names[0], names[1], match.tour || 'atp')
    let entry = map.get(key)
    if (!entry) { entry = { names, wins: [0, 0], matches: [], slug: key }; map.set(key, entry) }
    const winnerName = match.winner === 1 ? match.player1.name : match.player2.name
    const tour = match.tour || 'atp'
    entry.wins[playerIdentity(winnerName, tour) === playerIdentity(entry.names[0], tour) ? 0 : 1]++
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
