'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import PlayerFlag from '@/components/PlayerFlag';
import { matchSearchUrl, type MatchQuery } from '@/lib/match-search-url';
import styles from '@/app/buscar/search.module.css';

export type MatchSearchPreview = {
  href: string;
  tournament: string;
  round: string;
  date: string;
  players: [{ name: string; countryCode: string }, { name: string; countryCode: string }];
  scores: [string[], string[]];
  winnerIndex?: 0 | 1;
};

type Option = { value: string; label: string };

function formatDate(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}

function PreviewScore({ match }: { match: MatchSearchPreview }) {
  return <Link className={styles.mobileSearchItem} href={match.href}>
    <div className={styles.mobileSearchMeta}>
      <strong>{match.tournament} · {match.round}</strong>
      <span>{formatDate(match.date)}</span>
    </div>
    {match.players.map((player, side) => <div className={styles.previewPlayer} data-winner={match.winnerIndex === side || undefined} key={`${match.href}-${player.name}`}>
      <span className={styles.previewIdentity}>
        <span aria-hidden="true">{player.countryCode ? <PlayerFlag code={player.countryCode} /> : null}</span>
        <strong>{player.name}</strong>
      </span>
      <span className={styles.previewSets} aria-label={`Sets de ${player.name}`}>
        {Array.from({ length: Math.max(5, match.scores[side].length) }, (_, index) => {
          const offset = Math.max(0, 5 - match.scores[side].length);
          const value = index >= offset ? match.scores[side][index - offset] : '';
          return <span key={index}>{value}</span>;
        })}
      </span>
    </div>)}
  </Link>;
}

