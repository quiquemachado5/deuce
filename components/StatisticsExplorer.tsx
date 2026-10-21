import { ChevronDown } from 'lucide-react'
import type { MatchStat } from '@/lib/types'
import { categoryLabel, groupStatistics, periodLabel, statLabel } from '@/lib/statistics'

function numericValue(stat?: MatchStat) {
  if (!stat) return null
  if (stat.won !== null && stat.total !== null && stat.total > 0) return stat.won / stat.total * 100
  const parsed = Number(stat.value.replace('%', '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}
function Value({ stat, other, reverse = false }: { stat?: MatchStat; other?: MatchStat; reverse?: boolean }) {
  if (!stat) return null
  const fraction = stat.won !== null && stat.total !== null && stat.total > 0
  const value = numericValue(stat)
  const opposite = numericValue(other)
  const isRate = fraction || stat.value.includes('%')
  const width = value === null ? 0 : isRate ? value : opposite !== null && value + opposite > 0 ? value / (value + opposite) * 100 : 0
  return <span role="cell" className={`stat-value stat-compare ${reverse ? 'reverse' : ''}`}><strong>{fraction ? `${(Math.round(stat.won! / stat.total! * 1000) / 10).toLocaleString('es-ES')}%` : stat.value}</strong>{fraction && <small>{stat.won} de {stat.total}</small>}{width > 0 && <i className="stat-compare-track" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, width))}%` }} /></i>}</span>
}
export default function StatisticsExplorer({ statistics, player1, player2 }: { statistics: MatchStat[]; player1: string; player2: string }) {
  const groups = groupStatistics(statistics).map(group => ({ ...group, rows: group.rows.filter(row => row.first && row.second && row.first.value !== '' && row.second.value !== '') })).filter(group => group.rows.length)
  if (!groups.length) return null
  return <div className="statistics-explorer">
    {groups.map(group => <details className="stat-group" key={group.key}>
      <summary><span>{categoryLabel(group.category)} {group.period.toLowerCase() !== 'match' && <small>{periodLabel(group.period)}</small>}</span><span className="group-count">{group.rows.length} {group.rows.length === 1 ? 'dato' : 'datos'} <ChevronDown size={19} /></span></summary>
      <div className="stats-table" role="table" aria-label={`${categoryLabel(group.category)}: ${player1} y ${player2}`}><div className="stats-header" role="row"><span role="columnheader">Estadística</span><span role="columnheader">{player1}</span><span role="columnheader">{player2}</span></div>
        {group.rows.map(row => <div className="stats-row" role="row" key={row.key}><span role="rowheader">{statLabel(row.name)}</span><Value stat={row.first} other={row.second} /><Value stat={row.second} other={row.first} reverse />{row.unassigned && <small className="unassigned-stat">Dato sin jugador asignado: {row.unassigned.value}</small>}</div>)}
      </div>
    </details>)}
  </div>
}
