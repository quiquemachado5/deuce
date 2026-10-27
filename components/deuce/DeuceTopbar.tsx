'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';

const navigation = [['Partidos','/buscar'],['Récords','/records'],['Jugadores','/jugadores'],['Torneos','/torneos'],['Comparar','/comparar']] as const;
type Result = { href: string; name: string; detail?: string; group: string };

export function DeuceTopbar() {
  const pathname=usePathname(), router=useRouter();
  const [scrolled,setScrolled]=useState(false), [navHidden,setNavHidden]=useState(false), [menu,setMenu]=useState(false), [searchOpen,setSearchOpen]=useState(false), [query,setQuery]=useState('');
  const [result,setResult]=useState<{query:string;items:Result[];error?:boolean}>({query:'',items:[]});
  const lastScroll=useRef(0);
  const menuTrigger=useRef<HTMLButtonElement>(null), field=useRef<HTMLInputElement>(null), trigger=useRef<HTMLButtonElement>(null);
  const closeSearch=()=>{setSearchOpen(false);trigger.current?.focus();};
  const openSearch=()=>{setMenu(false);setNavHidden(false);setSearchOpen(true);window.requestAnimationFrame(()=>field.current?.focus());};

  useEffect(()=>{
    const scroll=()=>{
      const next=Math.max(0,window.scrollY);
      setScrolled(next>24);
      if(next<=72)setNavHidden(false);
      else if(Math.abs(next-lastScroll.current)>7)setNavHidden(next>lastScroll.current);
      lastScroll.current=next;
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        if(menuTrigger.current?.getAttribute('aria-expanded')==='true')menuTrigger.current.focus();
        setMenu(false);
        setSearchOpen(false);
      }
    };
    const navigate=()=>{setMenu(false);setSearchOpen(false);};
    const frame=requestAnimationFrame(scroll);
    document.addEventListener('deuce:navigate',navigate);
    window.addEventListener('scroll',scroll,{passive:true});
    document.addEventListener('keydown',key);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('deuce:navigate',navigate);window.removeEventListener('scroll',scroll);document.removeEventListener('keydown',key);};
  },[]);

  useEffect(()=>{
    const text=query.trim();
    if(!text)return;
    const abort=new AbortController();
    const timer=setTimeout(async()=>{try{const response=await fetch(`/api/search?q=${encodeURIComponent(text)}`,{signal:abort.signal});if(!response.ok)throw Error('search');const data=await response.json();setResult({query:text,items:Array.isArray(data.items)?data.items.slice(0,18):[]});}catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setResult({query:text,items:[],error:true});}},160);
    return()=>{clearTimeout(timer);abort.abort();};
  },[query]);

  const submit=()=>{
    const text=query.trim();
    if(!text)return;
    setSearchOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(text)}`);
  };
  const loading=!!query.trim()&&result.query!==query.trim();
  const groups=[...new Set(result.items.map(item=>item.group))];

  return <>
    <header className={`topbar${scrolled?' is-scrolled':''}${navHidden&&!menu&&!searchOpen?' nav-hidden':''}${searchOpen?' search-open':''}`}>
      <Link className="logo" href="/" aria-label="DEUCE, inicio" onClick={()=>{setMenu(false);setSearchOpen(false);}}><span aria-hidden="true"/>DEUCE</Link>
      {!searchOpen&&<nav id="deuce-navigation" className={menu?'mobile-open':''} aria-label="Principal">{navigation.map(([label,href])=>{const active=href==='/buscar'?pathname==='/buscar'||pathname.startsWith('/match/'):href==='/jugadores'?pathname.startsWith('/jugadores')||pathname.startsWith('/players/')||pathname.startsWith('/rivalries/'):href==='/torneos'?pathname.startsWith('/torneos')||/^\/[a-z0-9-]+\/\d{4}$/.test(pathname):href==='/comparar'?pathname==='/comparar'||pathname==='/compare':pathname===href||pathname.startsWith(`${href}/`);return <Link prefetch={true} className={active?'active':''} aria-current={active?'page':undefined} href={href} key={href} onClick={()=>setMenu(false)}>{label}</Link>;})}</nav>}
      {searchOpen?<form className="topbar-spotlight-form" role="search" onSubmit={event=>{event.preventDefault();submit();}}>
        <Search size={19} aria-hidden="true"/>
        <label className="nc-sr" htmlFor="global-search">Buscar en DEUCE</label>
        <input ref={field} id="global-search" type="search" name="q" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Jugador, torneo o partido" autoComplete="off"/>
        {query&&<button className="topbar-search-clear" type="button" onClick={()=>{setQuery('');field.current?.focus();}} aria-label="Borrar búsqueda"><X size={16} aria-hidden="true"/></button>}
        <button className="topbar-spotlight-submit" type="submit" aria-label="Ver todos los resultados"><ArrowRight size={18} aria-hidden="true"/></button>
        <button className="topbar-search-close" type="button" onClick={closeSearch} aria-label="Cerrar búsqueda"><X size={18} aria-hidden="true"/></button>
      </form>:<button ref={trigger} className="search-trigger" type="button" onClick={openSearch} aria-label="Buscar en DEUCE" aria-expanded={searchOpen}><Search size={18} aria-hidden="true"/><span>Buscar</span></button>}
      {!searchOpen&&<button ref={menuTrigger} className="menu" type="button" aria-expanded={menu} aria-controls="deuce-navigation" onClick={()=>{setNavHidden(false);setMenu(value=>!value)}}>{menu?'Cerrar':'Menú'}</button>}
    </header>
    {searchOpen&&<section className="topbar-spotlight-panel" aria-label="Sugerencias de búsqueda" aria-live="polite" aria-busy={loading}>
      {!query.trim()?<div className="topbar-spotlight-empty"><span>Búsqueda rápida</span><p>Escribe un jugador, un torneo o una edición del archivo.</p><div>{navigation.slice(0,4).map(([label,href])=><Link key={href} href={href} onClick={()=>setSearchOpen(false)}>{label}</Link>)}</div></div>
      :loading?<p className="topbar-spotlight-status">Buscando…</p>
      :result.error?<p className="topbar-spotlight-status">No se pudieron cargar las sugerencias. Pulsa Intro para buscar.</p>
      :result.items.length?<div className="topbar-spotlight-groups">{groups.map(group=><section key={group} aria-label={group}><h2>{group}</h2>{result.items.filter(item=>item.group===group).slice(0,6).map(item=><Link href={item.href} key={item.href} onClick={()=>setSearchOpen(false)}><span><strong>{item.name}</strong>{item.detail&&<small>{item.detail}</small>}</span><ArrowRight size={15} aria-hidden="true"/></Link>)}</section>)}</div>
      :<p className="topbar-spotlight-status">No hay sugerencias para «{query}». Pulsa Intro para buscar en todo el archivo.</p>}
    </section>}
  </>;
}
