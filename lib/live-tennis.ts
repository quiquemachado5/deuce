import 'server-only'
import {mergeEditionReferences,editionReferenceMatches} from './verified-editions'
import {isCompetitionOnly,prepareCompetitionMatch} from './competition'
import { pointPosition } from './point-position'
import { closedSet,prepareMatch,eligibleMatch } from './quality'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import type { Match, MatchStat, Point } from './types'
import { normalizeSurface as surface } from './surface'
import { createLimiter } from './concurrency'
import { cloudRead, cloudDetails } from './cloud-archive'
import { modernTournamentCategory, historicalTournamentCategory } from './tournament-tier'
import { dedupeArchiveTourRows } from './archive-tour-dedupe'

const archive = join(process.cwd(), 'data', 'archive')
const listsDir = join(archive, 'lists')
const detailsDir = join(archive, 'details')

type Row = Record<string, any>
const archiveIO = createLimiter(16)
async function readZip(file: string): Promise<any> {
  return archiveIO(async () => JSON.parse(gunzipSync(await readFile(file)).toString()))
}
let filesPromise: Promise<string[]> | undefined
async function listFiles(prefix: string) {
  filesPromise ||= readdir(listsDir).then(files=>files.filter(name=>{
    if (!name.endsWith('.json.gz')) return false
    const tour = name.match(/^(modern-\d{4}-tour)-\d+\.json\.gz$/)
    if (tour && !existsSync(join(listsDir, `${tour[1]}.complete.json`))) return false
    return !/^archive-\d{4}-A-\d+\.json\.gz$/.test(name) || existsSync(join(listsDir, 'archive-A.complete.json'))
  }).sort()).catch(()=>[])
  return (await filesPromise).filter(name=>name.startsWith(prefix))
}
async function rowsFor(prefix: string): Promise<Row[]> {
  const season = prefix.match(/^modern-(\d{4})-$/)
  if (season) {
    const cloud = await cloudRead(`season-${season[1]}`)
    if (Array.isArray(cloud?.data)) {
      if (['atp-main-v1','atp-main-v2'].includes(cloud.scope)) return cloud.data
      // Older cloud snapshots contain only Slams and Masters. Add the new,
      // completely downloaded local tour cohort until the cron replaces them.
      const tour = (await listFiles(`modern-${season[1]}-tour-`))
      const pages = await Promise.all(tour.map(name => readZip(join(listsDir, name))))
      const merged = new Map<string, Row>(cloud.data.map((row: Row) => [String(row.id), row]))
      for (const page of pages) for (const row of Array.isArray(page.data) ? page.data : []) merged.set(String(row.id), row)
      return [...merged.values()]
    }
  }
  const files = await listFiles(prefix)
  const pages = await Promise.all(files.map(name => readZip(join(listsDir, name))))
  const rows = pages.flatMap(page => Array.isArray(page.data) ? page.data : [])
  if (!season) return rows
  // The current-year refresh can include the tour cohort already stored in
  // separate pages. Keep the refreshed base row when an ID appears twice.
  const unique = new Map<string, Row>()
  for (const row of rows) if (!unique.has(String(row.id))) unique.set(String(row.id), row)
  return [...unique.values()]
}
function numeric(value: unknown) { if (value === null || value === undefined || value === '') return null; const result = Number(value); return Number.isFinite(result) ? result : null }
function player(number: 1 | 2, name: string, seed: unknown) { return { name: name || `Jugador ${number}`, seed: numeric(seed) } }
function gamesFromScore(raw: unknown): number[][] {
  if (!Array.isArray(raw) || raw.length !== 2 || !raw.every(Array.isArray)) return []
  return Array.from({ length: Math.max(raw[0].length, raw[1].length) }, (_, i) => [Number(raw[0][i]) || 0, Number(raw[1][i]) || 0])
}
function scoreFromGames(games: number[][]) { return games.map(([a, b]) => `${a}–${b}`).join(' ') }
function archiveGames(score: string): number[][] {
  return score.split(/\s+/).map(part => part.match(/^(\d+)-(\d+)/)).filter(Boolean).map(match => [Number(match![1]), Number(match![2])])
}
function roundName(code: string) { return ({ F: 'Final', SF: 'Semifinal', QF: 'Cuartos de final', R16: 'Octavos de final', R32: 'Tercera ronda', R64: 'Segunda ronda', R128: 'Primera ronda' } as Record<string, string>)[code] || code }
function tournamentName(name: string) {
  const n = name.toLowerCase()
  if ((n.includes('australian open') || n.includes('australian chps'))) return 'Australian Open'
  if (n.includes('roland') || n.includes('french open')) return 'Roland Garros'
  if (n.includes('wimbledon')) return 'Wimbledon'
  if (n.includes('us open')) return 'US Open'
  if (n.includes('indian wells')) return 'Indian Wells'
  if (n.includes('miami')) return 'Miami'
  if (n.includes('monte')) return 'Monte Carlo'
  if (n.includes('madrid')) return 'Madrid'
  if (n.includes('rome') || n.includes('roma')) return 'Rome'
  if (n.includes('canad') || n.includes('toronto') || n.includes('montreal')) return 'Canada'
  if (n.includes('cincinnati')) return 'Cincinnati'
  if (n.includes('shanghai')) return 'Shanghai'
  if (n.includes('paris')) return 'Paris'
  return name.replace(/^ATP\s+/i, '')
}
function stat(playerIndex: 1 | 2, category: string, name: string, value: unknown, won: unknown = null, total: unknown = null): MatchStat | null {
  if (value === null || value === undefined) return null
  return { player: playerIndex, period: 'match', category, name, value: String(value), won: numeric(won), total: numeric(total) }
}
const measuredMap: Record<string, [string, string]> = {
  aces: ['Service', 'Aces'], double_faults: ['Service', 'Double Faults'],
  first_serves_in: ['Service', '1st serve in'], second_serves_in: ['Service', 'Second serves in'],
  first_serve_points_won: ['Service', '1st serve points won'], second_serve_points_won: ['Service', '2nd serve points won'],
  first_return_points_won: ['Return', '1st return points won'], second_return_points_won: ['Return', '2nd return points won'],
  service_points_won: ['Service', 'Service points won'], return_points_won: ['Return', 'Return points won'],
  points_won: ['Points', 'Total points won'], break_points_saved: ['Breaks', 'Break points saved'],
  break_points_won: ['Breaks', 'Break points converted'], games_won: ['Points', 'Games won'],
  max_games_in_row: ['Points', 'Consecutive games won'], max_points_in_row: ['Points', 'Consecutive points won'],
  service_games_won: ['Service', 'Service games won'], service_games_played: ['Service', 'Service games played'],
  tiebreaks_won: ['Points', 'Tie breaks won'],
  winners_total: ['Golpes ganadores', 'Golpes ganadores'], forehand_winners: ['Golpes ganadores', 'Ganadores de derecha'],
  backhand_winners: ['Golpes ganadores', 'Ganadores de revés'], volley_winners: ['Golpes ganadores', 'Voleas ganadoras'],
  overhead_winners: ['Golpes ganadores', 'Remates ganadores'], drop_shot_winners: ['Golpes ganadores', 'Dejadas ganadoras'],
  lob_winners: ['Golpes ganadores', 'Globos ganadores'], return_winners: ['Golpes ganadores', 'Restos ganadores'],
  groundstroke_winners: ['Golpes ganadores', 'Golpes de fondo ganadores'],
  unforced_errors_total: ['Errores', 'Errores no forzados'], errors_total: ['Errores', 'Errores forzados'],
  forehand_errors: ['Errores', 'Errores forzados de derecha'], backhand_errors: ['Errores', 'Errores forzados de revés'],
  return_errors: ['Errores', 'Errores forzados al resto'], overhead_errors: ['Errores', 'Errores forzados en remates'],
  groundstroke_errors: ['Errores', 'Errores forzados de fondo'],
  forehand_unforced_errors: ['Errores', 'Errores no forzados de derecha'],
  backhand_unforced_errors: ['Errores', 'Errores no forzados de revés'],
  volley_unforced_errors: ['Errores', 'Errores no forzados en volea'],
  drop_shot_unforced_errors: ['Errores', 'Errores no forzados en dejadas'],
  lob_unforced_errors: ['Errores', 'Errores no forzados en globos'],
  groundstroke_unforced_errors: ['Errores', 'Errores no forzados de fondo'],
}
function modernStats(detail: Row | undefined): MatchStat[] {
  const stats = detail?.stats?.players
  if (!stats) return []
  const all: MatchStat[] = []
  for (const [key, index] of [['p1', 1], ['p2', 2]] as const) {
    const p = stats[key]
    if (!p) continue
    const measured = p.measured || {}
    for (const [field, value] of Object.entries(measured)) {
      if (field.endsWith('_of') || field.endsWith('_pct') || value === null || value === undefined) continue
      const [category, name] = measuredMap[field] || ['Otras', field.replace(/_/g, ' ')]
      const total = measured[`${field}_of`] ?? (field === 'break_points_won' ? p.break_points_played : null)
      const entry = stat(index, category, name, total != null ? `${value} / ${total}` : value, numeric(value), total)
      if (entry) all.push(entry)
    }
    for (const [field, category, name, totalField] of [
      ['hold_pct', 'Service', 'Hold percentage', null], ['break_pct', 'Breaks', 'Break percentage', null],
      ['service_games_played', 'Service', 'Service games played', null], ['service_games_won', 'Service', 'Service games won', 'service_games_played'],
      ['return_games_played', 'Return', 'Return games played', null], ['return_games_won', 'Return', 'Return games won', 'return_games_played'],
      ['service_points_played', 'Service', 'Service points played', null], ['service_points_won', 'Service', 'Service points won', 'service_points_played'],
      ['return_points_played', 'Return', 'Return points played', null], ['return_points_won', 'Return', 'Return points won', 'return_points_played'],
      ['points_played', 'Points', 'Points played', null], ['points_won', 'Points', 'Total points won', 'points_played'],
      ['break_points_faced', 'Breaks', 'Break points faced', null], ['break_points_saved', 'Breaks', 'Break points saved', 'break_points_faced'],
      ['break_points_played', 'Breaks', 'Break points played', null], ['break_points_converted', 'Breaks', 'Break points converted', 'break_points_played'],
    ] as const) {
      if (measured[field] != null || (field === 'break_points_converted' && measured.break_points_won != null)) continue
      const value = p[field]
      if (value === null || value === undefined) continue
      const total = totalField ? p[totalField] : null
      const display = field.endsWith('_pct') ? `${value}%` : total != null ? `${value} / ${total}` : value
      const entry = stat(index, category, name, display, total == null ? null : value, total)
      if (entry) all.push(entry)
    }
  }
  // Keep measured service subtotals together; provider summary denominators can be stale.
  for (const side of [1, 2] as const) {
    const get = (name: string) => all.find(s => s.player === side && s.name === name)
    const first = get('1st serve points won'), second = get('2nd serve points won')
    if (first?.total != null && second?.total != null && first.won != null && second.won != null) {
      const total = first.total + second.total
      for (const [player, name] of [[side, 'Service points played'], [side === 1 ? 2 : 1, 'Return points played']] as const) {
        const row = all.find(s => s.player === player && s.name === name)
        if (row) { row.value = String(total); row.won = total }
      }
      const won = get('Service points won')
      if (won?.won === first.won + second.won) won.total = total
    }
  }
  const measuredServiceTotals = ([1, 2] as const).map(side => {
    const first = all.find(s => s.player === side && s.name === '1st serve points won')
    const second = all.find(s => s.player === side && s.name === '2nd serve points won')
    return first?.total != null && second?.total != null ? first.total + second.total : null
  })
  if (measuredServiceTotals.every(n => n !== null)) for (const row of all.filter(s => s.name === 'Points played')) {
    row.value = String(measuredServiceTotals[0]! + measuredServiceTotals[1]!); row.won = Number(row.value)
  }
  return all
}
function archiveStats(detail: Row | undefined): MatchStat[] {
  if (!detail?.stats) return []
  const all: MatchStat[] = []
  for (const [side, index] of [['winner', 1], ['loser', 2]] as const) {
    const p = detail.stats[side]
    if (!p) continue
    for (const [field, category, name, total] of [
      ['aces', 'Service', 'Aces', null], ['double_faults', 'Service', 'Double Faults', null],
      ['first_in', 'Service', '1st serve in', 'serve_points'], ['first_won', 'Service', '1st serve points won', 'first_in'],
      ['second_won', 'Service', '2nd serve points won', null], ['serve_games', 'Service', 'Service games played', null],
      ['serve_points', 'Service', 'Service points played', null], ['bp_saved', 'Breaks', 'Break points saved', 'bp_faced'],
      ['bp_faced', 'Breaks', 'Break points faced', null],
    ] as const) {
      const value = p[field]
      if (value === null || value === undefined) continue
      const denominator = field === 'second_won' && p.serve_points != null && p.first_in != null ? p.serve_points - p.first_in : total ? p[total] : null
      const entry = stat(index, category, name, denominator != null ? `${value} / ${denominator}` : value, value, denominator)
      if (entry) all.push(entry)
    }
  }
  return all
}
function isBreakPoint(score: unknown, server: 1 | 2 | null): boolean | null {
  if (!Array.isArray(score) || score.length !== 2 || !server) return null
  const serving = String(score[server - 1]).toUpperCase()
  const returning = String(score[2 - server]).toUpperCase()
  if (returning === 'AD' || returning === 'A') return true
  if (returning === '40' && ['0', '15', '30'].includes(serving)) return true
  return false
}
function gamePointFor(score: unknown, player: 1 | 2, tiebreak: boolean, tiebreakTarget = 7): boolean {
  if (!Array.isArray(score) || score.length !== 2) return false
  const own = String(score[player - 1]).toUpperCase()
  const other = String(score[2 - player]).toUpperCase()
  if (tiebreak) return Number(own) >= tiebreakTarget - 1 && Number(own) > Number(other)
  return (own === '40' && ['0', '15', '30'].includes(other)) || ((own === 'AD' || own === 'A') && other === '40')
}
function matchPointFor(previous: Row | undefined, bestOf: number): 1 | 2 | null {
  if (!previous) return null
  const neededSets = bestOf === 5 ? 3 : 2
  const allGames = gamesFromScore(previous.games)
  const games = allGames.at(-1)
  if (!games || closedSet(games)) return null
  const completedSets = [0, 0]
  for (const [a, b] of allGames.slice(0, -1)) {
    if (a > b) completedSets[0]++
    else if (b > a) completedSets[1]++
  }
  for (const player of [1, 2] as const) {
    if (completedSets[player - 1] !== neededSets - 1) continue
    const own = games[player - 1], other = games[2 - player]
    const setPoint = previous.is_tiebreak ? own === 6 && other === 6 : own >= 5 && own + 1 - other >= 2
    const tiebreakTarget = bestOf === 5 && completedSets[0] === 2 && completedSets[1] === 2 ? 10 : 7
    if (setPoint && gamePointFor(previous.points, player, !!previous.is_tiebreak, tiebreakTarget)) return player
  }
  return null
}
function tapePoints(detail: Row | undefined): Point[] {
  if (!Array.isArray(detail?.tape)) return []
  const points: Point[] = []
  let previous: Row | undefined
  for (const row of detail.tape) {
    const winner = row.winner === 1 || row.winner === 2 ? row.winner : row.point_winner === 1 || row.point_winner === 2 ? row.point_winner : null
    const games = gamesFromScore(row.games)
    const previousGames = gamesFromScore(previous?.games)
    const pointGames = previousGames.length ? previousGames : games
    const {set,game} = pointPosition(pointGames, previous?.sets)
    const serverValue = previous?.server ?? row.server
    const server = serverValue === 1 || serverValue === 2 ? serverValue : null
    const sameGame = previousGames.length === games.length && JSON.stringify(previous?.games) === JSON.stringify(row.games)

    const breakPoint = previous ? previous.is_tiebreak ? false : isBreakPoint(previous.points, server) : null
    const matchPoint = matchPointFor(previous, detail?.match?.format === 'BO5' ? 5 : 3)
    const repeated = previous && sameGame && JSON.stringify(previous.points) === JSON.stringify(row.points)
    if (winner && !repeated) points.push({
      set, game, point_number: points.length + 1, server,
      score: Array.isArray(row.points) ? row.points.join('-') : '', score_before: Array.isArray(previous?.points) ? previous.points.join('-') : undefined, game_ended: !sameGame, winner,
      rally_length: null, is_ace: row.outcome === 'ace' ? true : row.outcome ? false : null, is_double_fault: row.outcome === 'double_fault' ? true : row.outcome ? false : null,
      is_break_point: breakPoint, break_converted: breakPoint === true ? winner !== server : null,
      is_match_point: matchPoint !== null, match_point_for: matchPoint, first_serve_in: row.serve === 1 ? true : row.serve === 2 ? false : null,
      win_probability_p1: numeric(row.win_probability_p1), danger: numeric(row.danger),
    })
    previous = row
  }
  return points
}
function modern(row: Row, detail?: Row, summary = false): Match {
  // The season snapshot is the canonical result; a cached detail may predate a correction.
  const source = row
  const games = gamesFromScore(source.score?.games)
  const year = Number(String(source.scheduled_time || source.created_at || '').slice(0, 4)) || 2026
  return {
    match_id: `live-${row.id}`, tournament: tournamentName(row.tournament || ''), surface: surface(row.surface),
    category: ['Australian Open','Roland Garros','Wimbledon','US Open'].includes(tournamentName(row.tournament||'')) ? 'Grand Slam' : modernTournamentCategory(row.tier), year,
    player1: player(1, row.players?.p1?.name, null), player2: player(2, row.players?.p2?.name, null),
    score_summary: { sets: source.score?.sets || [], games, points: source.score?.points || [], server: source.score?.server ?? null, is_tiebreak: !!source.score?.is_tiebreak, win_probability_p1: source.score?.win_probability_p1 ?? null, timestamp: source.scheduled_time || `${year}-01-01T00:00:00Z` },
    final_score: games.map(([a, b], i) => { const end = detail?.tape?.find((p: Row) => Array.isArray(p.tiebreak_final) && gamesFromScore(p.games)[i]?.[0] === a && gamesFromScore(p.games)[i]?.[1] === b && gamesFromScore(p.games).length === i + 1); return `${a}–${b}${end && Math.max(a,b) === 7 && Math.min(a,b) === 6 ? `(${Math.min(...end.tiebreak_final)})` : ''}` }).join(' '), round: roundName(row.round_code || ''), winner: row.winner === 1 || row.winner === 2 ? row.winner : null,
    status: row.outcome === 'completed' ? 'Finished' : row.outcome === 'retired' ? 'Retired' : row.outcome || row.status || 'Finished',
    point_tape: summary ? [] : tapePoints(detail), statistics: summary ? [] : modernStats(detail),
    raw_fixture: summary ? undefined : detail || row, raw_point_tape: summary ? undefined : detail?.tape,
    data_source: 'api', coverage: summary ? 'Solo resultado' : detail?.tape?.length ? 'Puntos documentados' : detail ? 'Estadísticas disponibles' : 'Solo resultado',
    context: { date: row.scheduled_time || null, dateLabel: 'Fecha del partido', rank1: numeric(row.players?.p1?.ranking), rank2: numeric(row.players?.p2?.ranking), rankLabel: 'Ranking en la descarga', age1: null, age2: null, minutes: null, format: row.format || null, indoor: row.indoor ?? null },
  }
}
function historical(row: Row, detail?: Row, summary = false): Match {
  const games = archiveGames(row.score || '')
  const year = Number(String(row.event_date || '').slice(0, 4)) || 0
  return {
    match_id: `archive-${row.id}`, tournament: tournamentName(row.tournament || ''), surface: surface(row.surface), category: historicalTournamentCategory(row.level, year), year,
    player1: player(1, row.winner?.name, row.winner?.seed), player2: player(2, row.loser?.name, row.loser?.seed),
    score_summary: { sets: [games.filter(([a,b])=>a>b).length, games.filter(([a,b])=>b>a).length], games, points: [], server: null, is_tiebreak: false, win_probability_p1: null, timestamp: row.event_date ? `${row.event_date}T00:00:00Z` : `${year}-01-01T00:00:00Z` },
    final_score: row.score?.replace(/(\d)-(\d)/g, '$1–$2') || scoreFromGames(games), round: roundName(row.round || ''), winner: 1, status: row.outcome === 'completed' ? 'Finished' : row.outcome || 'Finished',
    point_tape: [], statistics: summary ? [] : archiveStats(detail), raw_fixture: summary ? undefined : detail || row,
    data_source: 'api', coverage: 'Sin puntos',
    context: { date: row.event_date || null, dateLabel: 'Inicio del torneo', rank1: numeric(row.winner?.rank), rank2: numeric(row.loser?.rank), rankLabel: 'Ranking al jugar', age1: numeric(row.winner?.age), age2: numeric(row.loser?.age), minutes: numeric(row.minutes), format: row.best_of ? `Al mejor de ${row.best_of} sets` : null, indoor: null },
  }
}
async function readSavedDetail(kind: 'modern' | 'archive', id: string): Promise<Row | undefined> {
  const file = join(detailsDir, `${kind}-${id}.json.gz`)
  const remote=(await cloudDetails())[`${kind}-${id}`]
  return remote || (existsSync(file) ? readZip(file) : undefined)
}
const pendingDetails = new Map<string, Promise<Row | undefined>>()
function readDetail(kind: 'modern' | 'archive', id: string): Promise<Row | undefined> {
  const key = `${kind}-${id}`
  const existing = pendingDetails.get(key)
  if (existing) return existing
  const promise = readDetailOnce(kind, id).finally(() => pendingDetails.delete(key))
  pendingDetails.set(key, promise)
  return promise
}
async function readDetailOnce(kind: 'modern' | 'archive', id: string): Promise<Row | undefined> {
  // Page navigation reads saved data only. The scheduled sync enriches missing details.
  return readSavedDetail(kind,id)
}
const archiveCache = new Map<string, { expires: number; value: Promise<Match[]> }>()
export function invalidateArchiveCache() { archiveCache.clear(); filesPromise = undefined }
function cachedArchive(key: string, load: () => Promise<Match[]>) {
  const entry = archiveCache.get(key)
  if (entry && entry.expires > Date.now()) return entry.value
  const value = load().catch(error => { archiveCache.delete(key); throw error })
  archiveCache.set(key, { expires: Date.now() + 300_000, value })
  return value
}
export function archiveMatches(year?: number, summary = false): Promise<Match[]> {
  return cachedArchive(`list:${year || 'all'}:${summary}`, () => readArchiveMatches(year, summary))
}
async function readArchiveMatches(year?: number, summary = false): Promise<Match[]> {
  const modernYears = year ? (year >= 2023 ? [year] : []) : Array.from({ length: Math.max(0, new Date().getFullYear() - 2022) }, (_, i) => 2023 + i)
  const archiveYears = year ? (year < 2023 ? [year] : []) : Array.from({ length: 55 }, (_, i) => 1968 + i)
  const tasks = modernYears.map(async y => {
    const rows = (await rowsFor(`modern-${y}-`)).filter(row => row.is_qualifying !== true)
    return Promise.all(rows.map(async row => modern(row, summary ? undefined : await readSavedDetail('modern', String(row.id)), summary)))
  })
  const levels = existsSync(join(listsDir, 'archive-A.complete.json')) ? ['G', 'M', 'A'] : ['G', 'M']
  for (const y of archiveYears) for (const level of levels) tasks.push((async () => {
    const source = await rowsFor(`archive-${y}-${level}-`)
    const rows = (level === 'A' ? dedupeArchiveTourRows(source) : source).filter(row => !/^Q[1-4]$/.test(row.round || ''))
    return Promise.all(rows.map(async row => historical(row, summary ? undefined : await readSavedDetail('archive', String(row.id)), summary)))
  })())
  return mergeEditionReferences((await Promise.all(tasks)).flat(),year)
}
/** Reads only detail files already stored locally; never calls the provider. */
export function archiveDetailedMatches(year?: number): Promise<Match[]> {
  return cachedArchive(`detail:${year || 'all'}`, () => readArchiveDetailedMatches(year))
}
async function readArchiveDetailedMatches(year?: number): Promise<Match[]> {
  const years = year ? (year >= 2023 ? [year] : []) : Array.from({ length: Math.max(0, new Date().getFullYear() - 2022) }, (_, i) => 2023 + i)
  const results: Match[] = []
  const remote = await cloudDetails()
  for (const y of years) {
    const rows = (await rowsFor(`modern-${y}-`)).filter(row => row.is_qualifying !== true && (existsSync(join(detailsDir, `modern-${row.id}.json.gz`)) || remote[`modern-${row.id}`]))
    for (const match of await Promise.all(rows.map(async row => modern(row, await readSavedDetail('modern', String(row.id)))))) results.push(match)
  }
  const archiveYears = year ? (year < 2023 ? [year] : []) : Array.from({ length: 55 }, (_, i) => 1968 + i)
  const levels = existsSync(join(listsDir, 'archive-A.complete.json')) ? ['G', 'M', 'A'] : ['G', 'M']
  for (const y of archiveYears) for (const level of levels) {
    const source = await rowsFor(`archive-${y}-${level}-`)
    const rows = (level === 'A' ? dedupeArchiveTourRows(source) : source).filter(row => !/^Q[1-4]$/.test(row.round || '') && (existsSync(join(detailsDir, `archive-${row.id}.json.gz`)) || remote[`archive-${row.id}`]))
    for (const match of await Promise.all(rows.map(async row => historical(row, await readSavedDetail('archive', String(row.id)))))) results.push(match)
  }
  return results
}
let indexPromise: Promise<Record<string, string>> | undefined
async function matchIndex(): Promise<Record<string, string>> {
  if (!indexPromise) indexPromise = readZip(join(archive, 'index.json.gz')).catch(() => ({}))
  return indexPromise
}
export async function archiveMatch(id: string): Promise<Match | undefined> {
  const reference=editionReferenceMatches.find(m=>m.match_id===id);if(reference)return reference
  const matchId = id.match(/^(live|archive)-(\d+)$/)
  if (!matchId) return undefined
  const kind = matchId[1] === 'live' ? 'modern' : 'archive'
  const indexedFile = (await matchIndex())[id]
  if (kind === 'modern') {
    const indexedYear = indexedFile ? Number(indexedFile.split('-')[1]) : undefined
    const years = indexedYear ? [indexedYear] : Array.from({length: Math.max(0, new Date().getUTCFullYear()-2022)}, (_,i)=>new Date().getUTCFullYear()-i)
    for (const year of years) {
      const current = await cloudRead(`season-${year}`)
      const row = current?.data?.find((item: Row) => String(item.id) === matchId[2])
      if (row) return modern(row, await readDetail(kind, matchId[2]))
    }
  }
  const files = indexedFile ? [indexedFile] : await listFiles(`${kind}-`)
  for (const file of files) {
    const page = await readZip(join(listsDir, file))
    const row = page.data?.find((item: Row) => String(item.id) === matchId[2])
    if (row) {
      const detail = await readDetail(kind, matchId[2])
      return kind === 'modern' ? modern(row, detail) : historical(row, detail)
    }
  }
  return undefined
}
export function hasArchive() { return existsSync(listsDir) }

