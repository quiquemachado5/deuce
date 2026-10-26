'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Surface } from '@/lib/types'
const navigation = [['/buscar','Partidos'],['/jugadores','Jugadores'],['/torneos','Torneos'],['/jugadores?tipo=enfrentamientos','Enfrentamientos'],['/records','Cifras'],['/epicos','Marcadores ajustados'],['/comparar','Comparar']] as const
export default function Shell({children}:{children:React.ReactNode;mode?:string;surface?:Surface}) {
 const path=usePathname(),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null)
 const [scrolled,setScrolled]=useState(false)
 useEffect(()=>{
  const scroll=()=>setScrolled(window.scrollY>8)
  scroll();window.addEventListener('scroll',scroll,{passive:true})
  return()=>{window.removeEventListener('scroll',scroll)}
 },[])
 function close(){dialog.current?.close()}
 const edition=path.startsWith('/torneos/')||path.startsWith('/torneo/')||/^\/[^/]+\/\d{4}$/.test(path)
 const active=(href:string)=>href==='/buscar'?path==='/'||path==='/buscar'||path.startsWith('/match/'):href==='/torneos'?edition:path===href||path.startsWith(`${href}/`)
 return <div className="site-shell"><a className="skip-link" href="#main-content">Saltar al contenido</a><header className={`deuce-header${scrolled?' scrolled':''}`}><div className="deuce-header-inner"><Link href="/" className="deuce-logo" aria-label="DEUCE, inicio">DEUCE</Link><nav className="deuce-nav" aria-label="Navegación principal">{navigation.slice(0,5).map(([href,label])=><Link prefetch={true} key={href} href={href} aria-current={active(href)?'page':undefined}>{label}</Link>)}<details className="header-explore"><summary>Explorar</summary><div>{navigation.slice(5).map(([href,label])=><Link key={href} href={href} aria-current={active(href)?'page':undefined}>{label}</Link>)}</div></details></nav><Link className="header-search" href="/buscar" aria-label="Buscar un partido"><Search size={19}/></Link><div className="mobile-header-actions"><Link href="/buscar" aria-label="Buscar un partido"><Search size={19}/></Link><button ref={trigger} className="deuce-menu" type="button" aria-label="Abrir menú" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}><Menu size={20}/></button></div></div></header>
 <dialog ref={dialog} className="navigation-sheet" aria-label="Navegación" onClose={()=>trigger.current?.focus()} onClick={event=>{if(event.target===event.currentTarget)close()}}><div className="sheet-top"><span>DEUCE</span><button type="button" aria-label="Cerrar menú" onClick={close}><X size={22}/></button></div><nav>{navigation.map(([href,label])=><Link prefetch={true} key={href} href={href} onClick={close} aria-current={active(href)?'page':undefined}>{label}</Link>)}</nav><p>La historia del tenis. Partido a partido.</p></dialog>
 <main id="main-content">{children}</main><footer className="quiet-footer"><nav aria-label="Enlaces del pie"><Link href="/info">Cómo funciona</Link><Link href="/credits">Fotografías</Link></nav><span>© {new Date().getFullYear()} DEUCE</span></footer></div>
}
