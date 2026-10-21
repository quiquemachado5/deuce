'use client'
import Form from 'next/form'
import { useRef, useEffect, type ReactNode } from 'react'
/** A native GET form remains usable without JavaScript; enhanced changes submit after a pause. */
export default function AutoFilter({ children, action, className, label }: { children: ReactNode; action: string; className?: string; label: string }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return <Form action={action} className={className} aria-label={label} onChange={event => {
    const form = event.currentTarget
    const target = event.target as HTMLInputElement
    if (timer.current) clearTimeout(timer.current)
    if (target.tagName === 'SELECT' || target.type === 'checkbox') form.requestSubmit()
    else timer.current = setTimeout(() => form.requestSubmit(), 180)
  }} onSubmit={() => { if (timer.current) clearTimeout(timer.current) }}>{children}<noscript><button type="submit">Buscar</button></noscript></Form>
}
