'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Bookmark, Clock3, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import styles from './archive-return-memory.module.css';

type ArchiveItem = {
  href: string;
  label: string;
  kind: 'Partido' | 'Jugador' | 'Torneo' | 'Récord' | 'Comparación' | 'Historia';
  visitedAt: number;
};

type ArchiveMemory = { recent: ArchiveItem[]; saved: ArchiveItem[] };

const STORAGE_KEY = 'deuce:personal-archive:v1';
const EMPTY_MEMORY: ArchiveMemory = { recent: [], saved: [] };

function archiveKind(pathname: string, search: string): ArchiveItem['kind'] | null {
  if (/^\/match\/[^/]+$/.test(pathname)) return 'Partido';
  if (/^\/(?:jugadores|players)\/[^/]+$/.test(pathname)) return 'Jugador';
  if (/^\/torneos\/[^/]+(?:\/\d{4})?$/.test(pathname)) return 'Torneo';
  if (pathname === '/records' && new URLSearchParams(search).has('dato')) return 'Récord';
  if (pathname === '/comparar' && new URLSearchParams(search).has('a')) return 'Comparación';
  if (pathname === '/historias') return 'Historia';
  return null;
}

function isArchiveItem(value: unknown): value is ArchiveItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ArchiveItem>;
  const kinds: ArchiveItem['kind'][] = ['Partido', 'Jugador', 'Torneo', 'Récord', 'Comparación', 'Historia'];
  return typeof item.href === 'string' && item.href.startsWith('/') && !item.href.startsWith('//')
    && !item.href.includes('\\') && item.href.length <= 512
    && typeof item.label === 'string' && item.label.length > 0 && item.label.length <= 140
    && kinds.includes(item.kind as ArchiveItem['kind'])
    && typeof item.visitedAt === 'number' && Number.isFinite(item.visitedAt);
}

function readMemory(): ArchiveMemory {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<ArchiveMemory> | null;
    return {
      recent: Array.isArray(parsed?.recent) ? parsed.recent.filter(isArchiveItem).slice(0, 8) : [],
      saved: Array.isArray(parsed?.saved) ? parsed.saved.filter(isArchiveItem).slice(0, 12) : [],
    };
  } catch {
    return EMPTY_MEMORY;
  }
}

function writeMemory(memory: ArchiveMemory) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); } catch { /* Private browsing can reject storage. */ }
}

function pageLabel() {
  const title = document.title.replace(/\s+[\u2014·-]\s+DEUCE.*$/i, '').trim();
  const heading = document.querySelector<HTMLElement>('main h1')?.innerText.replace(/\s+/g, ' ').trim();
  return (heading || title || 'Vista del archivo').slice(0, 140);
}

export default function ArchiveReturnMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [memory, setMemory] = useState<ArchiveMemory>(EMPTY_MEMORY);
  const [current, setCurrent] = useState<ArchiveItem | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMemory(readMemory());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const rememberOrigin = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.target === '_blank') return;
      const url = new URL(link.href, location.href);
      try {
        if (url.origin === location.origin && url.pathname.startsWith('/match/')) {
          if (location.pathname === '/buscar') sessionStorage.setItem('deuce:archive-origin', location.pathname + location.search);
          else sessionStorage.removeItem('deuce:archive-origin');
        }
      } catch { /* Navigation still works if storage is unavailable. */ }
    };
    document.addEventListener('click', rememberOrigin, true);
    return () => document.removeEventListener('click', rememberOrigin, true);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const kind = archiveKind(pathname, search);
      if (!kind) { setCurrent(null); return; }
      const item: ArchiveItem = {
        href: `${pathname}${search ? `?${search}` : ''}`,
        label: pageLabel(),
        kind,
        visitedAt: Date.now(),
      };
      setCurrent(item);
      setMemory(previous => {
        const next = { ...previous, recent: [item, ...previous.recent.filter(entry => entry.href !== item.href)].slice(0, 8) };
        writeMemory(next);
        return next;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY) setMemory(readMemory()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const isSaved = Boolean(current && memory.saved.some(item => item.href === current.href));
  const visibleRecent = useMemo(() => memory.recent.slice(0, 4), [memory.recent]);
  if (!ready || (!current && memory.saved.length === 0 && memory.recent.length === 0)) return null;

  const update = (next: ArchiveMemory) => { setMemory(next); writeMemory(next); };
  const toggleCurrent = () => {
    if (!current) return;
    update({
      ...memory,
      saved: isSaved
        ? memory.saved.filter(item => item.href !== current.href)
        : [{ ...current, visitedAt: Date.now() }, ...memory.saved.filter(item => item.href !== current.href)].slice(0, 12),
    });
  };

  return <section className={styles.library} id="tu-archivo" aria-labelledby="personal-archive-title">
    <header className={styles.heading}>
      <div><h2 id="personal-archive-title">Tu archivo</h2><p>Guardados y visitas recientes se conservan solo en este navegador.</p></div>
      {current && <button className={styles.save} type="button" onClick={toggleCurrent} aria-pressed={isSaved}>
        <Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true"/>{isSaved ? 'Guardado' : 'Guardar esta página'}
      </button>}
    </header>
    <div className={styles.columns}>
      <section aria-labelledby="saved-title">
        <div className={styles.subheading}><h3 id="saved-title">Guardados</h3><span>{memory.saved.length}</span></div>
        {memory.saved.length ? <ul>{memory.saved.slice(0, 6).map(item => <li key={item.href}><Link href={item.href}><small>{item.kind}</small><span>{item.label}</span></Link><button type="button" onClick={() => update({ ...memory, saved: memory.saved.filter(entry => entry.href !== item.href) })} aria-label={`Quitar ${item.label} de guardados`}><X size={15} aria-hidden="true"/></button></li>)}</ul>
          : <p className={styles.empty}>Guarda un partido, jugador o torneo para volver sin buscarlo de nuevo.</p>}
      </section>
      <section aria-labelledby="recent-title">
        <div className={styles.subheading}><h3 id="recent-title"><Clock3 size={15} aria-hidden="true"/>Vistos recientemente</h3>{visibleRecent.length > 0 && <button type="button" onClick={() => update({ ...memory, recent: [] })}>Borrar historial</button>}</div>
        {visibleRecent.length ? <ul>{visibleRecent.map(item => <li key={item.href}><Link href={item.href}><small>{item.kind}</small><span>{item.label}</span></Link></li>)}</ul>
          : <p className={styles.empty}>Las páginas que consultes aparecerán aquí.</p>}
      </section>
    </div>
  </section>;
}
