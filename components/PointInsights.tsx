import { ChevronDown } from 'lucide-react'
import type { Point } from '@/lib/types'
import { pointInsights } from '@/lib/point-insights'

function PointBar({value,other}:{value:string;other:string}) {
 const own=Number(value.replace('%','').replace(',','.')),opponent=Number(other.replace('%','').replace(',','.'))
 if(!value.trim()||!Number.isFinite(own)||!Number.isFinite(opponent)||own<0||opponent<0)return null
 const width=value.includes('%')?Math.min(100,own):Math.max(own,opponent)>0?own/Math.max(own,opponent)*100:0
 return <i className="point-value-track" aria-hidden="true"><i style={{width:`${width}%`}}/></i>
}
export default function PointInsights({ points, player1, player2 }: { points: Point[]; player1: string; player2: string }) {
  const report = pointInsights(points)
  if (!report.knownPoints) return null
  const groups = report.groups.map(group => ({ ...group, rows: group.rows.filter(row => row.first.value !== 'Sin datos' && row.second.value !== 'Sin datos') })).filter(group => group.rows.length)
  const sets = report.sets.filter(set => set.total > 0)
  return <div className="point-insights">
    <p className="stats-intro">{report.knownPoints} de {report.totalPoints} puntos tienen un ganador identificado. Los cálculos siguientes utilizan solo los puntos con el dato necesario.</p>
    <div className="point-insight-groups">{groups.map((group, i) => <details key={group.title} className="stat-group" open={i === 0}><summary><span>{group.title}<small>{group.description}</small></span><span className="group-count">{group.rows.length} datos <ChevronDown size={19} /></span></summary><div className="stats-table"><div className="stats-header"><span>Medida</span><span>{player1}</span><span>{player2}</span></div>{group.rows.map(row => <div className="stats-row" key={row.label}><span>{row.label}</span><span className="insight-value"><strong>{row.first.value}</strong>{row.first.detail && <small>{row.first.detail}</small>}<PointBar value={row.first.value} other={row.second.value}/></span><span className="insight-value"><strong>{row.second.value}</strong>{row.second.detail && <small>{row.second.detail}</small>}<PointBar value={row.second.value} other={row.first.value}/></span></div>)}</div></details>)}</div>
    {sets.length > 1 && <div className="set-points"><h3>Puntos ganados por set</h3><div className="stat-table"><div className="stat-head"><span>Set</span><span>{player1}</span><span>{player2}</span></div>{sets.map(set => <div className="stat-row" key={set.set}><strong>Set {set.set}</strong><span>{set.first} de {set.total}<PointBar value={String(set.first)} other={String(set.second)}/></span><span>{set.second} de {set.total}<PointBar value={String(set.second)} other={String(set.first)}/></span></div>)}</div></div>}
    {report.longestPoint && <p className="longest-rally">El intercambio más largo registrado tuvo <strong>{report.longestPoint.rally_length} golpes</strong> en el set {report.longestPoint.set}, juego {report.longestPoint.game}.</p>}
  </div>
}
