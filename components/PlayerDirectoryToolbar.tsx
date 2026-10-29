'use client';

import { Search } from 'lucide-react';
import FilterForm from '@/components/revista/FilterForm';
import styles from './PlayerDirectoryToolbar.module.css';

export default function PlayerDirectoryToolbar({ query, sort }: { query?:string; sort:string }) {
  return <div className={styles.toolbar}>
    <details className={styles.discovery}>
      <summary aria-label="Buscar y ordenar jugadores"><Search size={18} aria-hidden="true"/><span className={styles.triggerLabel}>Buscar jugador</span></summary>
      <div className={styles.popover}>
        <FilterForm action="/jugadores">
          <label className={styles.query}><span>Buscar jugadores</span><Search size={16} aria-hidden="true"/><input name="q" type="search" defaultValue={query} placeholder="Buscar jugador" autoComplete="off"/></label>
          <label className={styles.sort}><span>Ordenar por</span><select name="sort" defaultValue={sort} aria-label="Ordenar jugadores"><option value="slams">Grand Slams</option><option value="wins">Victorias</option><option value="played">Partidos</option><option value="finals">Finales ganadas</option></select></label>
        </FilterForm>
      </div>
    </details>
  </div>;
}
