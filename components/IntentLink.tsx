'use client'
import Link from 'next/link'
import { useState, type ComponentProps } from 'react'
/** Fully prefetch a dynamic statistical view on intent, not every metric at once. */
export default function IntentLink(props:ComponentProps<typeof Link>) {
 const [ready,setReady]=useState(false)
 return <Link {...props} prefetch={ready||props.prefetch} onMouseEnter={event=>{setReady(true);props.onMouseEnter?.(event)}} onFocus={event=>{setReady(true);props.onFocus?.(event)}} onTouchStart={event=>{setReady(true);props.onTouchStart?.(event)}}/>
}
