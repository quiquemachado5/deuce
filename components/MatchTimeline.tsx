'use client'
import { useMemo, useState } from 'react'
import type { Point } from '@/lib/types'
import { keyMoments } from '@/lib/analytics/drama'

function describe(point: Point, player1: string, player2: string) {
  const name = point.winner === 1 ? player1 : point.winner === 2 ? player2 : 'Un jugador'
  if (point.is_match_point && point.match_point_for === point.winner) return `${name} ganó un punto de partido.`
  if (point.is_break_point && point.break_converted) return `${name} convirtió una bola de break${point.first_serve_in === false ? ' ante un segundo saque' : ''}.`
  if (point.is_break_point) return `${name} ganó una bola de break.`
  if (point.is_ace) return `${name} conectó un saque directo.`
  if (point.is_double_fault) return `Doble falta. El punto fue para ${name}.`
  return `${name} ganó el punto ${point.point_number}.`
}
export default function MatchTimeline({ points, player1, player2 }: { points: Point[]; player1: string; player2: string }) {
  const tape = useMemo(() => [...points].sort((a, b) => a.point_number - b.point_number), [points])
  const [index, setIndex] = useState(0)
  const moments = useMemo(() => keyMoments(tape), [tape])
  if (!tape.length) return null
  const point = tape[Math.min(index, tape.length - 1)]
  const probability = typeof point.win_probability_p1 === 'number' ? `${Math.round(point.win_probability_p1 * 100)}%` : null
  return <section className="timeline" aria-labelledby="timeline-title"><div className="timeline-heading"><div><h3 id="timeline-title">Recorre el partido</h3><p>Arrastra la barra o usa las flechas del teclado para avanzar punto a punto.</p></div><strong>{index + 1} / {tape.length}</strong></div>
    <div className="timeline-track" aria-hidden="true">{tape.map((entry, position) => <i key={entry.point_number} className={`${entry.is_break_point ? 'break' : entry.winner === entry.server ? 'serve' : 'return'} ${position <= index ? 'passed' : ''}`} />)}</div>
    <label className="sr-only" htmlFor="match-timeline-range">Punto del partido</label><input id="match-timeline-range" className="timeline-range" type="range" min="0" max={tape.length - 1} value={index} onChange={event => setIndex(Number(event.target.value))} aria-valuetext={`Punto ${point.point_number}, set ${point.set}, juego ${point.game}`} />
    <div className="timeline-current" aria-live="polite"><div><span>Set {point.set} · juego {point.game} · punto {point.point_number}</span><h4>{describe(point, player1, player2)}</h4><small>{point.score_before ? <>Antes del punto: <strong>{point.score_before}</strong> · </> : null}Después: <strong>{point.game_ended || point.score === '0-0' ? 'Juego terminado' : point.score}</strong></small></div>{probability && <div className="timeline-probability"><strong>{probability}</strong><span>probabilidad de {player1}</span></div>}</div>
    {moments.length > 0 && <div className="timeline-moments"><strong>Momentos de mayor cambio</strong><div>{moments.map(moment => <button type="button" key={moment.point.point_number} onClick={() => setIndex(tape.findIndex(entry => entry.point_number === moment.point.point_number))}>Punto {moment.point.point_number} <span>±{moment.change} pp</span></button>)}</div><small>Cambios entre estimaciones consecutivas del proveedor; indican movimiento del modelo, no su causa.</small></div>}
  </section>
}
