'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Menu, Search, X } from 'lucide-react';

const navigation = [['Partidos','/buscar'],['Récords','/records'],['Jugadores','/jugadores'],['Torneos','/torneos'],['Comparar','/comparar']] as const;
type Result = { href: string; name: string; detail?: string; group: string };
type SearchContext = { groups: string[] | null; label: string; hint: string; placeholder: string; submitPath?: string };

function searchContext(pathname:string):SearchContext {
  if(pathname==='/buscar'||pathname.startsWith('/match/'))return {groups:['Partidos'],label:'partidos',placeholder:'Jugador, torneo, ronda o año',hint:'Busca un partido por jugador, torneo, ronda o temporada.',submitPath:'/buscar'};
  if(pathname.startsWith('/jugadores')||pathname.startsWith('/players/')||pathname.startsWith('/rivalries/'))return {groups:['Jugadores','Parejas'],label:'jugadores',placeholder:'Nombre del jugador',hint:'Busca un jugador o un enfrentamiento del archivo.',submitPath:'/jugadores'};
  if(pathname.startsWith('/torneos')||/^\/[a-z0-9-]+\/\d{4}$/.test(pathname))return {groups:['Torneos','Ediciones'],label:'torneos',placeholder:'Torneo o edición',hint:'Busca un torneo o una edición concreta.'};
  if(pathname.startsWith('/records'))return {groups:['Récords'],label:'récords',placeholder:'Récord o estadística',hint:'Busca una estadística del archivo.',submitPath:'/records'};
  if(pathname.startsWith('/comparar')||pathname.startsWith('/compare'))return {groups:['Jugadores','Parejas'],label:'jugadores',placeholder:'Jugador o enfrentamiento',hint:'Busca jugadores o enfrentamientos para comparar.'};
  return {groups:null,label:'DEUCE',placeholder:'Jugador, torneo o partido',hint:'Busca un jugador, un torneo, una edición o un partido.'};
}

