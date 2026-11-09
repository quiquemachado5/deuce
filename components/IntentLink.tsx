'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, type ComponentProps } from 'react'

const prefetched = new Set<string>()

function canPrefetch() {
 const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
 return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType || '')
}

function internalPath(href: ComponentProps<typeof Link>['href']) {
 const value = typeof href === 'string' ? href : href.pathname
 return typeof value === 'string' && value.startsWith('/') ? value : null
}

/** Fully prefetch a dynamic statistical view on intent, not every metric at once. */
export default function IntentLink(props:ComponentProps<typeof Link>) {
 const router = useRouter()
 const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
 const path = internalPath(props.href)
 const prepare = () => {
  if (!path || !canPrefetch() || prefetched.has(path)) return
  prefetched.add(path)
  if (prefetched.size > 128) prefetched.delete(prefetched.values().next().value!)
  router.prefetch(path)
 }
 const schedule = () => { timer.current = setTimeout(prepare, 90) }
 const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
 return <Link {...props} prefetch={props.prefetch ?? false}
  onMouseEnter={event=>{schedule();props.onMouseEnter?.(event)}}
  onMouseLeave={event=>{cancel();props.onMouseLeave?.(event)}}
  onFocus={event=>{prepare();props.onFocus?.(event)}}
  onTouchStart={event=>{prepare();props.onTouchStart?.(event)}}/>
}
