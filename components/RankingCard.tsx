'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
export default function RankingCard({label,unit,rows}:{label:string;unit:string;rows:{name:string;value:number;detail:string}[]}) {
  const [open,setOpen]=useState(false)
  return <details className="atlas-metric" onToggle={event=>setOpen(event.currentTarget.open)}><summary><span>{label}</span><strong>{rows[0]?.name}</strong><b>{rows[0]?.value.toLocaleString('es-ES')}{unit}</b><ChevronDown size={17}/></summary>{open && <ol>{rows.map((row,index)=><li key={row.name}><span>{String(index+1).padStart(2,'0')}</span><strong>{row.name}</strong><small>{row.detail}</small><b>{row.value.toLocaleString('es-ES')}{unit}</b></li>)}</ol>}</details>
}
