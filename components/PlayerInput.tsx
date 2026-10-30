'use client';

import { ChevronDown } from 'lucide-react';
import { useDeferredValue, useId, useMemo, useRef, useState } from 'react';

type Props = {
  name: string;
  initial: string;
  options: string[];
  label: string;
};

export default function PlayerInput({ name, initial, options, label }: Props) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState(-1);
  const [visibleCount,setVisibleCount]=useState(80);
  const deferredValue = useDeferredValue(value);
  const matches = useMemo(() => {
    const query = showAll ? '' : deferredValue.trim().toLocaleLowerCase('es');
    return query
      ? options.filter((player) => player.toLocaleLowerCase('es').includes(query))
      : options;
  }, [deferredValue, options, showAll]);

  const choose = (player: string) => {
    setValue(player);
    setOpen(false);
    setShowAll(false);
    setActive(-1);
    setVisibleCount(80);
    input.current?.focus();
  };

  return (
    <div
      className="player-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <input
        ref={input}
        name={name}
        aria-label={label}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setActive(-1);
          setShowAll(false);
          setVisibleCount(80);
          setOpen(true);
        }}
        onFocus={() => {
          setShowAll(true);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((current) => {
              const next=Math.min(current+1,matches.length-1);
              if(next>=visibleCount)setVisibleCount(count=>Math.min(matches.length,count+80));
              return next;
            });
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter' && open && active >= 0) {
            event.preventDefault();
            choose(matches[active]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        required
        maxLength={100}
        autoComplete="off"
      />
      <button
        type="button"
        className="player-combobox-toggle"
        aria-label={open ? 'Cerrar lista de jugadores' : 'Ver todos los jugadores'}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          setShowAll(true);
          setOpen(true);
          window.requestAnimationFrame(() => input.current?.focus());
        }}
      >
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {open ? (
        <div className="player-combobox-menu" id={listId} role="listbox" onScroll={event=>{
          const list=event.currentTarget;
          if(list.scrollTop+list.clientHeight>=list.scrollHeight-120)setVisibleCount(count=>Math.min(matches.length,count+80));
        }}>
          <div className="player-combobox-count">
            {matches.length === options.length
              ? `${options.length} jugadores · orden alfabético`
              : `${matches.length} coincidencias`}
          </div>
          {matches.length ? matches.slice(0,visibleCount).map((player, index) => (
            <button
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={player === value}
              data-active={index === active ? 'true' : undefined}
              key={player}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(player)}
            >
              {player}
            </button>
          )) : <p>No hay jugadores que coincidan.</p>}
          {matches.length>visibleCount?<p>Desplázate para ver más jugadores.</p>:null}
        </div>
      ) : null}
    </div>
  );
}
