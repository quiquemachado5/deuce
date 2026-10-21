'use client'

import { useMemo, useState } from 'react'
import type { Point } from '@/lib/types'

export default function PointTapeExplorer({ points, player1, player2 }: { points: Point[]; player1: string; player2: string }) {
  const sets = [...new Set(points.map(point => point.set))].sort((a, b) => a - b)
  const [set, setSet] = useState(0)
  const [page, setPage] = useState(0)
  const filtered = useMemo(() => points.filter(point => point.winner && (!set || point.set === set)), [points, set])
  const size = 20
  const pages = Math.ceil(filtered.length / size)
  return <div className="point-tape-explorer">
    <div className="tape-controls"><div className="tape-set-filters"><button type="button" aria-pressed={set === 0} onClick={() => { setSet(0); setPage(0) }}>Todos</button>{sets.map(value => <button type="button" aria-pressed={set === value} onClick={() => { setSet(value); setPage(0) }} key={value}>Set {value}</button>)}</div><span>{filtered.length} puntos</span></div>
    <ol className="tape-list">{filtered.slice(page * size, (page + 1) * size).map(point => <li key={point.point_number}><span className="tape-number">{String(point.point_number).padStart(3, '0')}</span><span className="tape-context">Set {point.set} · Juego {point.game}</span><strong title={point.score_before ? `Antes del punto: ${point.score_before}` : undefined}>{point.game_ended || point.score === '0-0' ? 'Juego' : point.score.replace(/-/g,'–')}</strong><span className="tape-winner">{point.winner === 1 ? player1 : player2}</span>{point.is_match_point?<em>Bola de partido</em>:point.is_break_point&&<em>Bola de break</em>}</li>)}</ol>
    {pages > 1 && <div className="tape-pagination"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><span>{page + 1} / {pages}</span><button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
  </div>
}