function FilterSelect({ label, value, options, onChange, allValue = '' }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; allValue?: string }) {
  return <label className={styles.filterField}>
    <span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)}>
      <option value={allValue}>Todas</option>
      {options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

export default function MatchSearchBar({ query, categories, rounds, years, activeYear, previews }: {
  query: MatchQuery;
  categories: string[];
  rounds: string[];
  chips: { key: string; label: string }[];
  years: number[];
  activeYear: number | null;
  previews: MatchSearchPreview[];
}) {
  const router = useRouter();
  const control = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [term, setTerm] = useState(query.q || '');
  const [remotePreviews, setRemotePreviews] = useState<{ query: string; items: MatchSearchPreview[] } | null>(null);
  const [mobileDialog, setMobileDialog] = useState(false);
  const [pending, startTransition] = useTransition();

  const activeFilterCount = [query.year, query.surface, query.category, query.round, query.data, query.fiveSets === 'true' ? 'fiveSets' : ''].filter(Boolean).length;
  const localPreviews = useMemo(() => {
    const needle = term.trim().toLocaleLowerCase('es');
    if (!needle) return previews.slice(0, 12);
    return previews.filter(match => [match.tournament, match.round, ...match.players.map(player => player.name)].join(' ').toLocaleLowerCase('es').includes(needle)).slice(0, 12);
  }, [previews, term]);
  const previewQuery = term.trim();
  const shownPreviews = previewQuery.length >= 2 && remotePreviews?.query === previewQuery ? remotePreviews.items : localPreviews;
  const previewLoading = previewQuery.length >= 2 && remotePreviews?.query !== previewQuery;

  const apply = (changes: MatchQuery, close = false) => {
    startTransition(() => router.replace(matchSearchUrl(query, { q: term.trim() || undefined, limit: undefined, ...changes }), { scroll: false }));
    if (close) {
      setSearchOpen(false);
      setFiltersOpen(false);
    }
  };

  const closeSearch = (restoreFocus = true) => {
    setSearchOpen(false);
    setFiltersOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => launch.current?.focus());
  };

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    const update = () => setMobileDialog(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const text = term.trim();
    if (text.length < 2) return;
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/match-previews?q=${encodeURIComponent(text)}`, { signal: abort.signal });
        if (!response.ok) throw new Error('preview-search');
        const data = await response.json();
        setRemotePreviews({ query: text, items: Array.isArray(data.items) ? data.items : [] });
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) setRemotePreviews({ query: text, items: localPreviews });
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [localPreviews, term]);

  useEffect(() => {
    if (!searchOpen) return;
    const mobile = window.matchMedia('(max-width: 560px)').matches;
    const hidden: { element: HTMLElement; ariaHidden: string | null; inert: boolean }[] = [];
    if (mobile) {
      document.body.classList.add('match-search-active');
      const page = control.current?.closest<HTMLElement>('.deuce-search');
      const conceal = (element: HTMLElement) => {
        if (element.contains(control.current)) return;
        hidden.push({ element, ariaHidden: element.getAttribute('aria-hidden'), inert: element.inert });
        element.setAttribute('aria-hidden', 'true');
        element.inert = true;
      };
      document.querySelectorAll<HTMLElement>('.topbar, .topbar-spotlight-panel, .deuce-footer').forEach(conceal);
      if (page) [...page.children].forEach(child => conceal(child as HTMLElement));
      let ancestor = control.current?.parentElement;
      while (ancestor && ancestor !== page) {
        [...ancestor.children].forEach(child => child !== control.current && !child.contains(control.current) && conceal(child as HTMLElement));
        ancestor = ancestor.parentElement;
      }
    }
    window.requestAnimationFrame(() => field.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
        return;
      }
      if (event.key !== 'Tab' || !mobile || !control.current) return;
      const focusable = [...control.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])')].filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!mobile && control.current && !control.current.contains(event.target as Node)) closeSearch(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.body.classList.remove('match-search-active');
      hidden.forEach(({ element, ariaHidden, inert }) => {
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
        element.inert = inert;
      });
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [searchOpen]);

  const viewSwitch = <nav className={styles.viewSwitch} aria-label="Organización de los partidos">
    <Link href={matchSearchUrl(query, { vista: undefined, limit: undefined })} aria-current={query.vista !== 'torneos' ? 'page' : undefined} scroll={false}><span className={styles.labelFull}>Día a día</span><span className={styles.labelShort}>Día</span></Link>
    <Link href={matchSearchUrl(query, { vista: 'torneos', limit: undefined })} aria-current={query.vista === 'torneos' ? 'page' : undefined} scroll={false}><span className={styles.labelFull}>Por torneo</span><span className={styles.labelShort}>Torneos</span></Link>
  </nav>;

  return <>
    <button ref={launch} className={styles.mobileSearchLaunch} type="button" aria-controls="match-search-tools" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}><Search size={17} aria-hidden="true" />Buscar</button>
    <div ref={control} id="match-search-tools" className={styles.searchControl} data-search-open={searchOpen || undefined} data-filters-open={filtersOpen || undefined} aria-busy={pending || previewLoading} role={searchOpen && mobileDialog ? 'dialog' : undefined} aria-modal={searchOpen && mobileDialog ? true : undefined} aria-label={searchOpen ? 'Buscar partidos' : undefined}>
      <div className={styles.controlMain}>
        {viewSwitch}
        <button className={styles.discoveryTrigger} type="button" aria-label="Buscar y filtrar partidos" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}><Search size={18} aria-hidden="true" /></button>
      </div>

      <div className={styles.searchPopover}>
        <form className={styles.searchForm} role="search" onSubmit={event => { event.preventDefault(); apply({}, true); }}>
          <Search size={17} aria-hidden="true" />
          <label className="nc-sr" htmlFor="match-search">Buscar jugador o torneo</label>
          <input ref={field} id="match-search" type="search" value={term} onChange={event => setTerm(event.target.value)} placeholder="Buscar" autoComplete="off" enterKeyHint="search" />
          <button className={styles.searchClose} type="button" onClick={() => closeSearch()} aria-label="Cerrar búsqueda"><X size={17} aria-hidden="true" /></button>
        </form>
        <button className={styles.filterToggle} type="button" aria-label={`Filtros${activeFilterCount ? `, ${activeFilterCount} activos` : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}>
          <SlidersHorizontal size={17} aria-hidden="true" />
          {activeFilterCount ? <span>{activeFilterCount}</span> : null}
        </button>
      </div>

      <div className={styles.mobileViewSwitch}>{viewSwitch}</div>

      <div className={styles.filters} aria-hidden={!filtersOpen}>
        <FilterSelect label="Temporada" value={query.year || (activeYear ? String(activeYear) : 'all')} allValue="all" options={years.map(year => ({ value: String(year), label: String(year) }))} onChange={year => apply({ year })} />
        <FilterSelect label="Categoría" value={query.category || ''} options={categories.map(value => ({ value, label: value }))} onChange={category => apply({ category: category || undefined })} />
        <FilterSelect label="Superficie" value={query.surface || ''} options={[{ value: 'hard', label: 'Dura' }, { value: 'clay', label: 'Tierra' }, { value: 'grass', label: 'Hierba' }, { value: 'carpet', label: 'Moqueta' }]} onChange={surface => apply({ surface: surface || undefined })} />
        <FilterSelect label="Ronda" value={query.round || ''} options={rounds.map(value => ({ value, label: value }))} onChange={round => apply({ round: round || undefined })} />
      </div>

      <div className={styles.mobileSearchResults} aria-live="polite">
        <header className={styles.mobileSearchSummary}>
          <strong>{term.trim() || activeFilterCount ? 'Resultados' : 'Partidos recientes'}</strong>
          <span>{previewLoading ? 'Buscando…' : `${shownPreviews.length} ${shownPreviews.length === 1 ? 'partido' : 'partidos'}`}</span>
        </header>
        {shownPreviews.length ? shownPreviews.map(match => <PreviewScore match={match} key={match.href} />) : !previewLoading && <div className={styles.mobileSearchEmpty}><strong>No hay partidos</strong><span>Prueba con otro jugador, torneo o filtro.</span></div>}
      </div>
      <span className="nc-sr" role="status">{pending ? 'Actualizando partidos…' : ''}</span>
    </div>
  </>;
}
