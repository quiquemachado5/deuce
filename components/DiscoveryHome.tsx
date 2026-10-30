import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Shell from './Shell'
import Repository from './Repository'
import { getMatch } from '@/lib/data'
import { editorialArchive } from '@/lib/editorial-data'
import { buildSeasonAnalytics, leaders, rankingMetrics } from '@/lib/season-analytics'
import { comparisonHref, rivalryDirectory } from '@/lib/explore'
import { matchStory } from '@/lib/editorial'
import { parseRepositoryQuery, selectRepository } from '@/lib/repository-query'
import { courtPhoto } from '@/lib/imagery'
import { tournamentName } from '@/lib/labels'
import { TOURNAMENTS } from '@/lib/types'

export default async function DiscoveryHome() {
  const [matches, featured] = await Promise.all([editorialArchive(), getMatch('archive-148401')])
  const filters=parseRepositoryQuery(new URLSearchParams())
  const results=selectRepository(matches,filters)
  const metric=rankingMetrics.find(m=>m.key==='thirty-all-games')!
  const pressure=leaders(buildSeasonAnalytics(matches).players.filter(p=>(p.extra.thirtyAllTotal||0)>=50),metric,1)[0]
  const timed=matches.filter(m=>(m.context?.minutes||0)>0).sort((a,b)=>b.context!.minutes!-a.context!.minutes!)
  const longest=timed[0], rivalry=rivalryDirectory(matches)[0]
  const ties = featured?.final_score.split(/\s+/).map(set => set.match(/\((\d+)\)/)?.[1]) || []
  return <Shell><div className="product-home">
    <section className="product-intro"><h1>El partido termina.<br/>La historia sigue.</h1><p>Resultados, estadísticas y secuencias de puntos documentadas de Grand Slams, Masters y sus precursores.</p>
      <Repository embedded initialMatches={results.matches.map(m=>({...m,editorial_highlight:matchStory(m).headline,point_tape:[],statistics:[]}))} initialTotal={results.total} initialQuery={filters} readings={[]}/>
    </section>
    <figure className="product-panorama"><Image src="/images/editorial/wimbledon-2008-recreation.webp" alt="Recreación con IA de Nadal y Federer jugando en hierba, inspirada en Wimbledon 2008" fill priority sizes="100vw"/><Link className="recreation-label" href="/credits#recreaciones">Recreación IA</Link></figure>
    {featured && <section className="product-feature page-frame" aria-label="Partido destacado"><div><h2>Wimbledon · 2008</h2><p>Final</p></div>
      <table aria-label="Resultado de la final de Wimbledon 2008"><thead><tr><th><span className="sr-only">Jugador</span></th>{featured.score_summary.games.map((_,i)=><th scope="col" key={i}>Set {i+1}</th>)}</tr></thead><tbody>{[featured.player1,featured.player2].map((player,index)=><tr key={player.name}><th scope="row">{player.name}{featured.winner===index+1&&<span className="sr-only">, ganador</span>}</th>{featured.score_summary.games.map((set,i)=><td key={i} className={set[index]>set[1-index]?'set-won':undefined}><span className={ties[i]?'tie-set':undefined}>{ties[i]?`${set[index]}–${set[1-index]}(${ties[i]})`:set[index]}</span></td>)}</tr>)}</tbody></table>
      <Link prefetch={true} href={`/match/${featured.match_id}`} className="text-action">Ver partido <ArrowRight size={17}/></Link>
    </section>}
    <div className="page-frame"><section className="product-discoveries"><header className="section-heading"><h2>Tres historias del archivo</h2><Link href="/patterns">Todas las cifras <ArrowRight size={17}/></Link></header><div className="discovery-ledger">
      {pressure&&<article><p className="discovery-category">Después del 30–30</p><h3>{pressure.player.name}</h3><strong className="discovery-value">{pressure.value}%<span className="sample-inline">{metric.detail(pressure.player)}</span></strong><p>Juegos ganados tras ganar el punto del 30–30. En portada, mínimo de 50 juegos documentados por jugador.</p><Link href="/patterns?metric=thirty-all-games">Ver la cifra <ArrowRight size={16}/></Link></article>}
      {longest&&<article><p className="discovery-category">El partido más largo documentado</p><h3>{longest.player1.name}<span className="versus"> contra </span>{longest.player2.name}</h3><strong className="discovery-value">{longest.context!.minutes}<small> min</small></strong><p>{tournamentName(longest.tournament)} · {longest.year}. Entre {timed.length.toLocaleString('es-ES')} partidos con duración publicada.</p><Link href={`/match/${longest.match_id}`}>Leer el partido <ArrowRight size={16}/></Link></article>}
      {rivalry&&<article><p className="discovery-category">Una rivalidad</p><h3>{rivalry.names[0]}<span className="versus"> contra </span>{rivalry.names[1]}</h3><strong className="discovery-value">{rivalry.wins.join('–')}</strong><p>En Grand Slams, Masters y precursores de este archivo; no el cara a cara completo.</p><Link href={comparisonHref(rivalry.names[0],rivalry.names[1])}>Comparar el cruce <ArrowRight size={16}/></Link></article>}
    </div></section>
    <section className="tournament-gallery"><header className="section-heading"><h2>Los grandes escenarios</h2><Link href="/torneos">Todos los torneos <ArrowRight size={17}/></Link></header><div>{TOURNAMENTS.filter(t=>t.category==='Grand Slam').map(t=>{const photo=courtPhoto(t.name);return <Link href={`/torneos/${t.slug}`} key={t.slug}><figure>{photo&&<Image src={photo.src} alt={photo.alt} fill sizes="(max-width:760px) 78vw, 25vw"/>}</figure><h3>{tournamentName(t.name)}</h3><span>Explorar ediciones <ArrowRight size={15}/></span></Link>})}</div></section></div>
  </div></Shell>
}