export function DeuceTopbar() {
  const pathname=usePathname(), router=useRouter();
  const [scrolled,setScrolled]=useState(false), [navHidden,setNavHidden]=useState(false), [menu,setMenu]=useState(false), [searchOpen,setSearchOpen]=useState(false), [query,setQuery]=useState('');
  const [result,setResult]=useState<{query:string;items:Result[];error?:boolean}>({query:'',items:[]});
  const lastScroll=useRef(0);
  const restoreSearchFocus=useRef(false);
  const menuTrigger=useRef<HTMLButtonElement>(null), field=useRef<HTMLInputElement>(null), trigger=useRef<HTMLButtonElement>(null);
  const closeSearch=()=>{restoreSearchFocus.current=true;setSearchOpen(false);};
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
        if(searchOpen){event.preventDefault();restoreSearchFocus.current=true;setSearchOpen(false);}
        else if(menu){event.preventDefault();setMenu(false);window.requestAnimationFrame(()=>menuTrigger.current?.focus());}
      }
    };
    const navigate=()=>{setMenu(false);setSearchOpen(false);};
    const frame=requestAnimationFrame(scroll);
    document.addEventListener('deuce:navigate',navigate);
    window.addEventListener('scroll',scroll,{passive:true});
    document.addEventListener('keydown',key);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('deuce:navigate',navigate);window.removeEventListener('scroll',scroll);document.removeEventListener('keydown',key);};
  },[menu,searchOpen]);

  useEffect(()=>{
    if(searchOpen||!restoreSearchFocus.current)return;
    const frame=window.requestAnimationFrame(()=>{trigger.current?.focus();restoreSearchFocus.current=false;});
    return()=>window.cancelAnimationFrame(frame);
  },[searchOpen]);

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
    if(context.submitPath)router.push(`${context.submitPath}?q=${encodeURIComponent(text)}`);
    else if(visibleItems[0])router.push(visibleItems[0].href);
    else router.push(`/buscar?q=${encodeURIComponent(text)}`);
  };
  const loading=!!query.trim()&&result.query!==query.trim();
  const context=searchContext(pathname);
  const visibleItems=context.groups?result.items.filter(item=>context.groups!.includes(item.group)):result.items;
  const groups=[...new Set(visibleItems.map(item=>item.group))];

  return <>
    <header className={`topbar${scrolled?' is-scrolled':''}${navHidden&&!menu&&!searchOpen?' nav-hidden':''}${searchOpen?' search-open':''}`}>
      <Link className="logo" href="/" aria-label="DEUCE, inicio" onClick={()=>{setMenu(false);setSearchOpen(false);}}><span aria-hidden="true"/>DEUCE</Link>
      <nav id="deuce-navigation" className={menu?'mobile-open':''} aria-label="Principal" aria-hidden={searchOpen}>{navigation.map(([label,href])=>{const active=href==='/buscar'?pathname==='/buscar'||pathname.startsWith('/match/'):href==='/jugadores'?pathname.startsWith('/jugadores')||pathname.startsWith('/players/')||pathname.startsWith('/rivalries/'):href==='/torneos'?pathname.startsWith('/torneos')||/^\/[a-z0-9-]+\/\d{4}$/.test(pathname):href==='/comparar'?pathname==='/comparar'||pathname==='/compare':pathname===href||pathname.startsWith(`${href}/`);return <Link prefetch={true} className={active?'active':''} aria-current={active?'page':undefined} href={href} key={href} tabIndex={searchOpen?-1:undefined} onClick={()=>setMenu(false)}>{label}</Link>;})}</nav>
      <form className="topbar-spotlight-form" role="search" aria-hidden={!searchOpen} onSubmit={event=>{event.preventDefault();submit();}}>
        <Search size={19} aria-hidden="true"/>
        <label className="nc-sr" htmlFor="global-search">Buscar {context.label}</label>
        <input ref={field} id="global-search" type="search" name="q" value={query} onChange={event=>setQuery(event.target.value)} placeholder={context.placeholder} autoComplete="off" tabIndex={searchOpen?0:-1}/>
        {query&&<button className="topbar-search-clear" type="button" onClick={()=>{setQuery('');field.current?.focus();}} aria-label="Borrar búsqueda" tabIndex={searchOpen?0:-1}><X size={16} aria-hidden="true"/></button>}
        <button className="topbar-spotlight-submit" type="submit" aria-label="Ver todos los resultados" tabIndex={searchOpen?0:-1}><ArrowRight size={18} aria-hidden="true"/></button>
        <button className="topbar-search-close" type="button" onClick={closeSearch} aria-label="Cerrar búsqueda" tabIndex={searchOpen?0:-1}><X size={18} aria-hidden="true"/></button>
      </form>
      <button ref={trigger} className="search-trigger" type="button" onClick={searchOpen?closeSearch:openSearch} aria-label={searchOpen?'Cerrar búsqueda':'Buscar en DEUCE'} aria-expanded={searchOpen}>{searchOpen?<X size={18} aria-hidden="true"/>:<Search size={18} aria-hidden="true"/>}<span>Buscar</span></button>
      <button ref={menuTrigger} className="menu" type="button" aria-label={menu?'Cerrar menú':'Abrir menú'} aria-expanded={menu} aria-controls="deuce-navigation" onClick={()=>{setSearchOpen(false);setNavHidden(false);setMenu(value=>!value)}}>{menu?<X size={18} aria-hidden="true"/>:<Menu size={18} aria-hidden="true"/>}</button>
    </header>
    <section className={`topbar-spotlight-panel${searchOpen?' is-open':''}`} aria-label="Sugerencias de búsqueda" aria-live="polite" aria-busy={loading} aria-hidden={!searchOpen}>
      {!query.trim()?<div className="topbar-spotlight-empty"><span>Buscar {context.label}</span><p>{context.hint}</p><div>{navigation.slice(0,4).map(([label,href])=><Link key={href} href={href} onClick={()=>setSearchOpen(false)}>{label}</Link>)}</div></div>
      :loading?<p className="topbar-spotlight-status">Buscando…</p>
      :result.error?<p className="topbar-spotlight-status">No se pudieron cargar las sugerencias. Pulsa Intro para buscar.</p>
      :visibleItems.length?<div className="topbar-spotlight-groups">{groups.map(group=><section key={group} aria-label={group}><h2>{group}</h2>{visibleItems.filter(item=>item.group===group).slice(0,6).map(item=><Link href={item.href} key={item.href} onClick={()=>setSearchOpen(false)}><span><strong>{item.name}</strong>{item.detail&&<small>{item.detail}</small>}</span><ArrowRight size={15} aria-hidden="true"/></Link>)}</section>)}</div>
      :<p className="topbar-spotlight-status">No hay {context.label==='DEUCE'?'resultados':context.label} para «{query}».</p>}
    </section>
  </>;
}
