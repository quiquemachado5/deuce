'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
const navigation = [['Partidos','/buscar'],['Récords','/records'],['Jugadores','/jugadores'],['Torneos','/tournaments'],['Comparar','/comparar']] as const;
type Result = { href: string; name: string; detail?: string; group: string };
export function DeuceTopbar() {
  const pathname=usePathname(), router=useRouter();
  const [hidden,setHidden]=useState(false), [menu,setMenu]=useState(false), [query,setQuery]=useState('');
  const [result,setResult]=useState<{query:string;items:Result[];error?:boolean}>({query:'',items:[]});
  const menuTrigger=useRef<HTMLButtonElement>(null);
  const dialog=useRef<HTMLDialogElement>(null), field=useRef<HTMLInputElement>(null), trigger=useRef<HTMLButtonElement>(null);
  const closeSearch=()=>{dialog.current?.close();document.body.style.removeProperty('overflow');trigger.current?.focus();};
  const openSearch=()=>{setMenu(false);dialog.current?.showModal();document.body.style.overflow='hidden';field.current?.focus();};
  useEffect(()=>{
    let previous=window.scrollY;
    const scroll=()=>{const current=window.scrollY;if(Math.abs(current-previous)<6)return;setHidden(current>previous&&current>120);previous=current;};
    const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch();}if(event.key==='Escape'){if(menuTrigger.current?.getAttribute('aria-expanded')==='true')menuTrigger.current.focus();setMenu(false);if(dialog.current?.open)closeSearch();}};
    const navigate=()=>setMenu(false);
    document.addEventListener('deuce:navigate',navigate);
    window.addEventListener('scroll',scroll,{passive:true});document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('deuce:navigate',navigate);window.removeEventListener('scroll',scroll);document.removeEventListener('keydown',key);document.body.style.removeProperty('overflow');};
  },[]);
  useEffect(()=>{
    const text=query.trim();if(!text)return;
    const abort=new AbortController();
    const timer=setTimeout(async()=>{try{const response=await fetch(`/api/search?q=${encodeURIComponent(text)}`,{signal:abort.signal});if(!response.ok)throw Error('search');const data=await response.json();setResult({query:text,items:Array.isArray(data.items)?data.items.slice(0,25):[]});}catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setResult({query:text,items:[],error:true});}},200);
    return()=>{clearTimeout(timer);abort.abort();};
  },[query]);
  const loading=!!query.trim()&&result.query!==query.trim();
  return <>
    <header className={`topbar${hidden&&!menu?' nav-hidden':''}`} onFocusCapture={()=>setHidden(false)}>
      <Link className="logo" href="/" aria-label="DEUCE, inicio" onClick={()=>setMenu(false)}><span aria-hidden="true"/>DEUCE</Link>
      <nav id="deuce-navigation" className={menu?'mobile-open':''} aria-label="Principal">{navigation.map(([label,href])=><Link className={pathname===href?'active':''} aria-current={pathname===href?'page':undefined} href={href} key={href} onClick={()=>setMenu(false)}>{label}</Link>)}</nav>
      <button ref={trigger} className="search-trigger" type="button" onClick={openSearch} aria-label="Buscar en DEUCE" aria-haspopup="dialog"><Search size={18} aria-hidden="true"/><span>Buscar</span><kbd>⌘K</kbd></button>
      <button ref={menuTrigger} className="menu" type="button" aria-expanded={menu} aria-controls="deuce-navigation" onClick={()=>setMenu(value=>!value)}>{menu?'Cerrar':'Menú'}</button>
    </header>
    <dialog ref={dialog} className="search-modal" aria-labelledby="global-search-label" onClose={()=>document.body.style.removeProperty('overflow')} onClick={event=>{if(event.target===event.currentTarget)closeSearch();}}>
      <button className="close-search" type="button" onClick={closeSearch}>Cerrar <X size={16} aria-hidden="true"/></button>
      <form action="/buscar" onSubmit={event=>{event.preventDefault();closeSearch();router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);}}>
        <label id="global-search-label" htmlFor="global-search">Busca un jugador,<br/>un torneo o un partido</label>
        <div><input ref={field} id="global-search" type="search" name="q" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Escribe para buscar…" autoComplete="off"/><button aria-label="Buscar" type="submit">→</button></div>
      </form>
      <div className="deuce-search-results" aria-live="polite" aria-busy={loading}>{query.trim()&&(loading?<p>Buscando…</p>:result.error?<p>No se pudieron cargar las sugerencias. Pulsa Intro para buscar en el archivo.</p>:result.items.length?[...new Set(result.items.map(item=>item.group))].map(group=><section key={group} aria-label={group}><h2>{group}</h2>{result.items.filter(item=>item.group===group).map(item=><Link href={item.href} key={item.href} onClick={closeSearch}><span><strong>{item.name}</strong><small>{item.detail}</small></span></Link>)}</section>):<p>No hay resultados para «{query}».</p>)}</div>
    </dialog>
  </>;
}
