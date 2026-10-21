import type { Match } from '@/lib/types'
import { matchStat, statFraction, statNumber } from '@/lib/archive-insights'

function measured(match: Match, side: 1 | 2, name: string) {
  const fraction = statFraction(match, side, name)
  if (fraction) return { value: fraction[0] / fraction[1] * 100, label: `${(fraction[0] / fraction[1] * 100).toLocaleString('es-ES',{maximumFractionDigits:1})}%`, sample: `${fraction[0]} de ${fraction[1]}`, rate: true }
  const count = statNumber(matchStat(match, side, name))
  return count === null ? null : { value: count, label: count.toLocaleString('es-ES'), sample: '', rate: false }
}

export default function MatchKeyFigures({ match }: { match: Match }) {
  const rows = [
    ['Break points converted', 'Bolas de break convertidas'],
    ['Break points saved', 'Bolas de break salvadas'],
    ['Total points won', 'Puntos ganados'],
    ['Aces', 'Saques directos'],
    ['2nd serve points won', 'Puntos con segundo saque'],
  ].flatMap(([name,label])=>{
    const first=measured(match,1,name),second=measured(match,2,name)
    return first&&second&&first.rate===second.rate ? [{name,label,first,second}] : []
  }).slice(0,3)
  if (!rows.length) return null
  return <section className="match-key-figures"><h2>Dónde estuvo la diferencia.</h2>
    <div role="table" aria-label="Cifras destacadas del partido">
      <div role="row" className="figure-comparison-head"><span role="columnheader">Dato</span><span role="columnheader">{match.player1.name}</span><span role="columnheader">{match.player2.name}</span></div>
      {rows.map(row=><div className="figure-comparison-row" role="row" key={row.name}>
        <span role="rowheader">{row.label}</span>
        {[row.first,row.second].map((value,index)=><span role="cell" className={`comparison-side side-${index+1}`} key={index}>
          <strong>{value.label}</strong>{value.sample&&<small>{value.sample}</small>}
          <i aria-hidden="true"><i style={{width:`${value.rate?value.value:(Math.max(row.first.value,row.second.value)>0?value.value/Math.max(row.first.value,row.second.value)*100:0)}%`}}/></i>
        </span>)}
      </div>)}
    </div>
  </section>
}
