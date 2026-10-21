import type { AdvancedReport, PlayerPair, Rate } from '@/lib/analytics/engine'

type Props = { report: AdvancedReport; player1: string; player2: string }
function Metric({ title, explanation, values, names }: { title: string; explanation: string; values: PlayerPair<Rate>; names: [string, string] }) {
  if (values.first.percent === null || values.second.percent === null) return null
  const rows: [string, Rate][] = [[names[0], values.first], [names[1], values.second]]
  return <article className="advanced-metric"><div className="advanced-metric-copy"><h3>{title}</h3><p>{explanation}</p></div><div className="advanced-bars">{rows.map(([name, rate], i) => <div className="advanced-bar-row" key={name}><div><span>{name}</span><strong>{rate.percent}%</strong></div><span className="advanced-bar-track"><i style={{ width: `${rate.percent}%` }} data-player={i + 1} /></span><small>{rate.won} de {rate.total} puntos</small></div>)}</div></article>
}
export default function AdvancedInsights({ report, player1, player2 }: Props) {
  const names: [string, string] = [player1, player2]
  const lever = report.pressure.thirtyAll
  const hasLever = lever.first.conversion !== null && lever.second.conversion !== null
  const metrics = [report.pressure.firstServeMisses, report.pressure.breakAgainstSecondServe, report.rallies.firstStrike, report.rallies.afterLongRally]
  if (!metrics.some(metric => metric.first.percent !== null && metric.second.percent !== null) && !hasLever && !report.pivot) return null
  return <div className="advanced-insights"><div className="advanced-intro"><strong>Lo que pasó detrás del marcador</strong><p>Cada porcentaje se calcula solo con puntos registrados y muestra su muestra.</p></div><div className="advanced-grid">
    <Metric title="Primer saque bajo presión" explanation="Fallos de primer servicio en bolas de break, 30-30 o iguales." values={report.pressure.firstServeMisses} names={names} />
    <Metric title="Break ante segundo saque" explanation="Bolas de break convertidas tras un primer servicio fallado." values={report.pressure.breakAgainstSecondServe} names={names} />
    {hasLever && <article className="advanced-metric"><div className="advanced-metric-copy"><h3>El punto del 30-30</h3><p>Juegos ganados después de ganar el punto del 30-30.</p></div><div className="advanced-bars">{[[names[0], lever.first], [names[1], lever.second]].map(([name, row]) => { const value = row as typeof lever.first; return <div className="advanced-bar-row" key={name as string}><div><span>{name as string}</span><strong>{value.conversion}%</strong></div><span className="advanced-bar-track"><i style={{ width: `${value.conversion}%` }} /></span><small>{value.gamesWonAfterLever} de {value.leverWon} juegos</small></div> })}</div></article>}
    <Metric title="Dominio en puntos cortos" explanation="Puntos ganados en intercambios de 1 a 4 golpes." values={report.rallies.firstStrike} names={names} />
    <Metric title="Después de un rally largo" explanation="Rendimiento en el punto posterior a un intercambio de más de 10 golpes." values={report.rallies.afterLongRally} names={names} />
    {report.pivot && <article className="advanced-metric pivot-metric"><div className="advanced-metric-copy"><h3>El mayor giro</h3><p>Mayor cambio entre dos estimaciones consecutivas de victoria.</p></div><strong className="pivot-number">{report.pivot.changePoints} <span>puntos porcentuales</span></strong><p>Set {report.pivot.set} · juego {report.pivot.game} · punto {report.pivot.pointNumber}</p></article>}
  </div></div>
}
