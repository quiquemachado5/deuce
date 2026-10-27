'use client';

import Link from 'next/link';
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import FilterForm from '@/components/revista/FilterForm';

export default function PlayerDirectoryToolbar({ pairs, query, sort }: { pairs:boolean; query?:string; sort:string }) {
  return <div className="archive-filter-shell player-toolbar archive-unified-toolbar">
    <nav className="deuce-tabs" aria-label="Explorar jugadores">
      <Link href="/jugadores" aria-current={!pairs?'page':undefined}>Jugadores</Link>
      <Link href="/jugadores?tipo=enfrentamientos" aria-current={pairs?'page':undefined}>Enfrentamientos</Link>
    </nav>
    <details className="player-filter-disclosure">
      <summary><SlidersHorizontal size={15} aria-hidden="true"/><span>Filtrar</span><ChevronDown size={13} aria-hidden="true"/></summary>
      <div className="player-filter-popover">
        <FilterForm action="/jugadores">
          <input type="hidden" name="tipo" value={pairs?'enfrentamientos':'jugadores'}/>
          <label className="nc-field nc-filter-query"><span>Buscar {pairs?'un enfrentamiento':'jugadores'}</span><Search className="player-query-icon" size={17} aria-hidden="true"/><input name="q" type="search" defaultValue={query} placeholder={pairs?'Jugador o rival':'Buscar jugador'} autoComplete="off"/></label>
          {!pairs&&<label className="player-sort"><span>Ordenar por</span><select name="sort" defaultValue={sort} aria-label="Ordenar jugadores"><option value="slams">Grand Slams</option><option value="wins">Victorias</option><option value="played">Partidos</option><option value="finals">Finales ganadas</option></select></label>}
        </FilterForm>
      </div>
    </details>
  </div>;
}
