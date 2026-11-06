'use client';

import { type TournamentFilterItem } from '@/components/TournamentFilters';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { matchSearchUrl, type MatchQuery } from '@/lib/match-search-url';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
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

export default function MatchSearchBar({ query, categories, rounds, surfaces, years, activeYear, circuits }: {
  circuits: TournamentFilterItem[];
  query: MatchQuery;
  categories: string[];
  rounds: string[];
  surfaces: string[];
  years: number[];
  activeYear: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const effectiveYear = query.year === 'all' ? '' : query.year || (activeYear ? String(activeYear) : '');
  const activeFilterCount = [effectiveYear, query.surface, query.category, query.round, query.data, query.fiveSets === 'true' ? 'fiveSets' : ''].filter(Boolean).length;

  const apply = (changes: MatchQuery) => {
    startTransition(() => router.replace(matchSearchUrl(query, { limit: undefined, ...changes }), { scroll: false }));
  };

  return <div className={styles.searchControl} data-filter-only="" aria-busy={pending}>
    <ArchiveFilterBar circuits={circuits} circuitLabel="Circuito de partidos" panelTitle="Filtrar partidos" activeCount={activeFilterCount} busy={pending}>
      <div className={styles.sharedFilterGrid}>
        <FilterSelect label="Organizar por" value={query.vista || 'dias'} noAll options={[{value:'dias',label:'Día a día'},{value:'torneos',label:'Torneo'}]} onChange={vista => apply({vista: vista === 'dias' ? undefined : vista})} />
        <FilterSelect label="Temporada" value={query.year || (activeYear ? String(activeYear) : 'all')} allValue="all" options={years.map(year => ({ value: String(year), label: String(year) }))} onChange={year => apply({ year })} />
        <FilterSelect label="Categoría" value={query.category || ''} options={categories.map(value => ({ value, label: value }))} onChange={category => apply({ category: category || undefined })} />
        <FilterSelect label="Superficie" value={query.surface || ''} options={surfaces.map(value=>({value,label:({hard:'Dura',clay:'Tierra',grass:'Hierba',carpet:'Moqueta',unknown:'Sin documentar'} as Record<string,string>)[value]||value}))} onChange={surface => apply({ surface: surface || undefined })} />
        <FilterSelect label="Ronda" value={query.round || ''} options={rounds.map(value => ({ value, label: value }))} onChange={round => apply({ round: round || undefined })} />
      </div>
    </ArchiveFilterBar>
    <span className="nc-sr" role="status">{pending ? 'Actualizando partidos…' : ''}</span>
  </div>;
}