/** One season at a time, without retaining the raw archive in navigation caches. */
export async function publicationArchive():Promise<Match[]> {
  const years=[...Array.from({length:Math.max(0,new Date().getUTCFullYear()-2022)},(_,i)=>2023+i),...Array.from({length:55},(_,i)=>1968+i)]
  const result:Match[]=[]
  for(const year of years){
    const [summaries,details]=await Promise.all([readArchiveMatches(year,true),readArchiveDetailedMatches(year)])
    const byId=new Map(details.map(prepareMatch).filter(eligibleMatch).map(m=>[m.match_id,m]))
    for(const row of summaries){const m=prepareMatch(row);if(eligibleMatch(m))result.push(byId.get(m.match_id)||m)}
  }
  return result
}

export function hasBundledDetail(kind: 'modern' | 'archive', id: string) { return existsSync(join(detailsDir, `${kind}-${id}.json.gz`)) }

/** Candidate metadata from saved list pages only. This never requests API data. */
export async function bundledEnrichmentCandidates(): Promise<import('./enrichment-plan').DetailCandidate[]> {
 const candidates:import('./enrichment-plan').DetailCandidate[]=[]
 for(const file of await listFiles('')) {
  if(!/^(modern|archive)-\d{4}-/.test(file))continue
  const kind=file.startsWith('modern-')?'modern':'archive'
  const year=Number(file.split('-')[1])
  if(kind==='archive'&&year<1991)continue
  const page=await readZip(join(listsDir,file))
  for(const row of page.data||[]){
   if(kind==='modern'&&(row.is_qualifying===true||row.outcome!=='completed'||!(row.tape?.rows||row.tape?.reconstructed_rows)))continue
   if(kind==='archive'&&/^Q[1-4]$/.test(row.round||''))continue
   const id=String(row.id)
   if(!hasBundledDetail(kind,id))candidates.push({kind,id,year,round:String(row.round_code||row.round||'')})
  }
 }
 return candidates
}

/** Terminal draw entries are visible in editions but never enter statistical rankings. */
export async function competitionEntries():Promise<Match[]> {
 const entries:Match[]=[];
 for(let year=1968;year<=new Date().getUTCFullYear();year++)for(const match of await readArchiveMatches(year,true))if(isCompetitionOnly(match))entries.push(prepareCompetitionMatch(match));
 return entries;
}

export async function editionSourceAudit(){const {auditEditions}=await import('./edition-audit');const result=[];for(let year=1968;year<=new Date().getUTCFullYear();year++)result.push(...auditEditions(await readArchiveMatches(year,true)));return result.sort((a,b)=>b.year-a.year||b.pending-a.pending||a.tournament.localeCompare(b.tournament,'es'));}
