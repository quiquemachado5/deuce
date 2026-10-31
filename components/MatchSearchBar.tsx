'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { matchSearchUrl, type MatchQuery } from '@/lib/match-search-url';
import styles from '@/app/buscar/search.module.css';

type Option = { value: string; label: string };

function FilterSelect({ label, value, options, onChange, allValue = '', noAll = false }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; allValue?: string; noAll?: boolean }) {
  return <label className={styles.filterField}>
    <span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)}>
      {!noAll && <option value={allValue}>Todas</option>}
      {options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

export default function MatchSearchBar({ query, categories, rounds, years, activeYear }: {
  query: MatchQuery;
  categories: string[];
  rounds: string[];
  years: number[];
  activeYear: number | null;
}) {
  const router = useRouter();
  const control = useRef<HTMLDivElement>(null);
  const portalPanel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [portalRoot] = useState<HTMLElement | null>(() => typeof document === 'undefined' ? null : document.body);
  const [pending, startTransition] = useTransition();
  const activeFilterCount = [query.year, query.surface, query.category, query.round, query.data, query.fiveSets === 'true' ? 'fiveSets' : ''].filter(Boolean).length;

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (control.current && !control.current.contains(target) && !portalPanel.current?.contains(target)) close(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.body.classList.remove('match-search-active');
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [close, filtersOpen]);

  const viewSwitch = <nav className={styles.viewSwitch} aria-label="Organización de los partidos">
    <Link href={matchSearchUrl(query, { vista: undefined, limit: undefined })} aria-current={query.vista !== 'torneos' ? 'page' : undefined} scroll={false}><span className={styles.labelFull}>Día a día</span><span className={styles.labelShort}>Día</span></Link>
    <Link href={matchSearchUrl(query, { vista: 'torneos', limit: undefined })} aria-current={query.vista === 'torneos' ? 'page' : undefined} scroll={false}><span className={styles.labelFull}>Por torneo</span><span className={styles.labelShort}>Torneos</span></Link>
  </nav>;

  const filterPanel = (portal = false) => <div ref={portal ? portalPanel : undefined} className={`${styles.filters} ${portal ? styles.portalFilters : styles.inlineFilters}`} aria-hidden={!filtersOpen} data-visible={filtersOpen || undefined}>
    <div className={styles.filterPanelHeader}><strong>Filtrar partidos</strong><button type="button" onClick={() => close()} aria-label="Cerrar filtros"><X size={17} aria-hidden="true"/></button></div>
    <div className={styles.mobileViewSwitch}>{viewSwitch}</div>
    <FilterSelect label="Circuito" value={query.tour || 'atp'} noAll options={[{ value: 'atp', label: 'ATP · masculino' }, { value: 'wta', label: 'WTA · femenino' }]} onChange={tour => apply({ tour, category: undefined, tournament: undefined, year: undefined, limit: undefined })} />
    <FilterSelect label="Temporada" value={query.year || (activeYear ? String(activeYear) : 'all')} allValue="all" options={years.map(year => ({ value: String(year), label: String(year) }))} onChange={year => apply({ year })} />
    <FilterSelect label="Categoría" value={query.category || ''} options={categories.map(value => ({ value, label: value }))} onChange={category => apply({ category: category || undefined })} />
    <FilterSelect label="Superficie" value={query.surface || ''} options={[{ value: 'hard', label: 'Dura' }, { value: 'clay', label: 'Tierra' }, { value: 'grass', label: 'Hierba' }, { value: 'carpet', label: 'Moqueta' }]} onChange={surface => apply({ surface: surface || undefined })} />
    <FilterSelect label="Ronda" value={query.round || ''} options={rounds.map(value => ({ value, label: value }))} onChange={round => apply({ round: round || undefined })} />
  </div>;

  return <div ref={control} className={styles.searchControl} data-filter-only="" data-filters-open={filtersOpen || undefined} aria-busy={pending}>
    <div className={styles.controlMain}>
      {viewSwitch}
      <button ref={trigger} className={styles.discoveryTrigger} type="button" aria-label={`Filtrar partidos${activeFilterCount ? `, ${activeFilterCount} filtros activos` : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><span>Filtros</span><SlidersHorizontal size={18} aria-hidden="true" />{activeFilterCount ? <b>{activeFilterCount}</b> : null}</button>
    </div>
    {filterPanel()}
    {portalRoot && filtersOpen ? createPortal(filterPanel(true), portalRoot) : null}
    <span className="nc-sr" role="status">{pending ? 'Actualizando partidos…' : ''}</span>
  </div>;
}
