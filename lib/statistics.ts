import type { MatchStat } from './types'

type ProviderStatistic = {
  player_key?: string | number | null
  stat_period?: string | null
  stat_type?: string | null
  stat_name?: string | null
  stat_value?: string | number | null
  stat_won?: string | number | null
  stat_total?: string | number | null
}
export function normalizeStatistics(raw: unknown, firstKey: unknown, secondKey: unknown): MatchStat[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: ProviderStatistic) => ({
    player: firstKey != null && String(item.player_key) === String(firstKey) ? 1 : secondKey != null && String(item.player_key) === String(secondKey) ? 2 : null,
    period: String(item.stat_period || 'match'),
    category: String(item.stat_type || 'Otras'),
    name: String(item.stat_name || 'Dato sin nombre'),
    value: item.stat_value == null ? '—' : String(item.stat_value),
    won: item.stat_won == null || Number.isNaN(Number(item.stat_won)) ? null : Number(item.stat_won),
    total: item.stat_total == null || Number.isNaN(Number(item.stat_total)) ? null : Number(item.stat_total),
  }))
}
const names: Record<string, string> = {
  Aces: 'Saques directos', 'Double Faults': 'Dobles faltas', '1st serve in': 'Primeros saques dentro',
  '1st serve points won': 'Puntos ganados con primer saque', '2nd serve points won': 'Puntos ganados con segundo saque',
  'Service points won': 'Puntos ganados al saque', 'Break points saved': 'Bolas de break salvadas',
  'Return points won': 'Puntos ganados al resto', 'Break points converted': 'Bolas de break convertidas',
  'Total points won': 'Puntos ganados', 'Short rallies won': 'Intercambios cortos ganados',
  'Medium rallies won': 'Intercambios medios ganados', 'Long rallies won': 'Intercambios largos ganados',
  'Winners': 'Golpes ganadores', 'Unforced Errors': 'Errores no forzados',
  '1st Serve Percentage': 'Primeros saques dentro', '1st Serve Points Won': 'Puntos con primer saque',
  '2nd Serve Points Won': 'Puntos con segundo saque', 'Break Points Won': 'Bolas de break convertidas',
  'Total Points Won': 'Puntos ganados', 'Service Games Won': 'Juegos ganados al saque',
  'Return Games Won': 'Juegos ganados al resto', 'Net Points Won': 'Puntos ganados en la red',
  '1st return points won': 'Puntos al resto ante primer saque', '2nd return points won': 'Puntos al resto ante segundo saque',
  'Second serves in': 'Segundos saques dentro', 'Games won': 'Juegos ganados',
  'Consecutive games won': 'Máxima racha de juegos', 'Consecutive points won': 'Máxima racha de puntos',
  'Tie breaks won': 'Tie breaks ganados', 'Service games played': 'Juegos al saque jugados',
  'Return games played': 'Juegos al resto jugados', 'Service points played': 'Puntos al saque jugados',
  'Return points played': 'Puntos al resto jugados', 'Hold percentage': 'Porcentaje de juegos al saque ganados',
  'Break percentage': 'Porcentaje de juegos al resto ganados', 'Break points faced': 'Bolas de break afrontadas', 'Break points played': 'Bolas de break al resto',
  'Return games won': 'Juegos ganados al resto',
  'Points played': 'Puntos disputados',
}
const categories: Record<string, string> = { Service: 'Saques', Return: 'Resto', Points: 'Puntos', Breaks: 'Breaks', 'Otras': 'Otras estadísticas' }
export function statLabel(name: string) { return names[name] || Object.entries(names).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] || name }
export function categoryLabel(name: string) { return categories[name] || name }
export function periodLabel(period: string) {
  if (period.toLowerCase() === 'match') return 'Todo el partido'
  const set = period.match(/(?:set|partido)\s*(\d+)/i)
  return set ? `Set ${set[1]}` : period
}
export type StatRow = { key: string; name: string; first?: MatchStat; second?: MatchStat; unassigned?: MatchStat }
export type StatGroup = { key: string; period: string; category: string; rows: StatRow[] }
export function groupStatistics(stats: MatchStat[]): StatGroup[] {
  const groups = new Map<string, StatGroup>()
  for (const stat of stats) {
    const key = `${stat.period}|${stat.category}`
    let group = groups.get(key)
    if (!group) { group = { key, period: stat.period, category: stat.category, rows: [] }; groups.set(key, group) }
    const slot = stat.player === 1 ? 'first' : stat.player === 2 ? 'second' : 'unassigned'
    let row = group.rows.find(r => r.name === stat.name && !r[slot])
    if (!row) { row = { key: `${key}|${stat.name}|${group.rows.length}`, name: stat.name }; group.rows.push(row) }
    row[slot] = stat
  }
  const order = ['Service', 'Return', 'Points', 'Breaks']
  return [...groups.values()].sort((a, b) => (a.period === 'match' ? 0 : 1) - (b.period === 'match' ? 0 : 1) || (order.indexOf(a.category) < 0 ? 99 : order.indexOf(a.category)) - (order.indexOf(b.category) < 0 ? 99 : order.indexOf(b.category)))
}
export function findStat(stats: MatchStat[], player: 1 | 2, name: string) { return stats.find(s => s.player === player && s.name.toLowerCase() === name.toLowerCase() && s.period === 'match') }
