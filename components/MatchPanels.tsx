'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

type Panel = 'resumen' | 'puntos' | 'cifras'
const labels: Record<Panel, string> = { resumen: 'Resumen', puntos: 'Puntos', cifras: 'Cifras' }
const order: Panel[] = ['resumen', 'puntos', 'cifras']

export default function MatchPanels({ overview, dna, stats, points }: { overview: ReactNode; dna?: ReactNode; stats?: ReactNode; points?: ReactNode }) {
  const hasDna=Boolean(dna),hasStats=Boolean(stats)
  const available = useMemo(()=>order.filter(key => key === 'resumen' || (key === 'puntos' && hasDna) || (key === 'cifras' && hasStats)),[hasDna,hasStats])
  const [selected, setSelected] = useState<Panel>('resumen')

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1)
      const target = ['analisis','estadisticas'].includes(hash) ? 'cifras' : hash === 'mapa' ? 'puntos' : hash === 'compartir' ? 'resumen' : hash
      if (available.includes(target as Panel)) setSelected(target as Panel)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [available])

  function select(key: Panel) {
    setSelected(key)
    history.replaceState(null, '', `#${key}`)
  }

  function keyboard(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : null
    if (next === null) return
    event.preventDefault()
    const target = available[(next + available.length) % available.length]
    select(target)
    document.getElementById(`tab-${target}`)?.focus()
  }

  const content = { resumen: overview, cifras: stats, puntos: <>{dna}{points && <details className="match-disclosure"><summary>Consultar cada punto</summary>{points}</details>}</> }
  return <div className="match-workspace">
    {available.length > 1 && <div className="match-tabs" role="tablist" aria-label="Explorar el partido">
      {available.map((key, index) => <button id={`tab-${key}`} type="button" role="tab" aria-controls={`panel-${key}`} aria-selected={selected === key} tabIndex={selected === key ? 0 : -1} key={key} onClick={() => select(key)} onKeyDown={event => keyboard(event, index)}>{labels[key]}</button>)}
    </div>}
    {available.map(key => <section id={`panel-${key}`} role={available.length > 1 ? "tabpanel" : "region"} aria-label={available.length === 1 ? labels[key] : undefined} aria-labelledby={available.length > 1 ? `tab-${key}` : undefined} hidden={selected !== key} key={key} className="match-panel">{selected === key ? content[key] : null}</section>)}
  </div>
}
