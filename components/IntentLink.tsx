'use client'
import Link from 'next/link'
import {PrefetchKind} from 'next/dist/client/components/router-reducer/router-reducer-types'
import { useRouter } from 'next/navigation'
import { useEffect,useRef, type ComponentProps } from 'react'

import {prefetchPath,createPrefetchBudget} from '@/lib/navigation-prefetch'

const budget=createPrefetchBudget()
const queue=new Map<string,()=>void>()
let drain:ReturnType<typeof setTimeout>|undefined
function enqueue(path:string,prepare:()=>void){
 queue.set(path,prepare)
 while(queue.size>6)queue.delete(queue.keys().next().value!)
 if(drain)return
 const next=()=>{drain=undefined;const entry=queue.entries().next().value;if(!entry)return;queue.delete(entry[0]);entry[1]();drain=setTimeout(next,250)}
 next()
}

function canPrefetch() {
 const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
 return document.visibilityState!=='hidden'&&!connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType || '')
}

/** Fully prefetch a dynamic statistical view on intent, not every metric at once. */
export default function IntentLink(props:ComponentProps<typeof Link>) {
 const router = useRouter()
 const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
 const path = prefetchPath(props.href)
 const prepare = () => {
  if (!path || !canPrefetch()) return
  enqueue(path,()=>{
   if(!canPrefetch()||!budget.claim(path))return
   try{router.prefetch(path,{kind:PrefetchKind.FULL,onInvalidate:()=>budget.invalidate(path)})}catch{budget.invalidate(path)}
  })
 }
 const schedule = () => { if(timer.current)clearTimeout(timer.current);timer.current = setTimeout(prepare, 70) }
 const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);if(path)queue.delete(path)},[path])
 return <Link {...props} prefetch={props.prefetch ?? false}
  onMouseEnter={event=>{schedule();props.onMouseEnter?.(event)}}
  onMouseLeave={event=>{cancel();props.onMouseLeave?.(event)}}
  onFocus={event=>{prepare();props.onFocus?.(event)}}
  onTouchStart={event=>{prepare();props.onTouchStart?.(event)}}/>
}
