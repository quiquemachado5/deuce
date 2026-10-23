import { MATCH_TYPES, matchType } from './match-presentation'
import { roundLabel } from './editorial'
import { TOURNAMENTS, type Match } from './types'
import { tournamentName } from './labels'
import { normalizeText } from './quality'
import { tournamentDirectory } from './tournament-directory'
import { verifiedTournamentCategory } from './tournament-tier'

export function parseRepositoryQuery(params: URLSearchParams) {
  const allowed = ['q','search','player','round','year','tournament','category','surface','fiveSets','view','page','limit','kind']
  for (const key of params.keys()) { if (!allowed.includes(key)) throw new Error(`Filtro no reconocido: ${key}`); if (params.getAll(key).length > 1) throw new Error(`Filtro repetido: ${key}`) }
  if (params.has('q') && params.has('search') && params.get('q') !== params.get('search')) throw new Error('Usa q o search para la búsqueda, no valores distintos en ambos')
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const raw = params.get(key); if (!raw || raw === 'all') return fallback
    const value = Number(raw); if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${key}: valor no válido`)
    return value
  }
  const year = integer('year', 0, 1968, new Date().getUTCFullYear())
  const token = normalizeText(params.get('tournament') || '').replace(/\s+/g, '-')
  if (token && token !== 'all' && !/^[a-z0-9-]{2,100}$/.test(token)) throw new Error('Torneo no válido')
  const tournament = token && token !== 'all' ? TOURNAMENTS.find(t => [t.slug, normalizeText(t.name).replace(/\s+/g, '-'), normalizeText(tournamentName(t.name)).replace(/\s+/g, '-')].includes(token)) : undefined
  const surface = params.get('surface') || 'all'
  if (!['all','hard','clay','grass','carpet','unknown'].includes(surface)) throw new Error('Superficie no válida')
  const category = params.get('category') || 'all'
  if (!['all','Grand Slam','Masters 1000','Precursores de Masters','ATP 500','ATP 250','ATP Tour · nivel no especificado'].includes(category)) throw new Error('Categoría no válida')
  if (params.has('fiveSets') && !['true','false'].includes(params.get('fiveSets')!)) throw new Error('fiveSets debe ser true o false')
  if (params.has('view') && params.get('view') !== 'summary') throw new Error('La vista pública es summary')
  const kind = params.get('kind') || ''
  if (kind && !MATCH_TYPES.some(t=>t===kind)) throw new Error('Tipo de partido no válido')
  return { kind, year, slug: tournament?.slug || (token && token !== 'all' ? token : 'all'), category, surface, fiveSets: params.get('fiveSets') === 'true',
    query: (params.get('q') || params.get('search') || '').slice(0,180), player: (params.get('player') || '').slice(0,100), round: params.get('round') || '',
    page: integer('page',1,1,100000), limit: integer('limit',25,1,50) }
}
export type RepositoryQuery = ReturnType<typeof parseRepositoryQuery>
export function selectRepository(matches: Match[], query: RepositoryQuery) {
  const requestedTournament = query.slug === 'all' ? undefined : tournamentDirectory(matches).find(t =>
    [t.slug, normalizeText(t.name).replace(/\s+/g, '-'), normalizeText(tournamentName(t.name)).replace(/\s+/g, '-')].includes(query.slug))
  const requestedName = requestedTournament?.name || TOURNAMENTS.find(t => t.slug === query.slug)?.name
  if (query.slug !== 'all' && !requestedName) throw new RangeError('Torneo no válido')
  const terms = normalizeText(query.query).split(/\s+/).filter(Boolean)
  const roundAliases: Record<string,string> = { f:'final', sf:'semifinal', qf:'quarterfinal', 'cuartos de final':'quarterfinal', r16:'octavos de final' }
  const round = roundAliases[normalizeText(query.round)] || normalizeText(query.round)
  const filtered = matches.filter(m => (!query.kind || matchType(m)===query.kind) && (!query.year || m.year === query.year) && (!requestedName || requestedName === m.tournament) &&
    (query.category === 'all' || query.category === verifiedTournamentCategory(m.category,m.tournament,m.year)) &&
    (query.surface === 'all' || query.surface === m.surface) && (!query.fiveSets || m.score_summary.games.length === 5) &&
    (!query.player || normalizeText(`${m.player1.name} ${m.player2.name}`).includes(normalizeText(query.player))) && (!round || (normalizeText(m.round) === round || normalizeText(roundLabel(m.round)) === normalizeText(roundLabel(query.round)))) &&
    terms.every(t => normalizeText(`${m.player1.name} ${m.player2.name} ${m.tournament} ${tournamentName(m.tournament)} ${m.year} ${m.round === 'Quarterfinal' ? 'Cuartos de final' : m.round}`).includes(t)))
    .sort((a,b) => b.score_summary.timestamp.localeCompare(a.score_summary.timestamp) || a.match_id.localeCompare(b.match_id))
  return { matches: filtered.slice((query.page-1)*query.limit,query.page*query.limit), total: filtered.length, page: query.page, limit: query.limit }
}
