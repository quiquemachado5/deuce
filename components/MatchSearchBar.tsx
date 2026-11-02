'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { matchSearchUrl, type MatchQuery } from '@/lib/match-search-url';
import styles from '@/app/buscar/search.module.css';

type Option = { value: string; label: string };
const mobileFilterQuery = '(max-width: 560px)';

function FilterSelect({ label, value, options, onChange, allValue = '', noAll = false }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; allValue?: string; noAll?: boolean }) {
  return <label className={styles.filterField}>
    <span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)}>
      {!noAll && <option value={allValue}>Todas</option>}
      {options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

export default function MatchSearchBar({ query, categories, rounds, surfaces, years, activeYear }: {
  query: MatchQuery;
  categories: string[];
  rounds: string[];
  surfaces: string[];
  years: number[];
  activeYear: number | null;
}) {
  const router = useRouter();
  const control = useRef<HTMLDivElement>(null);
  const portalPanel = useRef<HTMLDivElement>(null);
  const portalClose = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelTitleId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const subscribeToMobileViewport = useCallback((onChange: () => void) => {
    const media = window.matchMedia(mobileFilterQuery);
    const handleChange = () => {
      setFiltersOpen(open => {
        if (open) window.requestAnimationFrame(() => trigger.current?.focus());
        return false;
      });
      onChange();
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);
  const isMobile = useSyncExternalStore(subscribeToMobileViewport, () => window.matchMedia(mobileFilterQuery).matches, () => false);
  const portalRoot = typeof document === 'undefined' ? null : document.body;
  const [pending, startTransition] = useTransition();
  const effectiveYear = query.year === 'all' ? '' : query.year || (activeYear ? String(activeYear) : '');
  const activeFilterCount = [effectiveYear, query.surface, query.category, query.round, query.data, query.fiveSets === 'true' ? 'fiveSets' : ''].filter(Boolean).length;

  const apply = (changes: MatchQuery) => {
    startTransition(() => router.replace(matchSearchUrl(query, { limit: undefined, ...changes }), { scroll: false }));
  };
  const close = useCallback((restoreFocus = true) => {
    setFiltersOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    document.body.classList.add('match-search-active');
    const inerted = new Map<HTMLElement, boolean>();
    const panel = isMobile ? portalPanel.current : null;
    if (panel) {
      for (const child of document.body.children) {
        if (!(child instanceof HTMLElement) || child === panel || child.contains(panel)) continue;
        inerted.set(child, child.inert);
        child.inert = true;
      }
      window.requestAnimationFrame(() => portalClose.current?.focus());
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab' && panel) {
        const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
          .filter(element => element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null);
        if (!focusable.length) {
          event.preventDefault();
          panel.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable.at(-1)!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (control.current && !control.current.contains(target) && !portalPanel.current?.contains(target)) close(isMobile);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.body.classList.remove('match-search-active');
      inerted.forEach((wasInert, element) => { element.inert = wasInert; });
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [close, filtersOpen, isMobile]);

  const viewSwitch = <nav className={styles.viewSwitch} aria-label="Organización de los partidos">
    <Link href={matchSearchUrl(query, { vista: undefined, limit: undefined })} aria-current={query.vista !== 'torneos' ? 'page' : undefined} scroll={false} onClick={() => close(false)}><span className={styles.labelFull}>Día a día</span><span className={styles.labelShort}>Día</span></Link>
    <Link href={matchSearchUrl(query, { vista: 'torneos', limit: undefined })} aria-current={query.vista === 'torneos' ? 'page' : undefined} scroll={false} onClick={() => close(false)}><span className={styles.labelFull}>Por torneo</span><span className={styles.labelShort}>Torneos</span></Link>
  </nav>;

  const filterPanel = (portal = false) => <div
    ref={portal ? portalPanel : undefined}
    className={`${styles.filters} ${portal ? styles.portalFilters : styles.inlineFilters}`}
    role={portal ? 'dialog' : undefined}
    aria-modal={portal ? 'true' : undefined}
    aria-labelledby={portal ? panelTitleId : undefined}
    aria-hidden={portal ? undefined : (!filtersOpen || isMobile)}
    tabIndex={portal ? -1 : undefined}
    data-visible={filtersOpen || undefined}
  >
    <div className={styles.filterPanelHeader}><strong id={portal ? panelTitleId : undefined}>Filtrar partidos</strong><button ref={portal ? portalClose : undefined} type="button" onClick={() => close()} aria-label="Cerrar filtros"><X size={17} aria-hidden="true"/></button></div>
    <FilterSelect label="Temporada" value={query.year || (activeYear ? String(activeYear) : 'all')} allValue="all" options={years.map(year => ({ value: String(year), label: String(year) }))} onChange={year => apply({ year })} />
    <FilterSelect label="Categoría" value={query.category || ''} options={categories.map(value => ({ value, label: value }))} onChange={category => apply({ category: category || undefined })} />
    <FilterSelect label="Superficie" value={query.surface || ''} options={surfaces.map(value=>({value,label:({hard:'Dura',clay:'Tierra',grass:'Hierba',carpet:'Moqueta',unknown:'Sin documentar'} as Record<string,string>)[value]||value}))} onChange={surface => apply({ surface: surface || undefined })} />
    <FilterSelect label="Ronda" value={query.round || ''} options={rounds.map(value => ({ value, label: value }))} onChange={round => apply({ round: round || undefined })} />
  </div>;

  return <div ref={control} className={styles.searchControl} data-filter-only="" data-filters-open={filtersOpen || undefined} aria-busy={pending}>
    <div className={styles.controlMain}>
      {viewSwitch}
      <button ref={trigger} className={styles.discoveryTrigger} type="button" aria-label={`Filtrar partidos${activeFilterCount ? `, ${activeFilterCount} filtros activos` : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><span>Filtros</span><SlidersHorizontal size={18} aria-hidden="true" />{activeFilterCount ? <b>{activeFilterCount}</b> : null}</button>
    </div>
    {filterPanel()}
    {portalRoot && filtersOpen && isMobile ? createPortal(filterPanel(true), portalRoot) : null}
    <span className="nc-sr" role="status">{pending ? 'Actualizando partidos…' : ''}</span>
  </div>;
}
