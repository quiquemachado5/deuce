'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Menu, Search, X } from 'lucide-react';

const navigation = [['Partidos','/buscar'],['Récords','/records'],['Jugadores','/jugadores'],['Torneos','/torneos'],['Comparar','/comparar']] as const;
type Result = { href: string; name: string; detail?: string; group: string };
const groupOrder = ['Jugadores','Torneos','Ediciones','Partidos','Parejas','Récords'];

export function DeuceTopbar() {
  const pathname=usePathname(), router=useRouter();
  const [scrolled,setScrolled]=useState(false), [navHidden,setNavHidden]=useState(false), [menu,setMenu]=useState(false), [searchOpen,setSearchOpen]=useState(false), [query,setQuery]=useState('');
  const [result,setResult]=useState<{query:string;items:Result[];error?:boolean}>({query:'',items:[]});
  const lastScroll=useRef(0);
  const restoreSearchFocus=useRef(false);
  const menuTrigger=useRef<HTMLButtonElement>(null), field=useRef<HTMLInputElement>(null), trigger=useRef<HTMLButtonElement>(null), panel=useRef<HTMLElement>(null);
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
      const target=event.target as HTMLElement | null;
      const editing=target?.matches('input,textarea,select,[contenteditable="true"]');
      if(((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k')||(event.key==='/'&&!editing)){
        event.preventDefault();
        setMenu(false);setNavHidden(false);setSearchOpen(true);
        window.requestAnimationFrame(()=>field.current?.focus());
        return;
      }
      if(event.key==='Escape'){
        if(searchOpen){event.preventDefault();restoreSearchFocus.current=true;setSearchOpen(false);}
        else if(menu){event.preventDefault();setMenu(false);window.requestAnimationFrame(()=>menuTrigger.current?.focus());}
      }
      if(event.key==='Tab'&&(searchOpen||menu)){
        const roots:HTMLElement[]=[];
        if(searchOpen){const form=field.current?.closest<HTMLElement>('form');if(form)roots.push(form);if(panel.current)roots.push(panel.current);}
        else {const nav=document.getElementById('deuce-navigation');if(nav)roots.push(nav);if(menuTrigger.current)roots.push(menuTrigger.current);}
        const focusable=roots.flatMap(root=>[...root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]).filter(node=>!node.hidden&&node.getAttribute('aria-hidden')!=='true');
        if(!focusable.length)return;
        const first=focusable[0],last=focusable.at(-1)!;
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
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
    const blocked=[document.getElementById('main-content'),document.querySelector<HTMLElement>('.deuce-footer')].filter((node):node is HTMLElement=>Boolean(node));
    for(const node of blocked)node.inert=searchOpen||menu;
    return()=>{for(const node of blocked)node.inert=false;};
  },[menu,searchOpen]);

  useEffect(()=>{
    if(searchOpen||!restoreSearchFocus.current)return;
    const frame=window.requestAnimationFrame(()=>{trigger.current?.focus();restoreSearchFocus.current=false;});
    return()=>window.cancelAnimationFrame(frame);
  },[searchOpen]);

  useEffect(()=>{
    const text=query.trim();
    if(text.length<2)return;
    const abort=new AbortController();
    const timer=setTimeout(async()=>{try{const response=await fetch(`/api/search?q=${encodeURIComponent(text)}`,{signal:abort.signal});if(!response.ok)throw Error('search');const data=await response.json();setResult({query:text,items:Array.isArray(data.items)?data.items.slice(0,24):[]});}catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setResult({query:text,items:[],error:true});}},120);
    return()=>{clearTimeout(timer);abort.abort();};
  },[query]);

  const submit=()=>{
    const text=query.trim();
    if(!text)return;
    setSearchOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(text)}`);
  };
  const loading=!!query.trim()&&result.query!==query.trim();
  const visibleItems=result.items;
  const groups=[...new Set(visibleItems.map(item=>item.group))].sort((a,b)=>groupOrder.indexOf(a)-groupOrder.indexOf(b));
  const moveResult=(direction:1|-1)=>{
    const links=[...(panel.current?.querySelectorAll<HTMLAnchorElement>('[data-search-result]')||[])];
    if(!links.length)return;
    const current=links.indexOf(document.activeElement as HTMLAnchorElement);
    if(direction<0&&current<=0){field.current?.focus();return;}
    links[current<0?(direction>0?0:links.length-1):(current+direction+links.length)%links.length]?.focus();
  };

  return <>
    <header className={`topbar${scrolled?' is-scrolled':''}${navHidden&&!menu&&!searchOpen?' nav-hidden':''}${searchOpen?' search-open':''}`}>
      <Link className="logo" href="/" aria-label="DEUCE, inicio" onClick={()=>{setMenu(false);setSearchOpen(false);}}><span aria-hidden="true"/>DEUCE</Link>
      <nav id="deuce-navigation" className={menu?'mobile-open':''} aria-label="Principal" aria-hidden={searchOpen}>{navigation.map(([label,href])=>{const active=href==='/buscar'?pathname==='/buscar'||pathname.startsWith('/match/'):href==='/jugadores'?pathname.startsWith('/jugadores')||pathname.startsWith('/players/'):href==='/torneos'?pathname.startsWith('/torneos')||/^\/[a-z0-9-]+\/\d{4}$/.test(pathname):href==='/comparar'?pathname==='/comparar'||pathname==='/compare':pathname===href||pathname.startsWith(`${href}/`);return <Link prefetch={true} className={active?'active':''} aria-current={active?'page':undefined} href={href} key={href} tabIndex={searchOpen?-1:undefined} onClick={()=>setMenu(false)}>{label}</Link>;})}</nav>
      <form className="topbar-spotlight-form" role="search" aria-hidden={!searchOpen} onSubmit={event=>{event.preventDefault();submit();}}>
        <Search size={19} aria-hidden="true"/>
        <label className="nc-sr" htmlFor="global-search">Buscar jugadores, partidos o torneos</label>
        <input ref={field} id="global-search" type="search" name="q" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();moveResult(1);}}} placeholder="Jugador, partido, torneo o año" autoComplete="off" tabIndex={searchOpen?0:-1} aria-controls="global-search-results"/>
        {query&&<button className="topbar-search-clear" type="button" onClick={()=>{setQuery('');field.current?.focus();}} aria-label="Borrar búsqueda" tabIndex={searchOpen?0:-1}><X size={16} aria-hidden="true"/></button>}
        <button className="topbar-spotlight-submit" type="submit" aria-label="Ver todos los resultados" tabIndex={searchOpen?0:-1}><ArrowRight size={18} aria-hidden="true"/></button>
        <button className="topbar-search-close" type="button" onClick={closeSearch} aria-label="Cerrar búsqueda" tabIndex={searchOpen?0:-1}><X size={18} aria-hidden="true"/></button>
      </form>
      <button ref={trigger} className="search-trigger" type="button" onClick={searchOpen?closeSearch:openSearch} aria-label={searchOpen?'Cerrar búsqueda':'Buscar en DEUCE'} aria-expanded={searchOpen}>{searchOpen?<X size={18} aria-hidden="true"/>:<Search size={18} aria-hidden="true"/>}<span>Buscar</span></button>
      <button ref={menuTrigger} className="menu" type="button" aria-label={menu?'Cerrar menú':'Abrir menú'} aria-expanded={menu} aria-controls="deuce-navigation" onClick={()=>{setSearchOpen(false);setNavHidden(false);setMenu(value=>!value)}}>{menu?<X size={18} aria-hidden="true"/>:<Menu size={18} aria-hidden="true"/>}</button>
    </header>
    <section ref={panel} id="global-search-results" className={`topbar-spotlight-panel${searchOpen?' is-open':''}`} aria-label="Sugerencias de búsqueda" aria-live="polite" aria-busy={loading} aria-hidden={!searchOpen} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();moveResult(event.key==='ArrowDown'?1:-1);}}}>
      {!query.trim()?<div className="topbar-spotlight-empty"><span>Buscar en todo DEUCE</span><p>Encuentra jugadores, partidos, torneos, ediciones y récords desde un único lugar.</p><div>{navigation.slice(0,4).map(([label,href])=><Link key={href} href={href} onClick={()=>setSearchOpen(false)}>{label}</Link>)}</div></div>
      :loading?<p className="topbar-spotlight-status">Buscando…</p>
      :result.error?<p className="topbar-spotlight-status">No se pudieron cargar las sugerencias. Pulsa Intro para buscar.</p>
      :visibleItems.length?<div className="topbar-spotlight-groups">{groups.map(group=><section key={group} aria-label={group}><h2>{group}</h2>{visibleItems.filter(item=>item.group===group).slice(0,6).map(item=><Link href={item.href} key={item.href} data-search-result="" onClick={()=>setSearchOpen(false)}><span><strong>{item.name}</strong>{item.detail&&<small>{item.detail}</small>}</span><ArrowRight size={15} aria-hidden="true"/></Link>)}</section>)}</div>
      :<p className="topbar-spotlight-status">No hay resultados para «{query}». Prueba con otro nombre, torneo o año.</p>}
    </section>
  </>;
}
