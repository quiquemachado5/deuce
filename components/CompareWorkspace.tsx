'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeftRight, Search } from 'lucide-react'
import Shell from './Shell'
import { gameProgress } from '@/lib/point-integrity'
import MatchFlow from './MatchFlow'
import type { Match } from '@/lib/types'
import { tournamentName } from '@/lib/labels'

const currentYear = new Date().getFullYear()

function Picker({ side, selected, onPick, axisMax, axisRange }: { axisRange:number; axisMax:number; side: string; selected: Match | null; onPick: (match: Match | null) => void }) {
  const [year, setYear] = useState(selected?.year || currentYear)
  const [query, setQuery] = useState('')
  const [list, setList] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (selected || query.trim().length<2) return
    let active = true
    fetch(`/api/matches?view=summary&year=${year}&q=${encodeURIComponent(query)}&limit=7`)
      .then(response => { if (!response.ok) throw new Error('No se pudo cargar la temporada'); return response.json() })
      .then(data => { if (active) { setList(data.matches || []); setError(false) } })
      .catch(() => { if (active) { setList([]); setError(true) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [year, query, selected])
  const options = query.trim().length < 2 ? [] : list
  async function choose(id: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/matches/${encodeURIComponent(id)}`)
      if (!response.ok) throw new Error('Partido no disponible')
      const data = await response.json()
      onPick(data.match)
      setQuery('')
      setError(false)
    } catch { setError(true) } finally { setLoading(false) }
  }
  const tape=selected?.point_tape || []
  const breakData=tape.some(p=>typeof p.is_break_point==='boolean')
  const matchPointData=tape.some(p=>typeof p.is_match_point==='boolean')
  const available=[
    ...(breakData ? [{key:'breaks',label:'Bolas de break',value:tape.filter(p=>p.is_break_point).length},{key:'converted',label:'Breaks convertidos',value:tape.filter(p=>p.is_break_point&&p.break_converted===true).length}] : []),
    ...(matchPointData ? [{key:'match-points',label:'Bolas de partido',value:tape.filter(p=>p.is_match_point).length}] : []),
  ]
  return <div className="compare-picker"><div className="compare-picker-top"><strong>{side}</strong>{selected && <button type="button" onClick={() => onPick(null)}>Cambiar partido</button>}</div>
    {selected ? <><div className="compare-selected"><span>{tournamentName(selected.tournament)} · {selected.year}</span><h2>{selected.player1.name}<small className="versus"> contra </small>{selected.player2.name}</h2><strong className="compare-score">{selected.final_score}</strong></div>{!selected.point_tape.length && <p>Este partido solo tiene marcador o estadísticas agregadas; no se representa un ADN.</p>}<MatchFlow match={selected} axisMax={axisMax} axisRange={axisRange}/>{selected.quality?.tape==='partial'&&<p>Secuencia incompleta. Se conservan solo los juegos con todos sus puntos.</p>}<div className="compare-metrics">{available.map(metric=><div key={metric.key}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>{available.length>0&&<p className="compare-help">Bolas de break de este partido. Una misma situación puede repetirse dentro del juego.</p>}<Link className="compare-full-link" href={`/match/${selected.match_id}`}>Abrir el partido <ArrowRight size={16} /></Link></> : <><label className="compare-year">Temporada <select value={year} onChange={event => { setLoading(true); setYear(Number(event.target.value)); setQuery('') }}>{Array.from({ length: currentYear - 1967 }, (_, index) => currentYear - index).map(value => <option value={value} key={value}>{value}</option>)}</select></label><label className="compare-search"><Search size={19} /><span className="sr-only">Buscar partido {side.toLowerCase()}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Jugador o torneo" /></label>{loading ? <p className="compare-help">Cargando partidos…</p> : error ? <p className="compare-help">No se pudo cargar. Prueba otra temporada.</p> : query.trim().length < 2 ? <p className="compare-help">Escribe al menos dos letras para encontrar un partido.</p> : options.length ? <div className="compare-options">{options.map(match => <button type="button" key={match.match_id} onClick={() => choose(match.match_id)}><span>{match.player1.name} · {match.player2.name}</span><small>{tournamentName(match.tournament)} · {match.final_score}</small></button>)}</div> : <p className="compare-help">Prueba con otro nombre o torneo en {year}.</p>}</>}
  </div>
}

export default function CompareWorkspace({ initialLeft, initialRight = null }: { initialLeft: Match | null; initialRight?: Match | null }) {
  const [left, setLeft] = useState<Match | null>(initialLeft)
  const [right, setRight] = useState<Match | null>(initialRight)
  const axisRange=Math.max(2,...[left,right].flatMap(m=>m?gameProgress(m).map(g=>Math.abs(g.difference)):[]))
  return <Shell surface={left?.surface || right?.surface || 'grass'} mode={process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'false' ? 'ARCHIVO REAL' : 'DEMO'}><div className="page-frame compare-page editorial-page"><header className="editorial-heading"><h1>Comparar partidos</h1><p>Elige dos encuentros que quieras contrastar. Las líneas usan el mismo eje de puntos; no representan duración.</p></header><div className="compare-grid"><Picker axisRange={axisRange} axisMax={Math.max(1,...(left?.point_tape||[]).map(p=>p.point_number),...(right?.point_tape||[]).map(p=>p.point_number))} side="Primer partido" selected={left} onPick={setLeft} /><div className="compare-vs"><ArrowLeftRight size={22} /><span>y</span></div><Picker axisRange={axisRange} axisMax={Math.max(1,...(left?.point_tape||[]).map(p=>p.point_number),...(right?.point_tape||[]).map(p=>p.point_number))} side="Segundo partido" selected={right} onPick={setRight} /></div>

  </div></Shell>
}
