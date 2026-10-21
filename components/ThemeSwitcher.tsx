'use client'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Preference = 'system' | 'light' | 'dark'
function apply(preference: Preference) {
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.resolvedTheme = dark ? 'dark' : 'light'
}
export default function ThemeSwitcher() {
  const [preference, setPreference] = useState<Preference>('system')
  useEffect(() => {
    let active = true
    const saved = window.localStorage.getItem('deuce-theme')
    const next = saved === 'light' || saved === 'dark' ? saved : 'system'
    queueMicrotask(() => { if (active) setPreference(next) })
    apply(next)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => { const current = window.localStorage.getItem('deuce-theme'); if (!current || current === 'system') apply('system') }
    media.addEventListener('change', update)
    return () => { active = false; media.removeEventListener('change', update) }
  }, [])
  function change(value: Preference) {
    setPreference(value)
    window.localStorage.setItem('deuce-theme', value)
    apply(value)
  }
  return <label className="theme-switcher"><span className="sr-only">Tema de color</span>{preference === 'dark' ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}<select value={preference} onChange={event => change(event.target.value as Preference)} aria-label="Tema de color"><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
}
