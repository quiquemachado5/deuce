'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronDown, Search, X } from 'lucide-react';
import { recordsUrl, type RecordQuery } from '@/lib/records-url';
import styles from '@/app/records/records.module.css';

type Choice = { value: string; label: string };
export type RecordFilter = { key: string; label: string; options: Choice[] };

function Menu({ filter, value, pending, choose }: { filter: RecordFilter; value?: string; pending: boolean; choose: (value: string) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => { if (ref.current) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); } };
  const selected = filter.options.find(option => option.value === (value || ''));
  return <details ref={ref} className={styles.menu} onKeyDown={event => { if (event.key === 'Escape') close(); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
    <summary aria-label={filter.label} data-active={Boolean(value) || undefined}>{value ? selected?.label || value : filter.label}<ChevronDown size={14} aria-hidden="true" /></summary>
    <div className={styles.options} aria-label={filter.label}>
      {filter.options.map(option => <button key={option.value} type="button" disabled={pending} aria-pressed={(value || '') === option.value} onClick={() => { choose(option.value); close(); }}>
        <span>{option.label}</span>{(value || '') === option.value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>
  </details>;
}

export default function RecordsControls({ query, filters, searchable = false }: { query: RecordQuery; filters: RecordFilter[]; searchable?: boolean }) {
  const router = useRouter();
  const search = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const apply = (changes: RecordQuery) => startTransition(() => router.replace(recordsUrl(query, { page: undefined, smallPage: undefined, ...changes }), { scroll: false }));
  const active = filters.flatMap(filter => {
    const option = filter.options.find(option => option.value && option.value === query[filter.key]);
    return option && filter.key !== 'corte' ? [{ key: filter.key, ...option }] : [];
  });
  return <div className={`${styles.controls} archive-unified-toolbar`} aria-busy={pending}>
    {searchable && <form className={styles.recordSearch} role="search" onSubmit={event => { event.preventDefault(); apply({ q: search.current?.value.trim() || undefined, grupo: undefined }); }}><Search size={18} aria-hidden="true"/><label className="nc-sr" htmlFor="record-search">Buscar una estadística</label><input ref={search} id="record-search" type="search" defaultValue={query.q || ''} placeholder="Buscar una estadística"/><button type="submit" aria-label="Buscar estadística"><ArrowRight size={17} aria-hidden="true"/></button></form>}
    <div className={styles.filterBand}><span>Filtrar por</span><div className={styles.menus} aria-label="Filtrar estadísticas">{filters.map(filter => <Menu key={filter.key} filter={filter} value={query[filter.key] === 'all' ? '' : query[filter.key]} pending={pending} choose={value => apply({ [filter.key]: value })} />)}</div></div>
    {active.length > 0 && <div className={styles.chips} aria-label="Filtros activos">{active.map(item => <button disabled={pending} type="button" key={item.key} aria-label={`Quitar filtro ${item.label}`} onClick={() => apply({ [item.key]: undefined })}>{item.label}<X size={13} aria-hidden="true" /></button>)}</div>}
    <span role="status" className="nc-sr">{pending ? 'Actualizando estadísticas…' : ''}</span>
  </div>;
}
