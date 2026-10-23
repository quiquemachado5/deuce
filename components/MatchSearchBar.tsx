'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { matchSearchUrl, type MatchQuery } from '@/lib/match-search-url';
import styles from '@/app/buscar/search.module.css';

type Option = { value: string; label: string };

function FilterMenu({ label, value, options, choose }: { label: string; value?: string; options: Option[]; choose: (value: string) => void }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  return <details className={styles.filterMenu} ref={disclosure} onKeyDown={event => {
    if (event.key === 'Escape' && disclosure.current) { disclosure.current.open = false; disclosure.current.querySelector('summary')?.focus(); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
    <summary>{label}<ChevronDown size={14} aria-hidden="true" /></summary>
    <div className={styles.filterOptions} aria-label={label}>
      {[{ value: '', label: 'Todas' }, ...options].map(option => <button key={option.value} type="button" aria-pressed={(value || '') === option.value} onClick={() => {
        choose(option.value);
        if (disclosure.current) { disclosure.current.open = false; disclosure.current.querySelector('summary')?.focus(); }
      }}><span>{option.label}</span>{(value || '') === option.value ? <Check size={15} aria-hidden="true" /> : null}</button>)}
    </div>
  </details>;
}

export default function MatchSearchBar({ query, categories, rounds, chips }: {
  query: MatchQuery;
  categories: string[];
  rounds: string[];
  chips: { key: string; label: string }[];
}) {
  const router = useRouter();
  const field = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const apply = (changes: MatchQuery) => startTransition(() => router.replace(matchSearchUrl(query, { q: field.current?.value.trim(), limit: undefined, ...changes }), { scroll: false }));
  return <div className={styles.searchControl} aria-busy={pending}>
    <form role="search" action="/buscar" onSubmit={event => { event.preventDefault(); apply({}); }}>
      {Object.entries(query).filter(([key, value]) => value && !['q', 'player', 'page', 'limit', 'editions'].includes(key)).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <div className={styles.searchInput}>
        <Search size={21} strokeWidth={1.7} aria-hidden="true" />
        <label className="nc-sr" htmlFor="match-search">Buscar jugador o torneo</label>
        <input ref={field} id="match-search" key={query.q || ''} name="q" type="search" defaultValue={query.q || ''} placeholder="Jugador o torneo" autoComplete="off" enterKeyHint="search" />
        <button className={styles.clearQuery} type="button" aria-label="Borrar búsqueda" onClick={() => { if (field.current) field.current.value = ''; apply({ q: undefined }); field.current?.focus(); }}><X size={18} aria-hidden="true" /></button>
      </div>
      {chips.length > 0 && <div className={styles.activeChips} aria-label="Filtros activos">{chips.map(chip => <button type="button" key={chip.key} onClick={() => apply({ [chip.key]: undefined })} aria-label={`Quitar filtro ${chip.label}`}>{chip.label}<X size={13} aria-hidden="true" /></button>)}</div>}
      <div className={styles.filterMenus}>
        <FilterMenu label="Superficie" value={query.surface} options={[{ value: 'clay', label: 'Tierra' }, { value: 'grass', label: 'Hierba' }, { value: 'hard', label: 'Dura' }, { value: 'carpet', label: 'Moqueta' }]} choose={surface => apply({ surface })} />
        <FilterMenu label="Categoría" value={query.category} options={categories.map(value => ({ value, label: value }))} choose={category => apply({ category })} />
        <FilterMenu label="Ronda" value={query.round} options={rounds.map(value => ({ value, label: value }))} choose={round => apply({ round })} />
        <button className={styles.fiveSetsToggle} type="button" aria-pressed={query.fiveSets === 'true'} onClick={() => apply({ fiveSets: query.fiveSets === 'true' ? undefined : 'true' })}>Cinco sets{query.fiveSets === 'true' && <Check size={14} aria-hidden="true" />}</button>
      </div>
    </form>
    <span className="nc-sr" role="status">{pending ? 'Actualizando partidos…' : ''}</span>
  </div>;
}
