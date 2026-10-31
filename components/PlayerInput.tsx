'use client';

import { ChevronDown } from 'lucide-react';
import { useDeferredValue, useEffect, useId, useRef, useState } from 'react';

type Props = { name: string; initial: string; label: string };

export default function PlayerInput({ name, initial, label }: Props) {
  const listId = useId(), input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial), deferredValue = useDeferredValue(value);
  const [open, setOpen] = useState(false), [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState(-1), [options, setOptions] = useState<string[]>([]);
  const [total, setTotal] = useState(0), [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const query = showAll ? '' : deferredValue.trim();
    if (query.length === 1) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/players?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('players');
        const body = await response.json();
        setOptions(Array.isArray(body.items) ? body.items : []);
        setTotal(Number(body.total) || 0);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) { setOptions([]); setTotal(0); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 120);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [deferredValue, open, showAll]);

  const choose = (player: string) => {
    setValue(player); setOpen(false); setShowAll(false); setActive(-1);
    input.current?.focus();
  };

  return <div className="player-combobox" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <input ref={input} name={name} aria-label={label} value={value}
      onChange={event => { const next=event.target.value;setValue(next);setActive(-1);setShowAll(false);setOpen(true);if(next.trim().length===1){setOptions([]);setTotal(0);setLoading(false);} }}
      onFocus={() => { setShowAll(true); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(current => Math.min(current + 1, options.length - 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(current => Math.max(current - 1, 0)); }
        else if (event.key === 'Enter' && open && active >= 0) { event.preventDefault(); choose(options[active]); }
        else if (event.key === 'Escape') setOpen(false);
      }}
      role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded={open}
      aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} required maxLength={100} autoComplete="off" />
    <button type="button" className="player-combobox-toggle" aria-label={open ? 'Cerrar lista de jugadores' : 'Ver jugadores'} aria-expanded={open}
      onClick={() => { if (open) { setOpen(false); return; } setShowAll(true); setOpen(true); window.requestAnimationFrame(() => input.current?.focus()); }}>
      <ChevronDown size={17} aria-hidden="true" />
    </button>
    {open ? <div className="player-combobox-menu" id={listId} role="listbox">
      <div className="player-combobox-count">{loading ? 'Buscando jugadores…' : showAll ? `${total} jugadores · orden alfabético` : `${options.length} coincidencias`}</div>
      {options.length ? options.map((player, index) => <button id={`${listId}-${index}`} type="button" role="option" aria-selected={player === value} data-active={index === active ? 'true' : undefined} key={player}
        onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(player)}>{player}</button>)
        : !loading && <p>{deferredValue.trim().length === 1 ? 'Escribe al menos dos letras.' : 'No hay jugadores que coincidan.'}</p>}
    </div> : null}
  </div>;
}
