'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Maximize2, Minimize2, Play } from 'lucide-react'
import { pointHeight } from '@/lib/quality'
import type { Point, Surface } from '@/lib/types'
import { keyMoments } from '@/lib/analytics/drama'

type Mode = 'huella' | 'probabilidad' | 'presion'
export default function MatchDNA({ points, player1, player2, exportable = false }: { points: Point[]; surface: Surface; player1: string; player2: string; exportable?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('huella')
  const [expanded, setExpanded] = useState(false)
  const [selectedSet, setSelectedSet] = useState(0)
  const [breakOnly, setBreakOnly] = useState(false)
  const [replayToken, setReplayToken] = useState(0)
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.dataset.resolvedTheme === 'dark')
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-resolved-theme'] })
    queueMicrotask(sync)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!expanded) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [expanded])
  const sets = useMemo(() => [...new Set(points.map(point => point.set))].sort((a, b) => a - b), [points])
  const visiblePoints = useMemo(() => points.filter(point => (!selectedSet || point.set === selectedSet) && (!breakOnly || point.is_break_point === true)), [points, selectedSet, breakOnly])
  const hasProbability = visiblePoints.some(point => typeof point.win_probability_p1 === 'number')
  const hasBreakPoints = points.some(point => point.is_break_point === true)
  const criticalNumbers = useMemo(() => new Set(keyMoments(points).map(moment => moment.point.point_number)), [points])
  const accent = isDark ? '#8be8ab' : '#267552'
  const opponent = isDark ? '#b6c1cb' : '#687987'
  const draw = useCallback((scale = 1, target?: HTMLCanvasElement, revealCount = visiblePoints.length) => {
    const canvas = target || ref.current
    if (!canvas) return
    const width = Math.max(860, visiblePoints.length * 4)
    const height = 245
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)
    ctx.fillStyle = isDark ? '#181d1a' : '#fbfcf9'; ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = isDark ? '#3c4540' : '#e7ede8'; ctx.lineWidth = 1
    for (let y = 25; y < height; y += 48) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(width - 18, y); ctx.stroke() }
    const step = (width - 36) / Math.max(visiblePoints.length, 1)
    const barWidth = Math.min(10, Math.max(2, step * .62))
    const plotted = visiblePoints.slice(0, revealCount).map((p, i) => ({ p, x: 18 + i * step + step / 2 }))
    if (mode === 'probabilidad') {
      ctx.strokeStyle = isDark ? '#648872' : '#b9c8bf'; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(18, height / 2); ctx.lineTo(width - 18, height / 2); ctx.stroke(); ctx.setLineDash([])
      let started = false
      ctx.strokeStyle = accent; ctx.lineWidth = 3.5; ctx.beginPath()
      for (const {p, x} of plotted) {
        if (typeof p.win_probability_p1 !== 'number') { started = false; continue }
        const y = 20 + (1 - p.win_probability_p1) * (height - 40)
        if (!started) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        started = true
      }
      ctx.stroke()
      for (const {p, x} of plotted) if (typeof p.win_probability_p1 === 'number' && p.is_break_point) { ctx.beginPath(); ctx.fillStyle = accent; ctx.arc(x, 20 + (1-p.win_probability_p1)*(height-40), 4, 0, Math.PI*2); ctx.fill() }
    } else {
      plotted.forEach(({p, x}, i) => {
        const previous = p.score_before ?? (i > 0 && visiblePoints[i-1].set === p.set && visiblePoints[i-1].game === p.game && visiblePoints[i-1].point_number === p.point_number - 1 ? visiblePoints[i-1].score : '0-0')
        const pressure = p.is_break_point || p.is_match_point || ['30-30', '40-40'].includes(previous.replace(':','-'))
        if (mode === 'presion' && !pressure) { ctx.fillStyle = isDark ? '#375342' : '#d9e2dc'; ctx.fillRect(x, 94, barWidth, 56); return }
        const heightOfPoint = pointHeight(p) * 2
        ctx.fillStyle = p.is_double_fault ? '#c96b63' : p.is_break_point ? '#c6a25d' : p.winner === p.server ? accent : p.winner ? opponent : (isDark ? '#5b6b68' : '#cad3cf')
        ctx.fillRect(x, (height-heightOfPoint)/2, barWidth, heightOfPoint)
        if (p.is_ace) { ctx.fillStyle = isDark ? '#fff8db' : '#122e28'; ctx.fillRect(x, (height-heightOfPoint)/2 - 4, barWidth, 3) }
        if (pressure && mode === 'presion') { ctx.fillStyle = isDark ? '#d8f3dd' : '#172e27'; ctx.fillRect(x, (height-heightOfPoint)/2 - 6, barWidth, 3) }
      })
    }
    if (mode !== 'probabilidad' && !breakOnly) plotted.forEach(({ p, x }) => {
      if (criticalNumbers.has(p.point_number)) { ctx.fillStyle = isDark ? '#f4faf3' : '#17352b'; ctx.beginPath(); ctx.arc(x, 16, 3.5, 0, Math.PI * 2); ctx.fill() }
    })
  }, [visiblePoints, accent, opponent, mode, breakOnly, criticalNumbers, isDark])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || visiblePoints.length > 500) { draw(); return }
    let frame = 0
    let start: number | null = null
    const duration = Math.min(1300, 420 + visiblePoints.length * 7)
    draw(1, undefined, 0)
    function step(timestamp: number) {
      if (start === null) start = timestamp
      const progress = Math.min(1, (timestamp - start) / duration)
      draw(1, undefined, Math.ceil(progress * visiblePoints.length))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [draw, visiblePoints.length, replayToken])
  function download() { const canvas = document.createElement('canvas'); draw(3, canvas); const link = document.createElement('a'); link.download = `deuce-${mode}.png`; link.href = canvas.toDataURL('image/png'); link.click() }
  return <div className={`point-map${expanded ? ' is-fullscreen' : ''}`} style={{ '--accent': accent } as React.CSSProperties}>
    <div className="map-toolbar"><div className="map-modes" aria-label="Vista del mapa"><button type="button" aria-pressed={mode === 'huella'} onClick={() => setMode('huella')}>Puntos</button>{hasProbability && <button type="button" aria-pressed={mode === 'probabilidad'} onClick={() => setMode('probabilidad')}>Probabilidad</button>}<button type="button" aria-pressed={mode === 'presion'} onClick={() => setMode('presion')}>Presión</button></div><div className="map-toolbar-actions"><button className="map-download" type="button" onClick={() => setReplayToken(value => value + 1)}><Play size={16} /> Reproducir</button><button className="map-download" type="button" aria-label={expanded ? 'Cerrar pantalla completa' : 'Ver ADN a pantalla completa'} aria-pressed={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<span className="map-action-label">{expanded ? 'Salir' : 'Pantalla completa'}</span></button>{exportable && <button className="map-download" type="button" onClick={download}><Download size={16} /> Descargar mapa</button>}</div></div>
    <div className="map-filters"><label>Ver set <select value={selectedSet} onChange={event => { setSelectedSet(Number(event.target.value)); setMode('huella') }}><option value={0}>Partido completo</option>{sets.map(set => <option key={set} value={set}>Set {set}</option>)}</select></label>{hasBreakPoints && <label className="map-check"><input type="checkbox" checked={breakOnly} onChange={event => { setBreakOnly(event.target.checked); setMode('huella') }} /> Solo bolas de break</label>}<span aria-live="polite">{visiblePoints.length} {visiblePoints.length === 1 ? 'punto visible' : 'puntos visibles'}</span></div>
    <div className="point-map-scroll"><canvas ref={ref} style={visiblePoints.length < 50 ? { minWidth: '100%' } : undefined} role="img" aria-label={`Mapa visual de ${visiblePoints.length} puntos entre ${player1} y ${player2}. Vista: ${mode}.${criticalNumbers.size ? ' Los marcadores superiores señalan los mayores cambios de probabilidad.' : ''}`} /></div><span className="sr-only" role="status">Huella disponible: {visiblePoints.length} puntos, vista {mode}. Los controles permiten filtrar por set{hasBreakPoints ? ' y bolas de break' : ''}.</span>
    <div className="map-key">{mode === 'probabilidad' ? <span>La línea muestra la probabilidad estimada de victoria de {player1}.</span> : <><span><i className="key-one" />Saque ganado</span><span><i className="key-two" />Resto ganado</span><span><i className="key-important" />Bola de break</span>{mode === 'presion' && <span>También se destacan 30-30, iguales y bolas de partido.</span>}</>}</div>
  </div>
}
