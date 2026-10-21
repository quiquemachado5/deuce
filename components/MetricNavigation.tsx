'use client'
import Link from './IntentLink'
import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
type Choice={key:string;label:string;url:string}
export default function MetricNavigation({choices,selected}:{choices:Choice[];selected:string}) {
 const router=useRouter()
 return <aside className="metric-navigation"><label className="metric-mobile">Estadística<select value={selected} onChange={event=>{const choice=choices.find(c=>c.key===event.target.value);if(choice)router.push(choice.url,{scroll:false})}}>{choices.map(c=><option value={c.key} key={c.key}>{c.label}</option>)}</select></label><nav className="metric-desktop" aria-label="Estadísticas de este tema">{choices.map(c=><Link key={c.key} href={c.url} aria-current={c.key===selected?'page':undefined} scroll={false} prefetch={false}>{c.label}</Link>)}</nav></aside>
}

export function TopicNavigation({choices,selected}:{choices:(Choice&{count:number})[];selected:string}) {
 const rail=useRef<HTMLElement>(null)
 useEffect(()=>{const nav=rail.current,active=nav?.querySelector<HTMLElement>('[aria-current=page]');if(nav&&active)nav.scrollLeft=active.offsetLeft-nav.offsetLeft-(nav.clientWidth-active.clientWidth)/2},[selected])
 return <nav ref={rail} className="topic-navigation" aria-label="Temas estadísticos">{choices.map(c=><Link key={c.key} href={c.url} aria-current={selected===c.key?'page':undefined} scroll={false} prefetch={false}><strong>{c.label}</strong><span>{c.count} estadísticas</span></Link>)}</nav>
}
