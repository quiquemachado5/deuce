'use client'
import Link from 'next/link'
import { useState } from 'react'
import MetricVisual, { type TrendPoint } from './MetricVisual'
export type StatisticItem={key:string;group:string;label:string;value:number;unit:string;definition:string;sample:string;href?:string;trend?:TrendPoint[];trendLabel?:string}
function Group({name,items}:{name:string;items:StatisticItem[]}) {
 const [open,setOpen]=useState(false)
 return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary><strong>{name}</strong><span>{items.length} {items.length===1?'estadística':'estadísticas'}</span></summary>{open&&<div>{items.map(item=><article key={item.key}><div><h3>{item.label}</h3><p>{item.definition}</p>{item.unit!=='%'&&<small>{item.sample}</small>}{item.href&&<Link href={item.href}>Comparar en el archivo →</Link>}</div><div className="statistic-measure"><strong>{item.value.toLocaleString('es-ES')}<small>{item.unit}</small>{item.unit==='%'&&<span className="sample-inline">{item.sample}</span>}</strong><MetricVisual value={item.value} unit={item.unit} trend={item.trend} trendLabel={item.trendLabel}/></div></article>)}</div>}</details>
}
export default function StatisticGroups({items,title='Todas sus cifras',id='cifras'}:{items:StatisticItem[];title?:string;id?:string}) {
 const groups=[...new Set(items.map(i=>i.group))]
 if(!items.length)return null
 return <section id={id} className="editorial-section statistic-groups"><header className="section-heading"><h2>{title}</h2><span>{items.length} estadísticas · por tema</span></header>{groups.map(group=><Group key={group} name={group} items={items.filter(i=>i.group===group)}/>)}</section>
}
