'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronDown, Ellipsis, Search, SlidersHorizontal, X } from 'lucide-react';
import { matchSearchUrl, type MatchQuery } from '@/lib/match-search-url';
import styles from '@/app/buscar/search.module.css';

type Option = { value: string; label: string };

function FilterMenu({ label, value, options, choose, compact = false, includeAll = true }: { label: string; value?: string; options: Option[]; choose: (value: string) => void; compact?: boolean; includeAll?: boolean }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const selected = options.find(option => option.value === (value || ''));
  return <details className={styles.filterMenu} data-compact={compact || undefined} ref={disclosure} onKeyDown={event => {
    if (event.key === 'Escape' && disclosure.current) { disclosure.current.open = false; disclosure.current.querySelector('summary')?.focus(); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
    <summary aria-label={label} data-active={Boolean(value) || undefined}>{compact ? <Ellipsis size={18} aria-hidden="true" /> : <><span>{value ? selected?.label || value : label}</span><ChevronDown size={14} aria-hidden="true" /></>}</summary>
    <div className={styles.filterOptions} aria-label={label}>
      {[...(includeAll ? [{ value: '', label: compact ? 'Todos los formatos' : 'Todas' }] : []), ...options].map(option => <button key={option.value} type="button" aria-label={option.label} aria-pressed={(value || '') === option.value} onClick={() => {
        choose(option.value);
        if (disclosure.current) { disclosure.current.open = false; disclosure.current.querySelector('summary')?.focus(); }
      }}><span>{option.label}</span>{(value || '') === option.value ? <Check size={15} aria-hidden="true" /> : null}</button>)}
    </div>
  </details>;
}

export default function MatchSearchBar({ query, categories, rounds, chips, years, activeYear }: {
  query: MatchQuery;
  categories: string[];
  rounds: string[];
  chips: { key: string; label: string }[];
  years: number[];
  activeYear: number | null;
}) {
  const router = useRouter();
  const field = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const apply = (changes: MatchQuery) => startTransition(() => router.replace(matchSearchUrl(query, { q: field.current?.value.trim(), limit: undefined, ...changes }), { scroll: false }));
  const activeFilterCount = new Set([
    activeYear ? 'year' : '', query.surface ? 'surface' : '', query.category ? 'category' : '',
    query.round ? 'round' : '', query.fiveSets === 'true' ? 'fiveSets' : '', query.data ? 'data' : '', ...chips.map(chip => chip.key),
  ].filter(Boolean)).size;
  return <div className={`${styles.searchControl} archive-unified-toolbar`} data-compact="true" aria-busy={pending}>
    <form role="search" action="/buscar" onSubmit={event => { event.preventDefault(); apply({}); }}>
      {Object.entries(query).filter(([key, value]) => value && !['q', 'player', 'page', 'limit', 'editions'].includes(key)).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <div className={`${styles.searchBox} archive-query-row`}>
        <div className={styles.searchInput}>
          <Search size={20} strokeWidth={1.7} aria-hidden="true" />
          <label className="nc-sr" htmlFor="match-search">Buscar jugador o torneo</label>
          <input ref={field} id="match-search" key={query.q || ''} name="q" type="search" defaultValue={query.q || ''} placeholder="Jugador, torneo, año, ronda" autoComplete="off" enterKeyHint="search" />
          <button className={styles.clearQuery} type="button" aria-label="Borrar búsqueda" onClick={() => { if (field.current) field.current.value = ''; apply({ q: undefined }); field.current?.focus(); }}><X size={18} aria-hidden="true" /></button>
        </div>
        <button className={styles.searchSubmit} type="submit">Buscar<ArrowRight size={17} aria-hidden="true" /></button>
      </div>
      <div className={`${styles.filterBar} archive-filter-row`}>
        <div className={styles.filterDisclosure} data-open={filtersOpen || undefined}>
          <button className={styles.filterToggle} type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={16} aria-hidden="true"/><span>Filtros{activeFilterCount ? ` (${activeFilterCount})` : ''}</span><ChevronDown size={14} aria-hidden="true"/></button>
          <div className={styles.filterMenus}>
            <FilterMenu label="Temporada" value={activeYear ? String(activeYear) : ''} options={years.map(year => ({ value: String(year), label: String(year) }))} includeAll={Boolean(query.q)} choose={year => apply({ year })} />
            <FilterMenu label="Superficie" value={query.surface} options={[{ value: 'clay', label: 'Tierra' }, { value: 'grass', label: 'Hierba' }, { value: 'hard', label: 'Dura' }, { value: 'carpet', label: 'Moqueta' }]} choose={surface => apply({ surface })} />
            <FilterMenu label="Categoría" value={query.category} options={categories.map(value => ({ value, label: value }))} choose={category => apply({ category })} />
            <FilterMenu label="Ronda" value={query.round} options={rounds.map(value => ({ value, label: value }))} choose={round => apply({ round })} />
            <FilterMenu label="Datos" value={query.data} options={[{ value: 'measures', label: 'Con medidas' }, { value: 'points', label: 'Con puntos' }]} choose={data => apply({ data })} />
            <FilterMenu label="Más filtros" compact value={query.fiveSets} options={[{ value: 'true', label: 'Cinco sets' }]} choose={fiveSets => apply({ fiveSets })} />
          </div>
        </div>
        <nav className={styles.viewSwitch} aria-label="Vista de resultados">
          <Link href={matchSearchUrl(query, { vista: undefined, limit: undefined })} aria-current={query.vista !== 'torneos' ? 'page' : undefined} scroll={false}>Lista</Link>
          <Link href={matchSearchUrl(query, { vista: 'torneos', limit: undefined })} aria-current={query.vista === 'torneos' ? 'page' : undefined} scroll={false}>Torneos</Link>
        </nav>
        {chips.length > 0 && <div className={styles.activeChips} aria-label="Filtros activos">{chips.map(chip => <button type="button" key={chip.key} onClick={() => apply({ [chip.key]: undefined })} aria-label={`Quitar filtro ${chip.label}`}>{chip.label}<X size={13} aria-hidden="true" /></button>)}</div>}
      </div>
    </form>
    <span className="nc-sr" role="status">{pending ? 'Actualizando partidos…' : ''}</span>
  </div>;
}
