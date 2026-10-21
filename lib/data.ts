import 'server-only'
import { cache } from 'react'
import { asyncCache } from './async-cache'
import { eligibleMatch, prepareMatch } from './quality'
import { createClient } from '@supabase/supabase-js'
import { mockMatches } from './mocks'
import { TOURNAMENTS, type Match, type Point } from './types'
import { normalizeStatistics } from './statistics'
import { invalidateArchiveCache, archiveMatch, archiveMatches, archiveDetailedMatches, hasArchive } from './live-tennis'

const mock = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false'
function db() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
function filter(matches: Match[], year?: number, slug?: string) {
  const name = TOURNAMENTS.find(t => t.slug === slug)?.name
  return matches.filter(m => (!year || m.year === year) && (!slug || m.tournament === name))
}
function compact(match: Match): Match { return { ...match, point_tape: [], statistics: [], coverage: 'Solo resultado', raw_point_tape: undefined, raw_fixture: undefined } }
async function stored(year?: number): Promise<Match[]> {
  const client = db()
  if (!client) return []
  const rows: any[] = []
  for (let start = 0;; start += 500) {
    let query = client.from('matches').select('id,player1,player2,score_summary,final_score,round,winner,status,statistics,raw_fixture,tournaments!inner(name,category,surface,season),point_tapes(points,raw_tape)')
    if (year) query = query.eq('tournaments.season', year)
    const { data, error } = await query.order('id').range(start, start + 499)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 500) break
  }
  return rows.map(r => ({ match_id: r.id, tournament: r.tournaments.name, surface: r.tournaments.surface, category: r.tournaments.category, year: r.tournaments.season, player1: r.player1, player2: r.player2, score_summary: r.score_summary, final_score: r.final_score, round: r.round, winner: r.winner, status: r.status, point_tape: r.point_tapes?.points || [] as Point[], statistics: r.statistics?.length ? r.statistics : normalizeStatistics(r.raw_fixture?.statistics, r.raw_fixture?.first_player_key, r.raw_fixture?.second_player_key), raw_fixture: r.raw_fixture, raw_point_tape: r.point_tapes?.raw_tape, data_source: 'api' as const }))
}
const lists = asyncCache<Match[]>(300_000, 4)
const details = asyncCache<Match[]>(300_000, 2)
const singles = asyncCache<Match | undefined>(300_000, 100)
export const getMatches = cache(async (year?: number, slug?: string, summary = false): Promise<Match[]> => {
  const matches = await lists(String(summary), async () => {
    const rows = mock ? mockMatches : hasArchive() ? await archiveMatches(undefined, summary) : await stored()
    return rows.map(prepareMatch).filter(eligibleMatch).map(m => summary ? compact(m) : m)
  })
  return !year && !slug ? matches : filter(matches, year, slug)
})
export const getMatch = cache(async (id: string): Promise<Match | undefined> => singles(id, async () => {
  const match = mock ? mockMatches.find(m => m.match_id === id) : hasArchive() ? await archiveMatch(id) : (await stored()).find(m => m.match_id === id)
  return match ? prepareMatch(match) : undefined
}))
export async function getSeasonMatches(year?: number): Promise<Match[]> { return getMatches(year) }
export const getAnalyzableMatches = cache(async (year?: number): Promise<Match[]> => {
  const matches = await details('all', async () => {
    const rows = mock ? mockMatches : hasArchive() ? await archiveDetailedMatches() : await stored()
    return rows.map(prepareMatch).filter(eligibleMatch)
  })
  return year ? matches.filter(m => m.year === year) : matches
})
export function dataMode() { return mock ? 'DEMO' : hasArchive() ? 'ARCHIVO REAL' : db() ? 'BASE DE DATOS' : 'SIN DATOS' }

export function invalidateDataCache() { lists.clear(); details.clear(); singles.clear(); invalidateArchiveCache() }
