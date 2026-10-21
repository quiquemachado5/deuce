'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Bookmark, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import Shell from '@/components/Shell'
import { MATCH_TYPES } from '@/lib/match-presentation'
import { roundLabel as spanishRound } from '@/lib/editorial'
import { TOURNAMENTS, type Match, type Surface } from '@/lib/types'
import type { RepositoryQuery } from '@/lib/repository-query'
import { tournamentName } from '@/lib/labels'
import { courtPhoto } from '@/lib/imagery'
import { playerPhoto } from '@/lib/player-imagery'

const currentYear = new Date().getFullYear()
const surfaceLabel: Record<Surface, string> = { grass: 'Hierba', clay: 'Tierra batida', hard: 'Pista dura' }
type SavedView = { id: string; name: string; year: number; slug: string; surface: Surface | 'all'; query: string; fiveSets: boolean; round?: string }
export type Reading = { href: string; title: string; subtitle: string; image?: string; alt: string; kind: string; facts?: string[] }

export default function Repository({ initialMatches, initialTotal, initialQuery, readings, indexOnly = false, embedded = false }: { initialMatches: Match[]; initialTotal: number; initialQuery: RepositoryQuery; readings: Reading[]; indexOnly?: boolean; embedded?:boolean }) {
  const firstRequest=useRef(true)
  const [year, setYear] = useState(initialQuery.year)
  const [slug, setSlug] = useState(initialQuery.slug)
  const [surface, setSurface] = useState<Surface | 'all'>(initialQuery.surface as Surface | 'all')
  const [query, setQuery] = useState(initialQuery.query || initialQuery.player)
  const [kind,setKind] = useState(initialQuery.kind || '')
  const [round, setRound] = useState(initialQuery.round)
  const [fiveSets, setFiveSets] = useState(initialQuery.fiveSets)
  const [exploring, setExploring] = useState(true)
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [viewName, setViewName] = useState('')
  const [ready, setReady] = useState(false)
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [mode, setMode] = useState(process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'false' ? 'ARCHIVO REAL' : 'DEMO')
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(initialQuery.page)
  const [total, setTotal] = useState(initialTotal)
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      try {
        const views = JSON.parse(localStorage.getItem('deuce-views-v1') || '[]')
        if (Array.isArray(views)) setSavedViews(views.filter(view => view?.id && view?.name).slice(0, 12))
      } catch { /* A damaged local preference should not block browsing. */ }
      setReady(true)
    })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (ready) { try { localStorage.setItem('deuce-filters-v1', JSON.stringify({ year, slug, surface, query, fiveSets, exploring })) } catch { /* Private browsing may deny storage. */ } }
  }, [ready, year, slug, surface, query, fiveSets, exploring])
  useEffect(() => {
    if (!ready || !exploring) return
    if (embedded && !query && !year && slug==='all' && surface==='all' && !round && !kind && !fiveSets) return
    if (firstRequest.current) {
      firstRequest.current=false
      if(query===(initialQuery.query||initialQuery.player) && year===initialQuery.year && slug===initialQuery.slug && surface===initialQuery.surface && round===initialQuery.round && kind===initialQuery.kind && fiveSets===initialQuery.fiveSets && page===initialQuery.page && retry===0)return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams({ view: 'summary', page: String(page), limit: '25', q: query, round, kind, surface, fiveSets: String(fiveSets) })
      if (year) params.set('year', String(year))
      if (slug !== 'all') params.set('tournament', slug)
      const share = new URLSearchParams(params); share.delete('view'); share.delete('limit')
      const path = (window.location.pathname.startsWith('/torneo/') || /^\/[^/]+\/\d{4}$/.test(window.location.pathname)) && (slug !== initialQuery.slug || year !== initialQuery.year) ? '/partidos' : window.location.pathname
      for (const [key,value] of [...share]) if (!value || value === 'all' || value === 'false' || (key === 'page' && value === '1')) share.delete(key)
      window.history.replaceState(null, '', `${path}${share.size ? `?${share}` : ''}`)
      fetch(`/api/matches?${params}`, { signal: controller.signal })
        .then(response => { if (!response.ok) throw new Error('Archive unavailable'); return response.json() })
        .then(data => { setMatches(data.matches || []); setTotal(data.total || 0); setMode(data.mode || 'DEMO'); setError(false) })
        .catch(error => { if (error.name !== 'AbortError') { setError(true) } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 180)
    return () => { clearTimeout(timer); controller.abort() }
  }, [ready, exploring, year, slug, query, surface, fiveSets, page, retry, round, kind, initialQuery, embedded])

  const filtered = matches
  const pages = Math.max(1, Math.ceil(total / 25))
  const activePage = Math.min(page, pages)
  const hasFilters = year !== 0 || slug !== 'all' || surface !== 'all' || query || round || kind || fiveSets
  const coverPhoto = courtPhoto('Wimbledon')
  const showResults = indexOnly || Boolean(hasFilters)

  function clear() { setYear(0); setSlug('all'); setSurface('all'); setQuery(''); setFiveSets(false); setRound(''); setKind(''); setExploring(true); setPage(1); setLoading(true) }
  function saveView() {
    const name = viewName.trim(); if (!name) return
    const next = [{ id: String(Date.now()), name, year, slug, surface, query, fiveSets, round }, ...savedViews].slice(0, 12)
    setSavedViews(next); try { localStorage.setItem('deuce-views-v1', JSON.stringify(next)) } catch { /* Storage is optional. */ } setViewName('')
  }
  function applyView(view: SavedView) { setYear(view.year); setSlug(view.slug); setSurface(view.surface); setQuery(view.query); setFiveSets(view.fiveSets); setRound(view.round || ''); setExploring(true); setPage(1); setLoading(true) }
  function removeView(id: string) { const next = savedViews.filter(view => view.id !== id); setSavedViews(next); try { localStorage.setItem('deuce-views-v1', JSON.stringify(next)) } catch { /* Storage is optional. */ } }

  const content = <div className="new-home">
    {!indexOnly && !embedded && <section className="quiet-hero" aria-labelledby="front-title">
      {coverPhoto && <Image src={coverPhoto.src} alt={coverPhoto.alt} fill sizes="100vw" priority />}
      <div className="quiet-hero-content"><h1 id="front-title">El partido termina.<br/>La historia sigue.</h1><a href="#partidos" className="quiet-hero-cta">Buscar un partido <ArrowRight size={18}/></a></div>
    </section>}
    <div className="page-frame">
    <section id="partidos" className="front-search quiet-search" aria-labelledby="search-title"><div className="block-heading">{indexOnly && !embedded ? <h1 id="search-title">{initialQuery.slug !== 'all' ? tournamentName(TOURNAMENTS.find(t => t.slug === initialQuery.slug)!.name) : 'Partidos'}{initialQuery.year ? ` · ${initialQuery.year}` : ''}</h1> : <h2 id="search-title">Encuentra un partido</h2>}</div>
      <datalist id="repository-suggestions">{['Carlos Alcaraz','Novak Djokovic','Rafael Nadal','Roger Federer','Jannik Sinner',...TOURNAMENTS.map(t=>tournamentName(t.name))].map(name=><option value={name} key={name}/>)}</datalist><form action="/partidos" className="search-controls" onSubmit={event=>event.preventDefault()}><label className="search-input"><Search size={19} aria-hidden="true" /><span className="sr-only">Buscar jugador, torneo o ronda</span><input aria-label="Buscar jugador, torneo o ronda" value={query} onChange={event => { setQuery(event.target.value); setRound(''); setExploring(true); setPage(1) }} placeholder="Jugador, torneo o ronda" list="repository-suggestions" name="q" />{query && <button type="button" aria-label="Borrar búsqueda" onClick={() => { setQuery(''); setPage(1) }}><X size={17} /></button>}</label><details className="spotlight-filters"><summary><SlidersHorizontal size={18}/><span>Filtrar</span></summary><div className="spotlight-filter-fields"><label className="search-select"><span>Año</span><select aria-label="Año" name="year" value={year} onChange={event => { setYear(Number(event.target.value)); setExploring(true); setPage(1); setLoading(true) }}><option value={0}>Todos los años</option><optgroup label="Años recientes">{Array.from({length:5},(_,i)=>currentYear-i).map(value=><option key={value} value={value}>{value}</option>)}</optgroup><optgroup label="Archivo histórico">{Array.from({length:currentYear-1972},(_,i)=>currentYear-5-i).map(value=><option key={value} value={value}>{value}</option>)}</optgroup></select><ChevronDown size={15} aria-hidden="true" /></label><label className="search-select"><span>Torneo</span><select aria-label="Torneo" name="tournament" value={slug} onChange={event => { setSlug(event.target.value); setSurface('all'); setExploring(true); setPage(1); setLoading(true) }}><option value="all">Todos</option><optgroup label="Grand Slams">{TOURNAMENTS.filter(t => t.category === 'Grand Slam').map(t => <option key={t.slug} value={t.slug}>{tournamentName(t.name)}</option>)}</optgroup><optgroup label="Masters 1000">{TOURNAMENTS.filter(t => t.category === 'Masters 1000').map(t => <option key={t.slug} value={t.slug}>{tournamentName(t.name)}</option>)}</optgroup></select><ChevronDown size={15} aria-hidden="true" /></label><label className="search-select"><span>Ronda</span><select name="round" value={round} onChange={e=>{setRound(e.target.value);setPage(1)}}><option value="">Todas</option><option value="Final">Final</option><option value="Semifinal">Semifinal</option><option value="Quarterfinal">Cuartos</option><option value="Round of 16">Octavos</option></select></label><label className="search-select"><span>Tipo de partido</span><select name="kind" value={kind} onChange={e=>{setKind(e.target.value);setPage(1)}}><option value="">Todos</option>{MATCH_TYPES.map(type=><option key={type}>{type}</option>)}</select></label><div className="court-options" aria-label="Superficie">{([['all', 'Todas'], ['hard', 'Dura'], ['clay', 'Tierra'], ['grass', 'Hierba']] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={surface === key} onClick={() => { setSurface(key); setExploring(true); setPage(1); if (slug !== 'all') { setSlug('all'); setLoading(true) } }}>{label}</button>)}</div><button type="button" role="switch" aria-checked={fiveSets} className="five-set-toggle" onClick={() => { setFiveSets(!fiveSets); setExploring(true); setPage(1) }}>Solo 5 sets</button></div></details><noscript><button type="submit">Buscar</button></noscript></form><div className="search-refine-actions">{hasFilters && <details className="save-search"><summary><Bookmark size={15} /> Guardar en este navegador</summary><form onSubmit={event => { event.preventDefault(); saveView() }}><label className="sr-only" htmlFor="view-name">Nombre de la búsqueda</label><input id="view-name" value={viewName} onChange={event => setViewName(event.target.value)} placeholder="Nombre de esta búsqueda" maxLength={40} /><button disabled={!viewName.trim()}>Guardar</button></form></details>}{hasFilters && <button type="button" onClick={clear}>Limpiar</button>}</div>
      {savedViews.length > 0 && <details className="saved-searches-disclosure"><summary>Búsquedas guardadas en este navegador</summary><div className="saved-views" aria-label="Búsquedas guardadas">{savedViews.map(view => <span key={view.id}><button type="button" onClick={() => applyView(view)}>{view.name}</button><button type="button" aria-label={`Eliminar ${view.name}`} onClick={() => removeView(view.id)}><X size={13} /></button></span>)}</div></details>}
      {error && <div className="search-message" role="alert">No se pudo actualizar la búsqueda. Los últimos resultados se conservan. <button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>}
      {showResults && loading && <p role="status">Actualizando resultados…</p>}
      {showResults && (filtered.length === 0 ? <div className="search-message">No hay resultados{query ? ` para «${query}»` : ''}{year ? ` en ${year}` : ''}{surface!=='all' ? ` en ${surfaceLabel[surface].toLowerCase()}` : ''}{round ? ` · ${spanishRound(round)}` : ''}. <button type="button" onClick={clear}>Limpiar los filtros</button></div> : <><div className="results-head"><strong>{round ? `${round} · ` : ''}{total.toLocaleString('es-ES')} {total === 1 ? 'partido' : 'partidos'}</strong><span>Mostrando {Math.min(25, filtered.length)} por página</span></div><div className="new-results" aria-busy={loading}>{filtered.map(match => { const first = playerPhoto(match.player1.name), second = playerPhoto(match.player2.name); return <Link href={`/match/${match.match_id}`} className="result-row" key={match.match_id}><span className={`result-surface ${match.surface}`} aria-hidden="true" /><span className="result-event">{tournamentName(match.tournament)} <i>·</i> {match.year}<small>{spanishRound(match.round)} · {surfaceLabel[match.surface]}</small></span><span className="result-players"><span className="result-portraits">{[first, second].map((photo, index) => <span key={index}>{photo ? <Image src={photo.thumbnail || photo.src} alt="" fill sizes="36px" unoptimized /> : <b>{(index ? match.player2.name : match.player1.name).slice(0, 1)}</b>}</span>)}</span><strong><span>{match.player1.name}</span> <i className="versus"> contra </i> <span>{match.player2.name}</span></strong></span><span className="result-score" aria-label={`Resultado: ${match.final_score}`}>{match.final_score.split(/\s+/).map((set,index)=><span className="inline-set" key={index}>{set.split(/[–-]/).map((value,side)=><b key={side} className={match.score_summary.games[index]?.[side]>match.score_summary.games[index]?.[1-side]?'set-won':undefined}>{side>0&&<em>–</em>}{value}</b>)}</span>)}</span>{match.editorial_highlight&&<p className="result-story">{match.editorial_highlight}</p>}<ArrowRight size={19} className="result-arrow" aria-hidden="true" /></Link> })}</div>{pages > 1 && <div className="results-pages"><button type="button" disabled={activePage === 1} onClick={() => { setPage(activePage - 1); document.getElementById('partidos')?.scrollIntoView({ behavior: 'smooth' }) }}>Anterior</button><span>Página {activePage} de {pages.toLocaleString('es-ES')}</span><button type="button" disabled={activePage === pages} onClick={() => { setPage(activePage + 1); document.getElementById('partidos')?.scrollIntoView({ behavior: 'smooth' }) }}>Siguiente <ArrowRight size={16} /></button><button type="button" disabled={activePage===pages} onClick={()=>setPage(pages)}>Última</button></div>}<p className="archive-criteria">Finalizados y con marcador validado. No incluye abandonos ni resultados en revisión.</p></>)}
    </section>


    {!indexOnly && !embedded && readings.length>0 && <><section className="quiet-reading" aria-labelledby="reading-title"><h2 id="reading-title">Seguir leyendo</h2><div className="reading-stories">{readings.map(item => <Link href={item.href} key={item.href}><div className="reading-image">{item.image && <Image src={item.image} alt={item.alt} fill sizes="(max-width: 734px) 100vw, 540px" unoptimized />}</div><span>{item.kind}</span><h3>{item.title}</h3><p>{item.subtitle}</p>{item.facts&&<ul className="reading-split">{item.facts.map(fact=><li key={fact}>{fact}</li>)}</ul>}</Link>)}</div></section>
    </>}
  </div></div>
  return embedded ? content : <Shell mode={mode}>{content}</Shell>
}
