import Link from 'next/link';
import type { TournamentFilterItem } from './TournamentFilters';
import styles from './archive-filter-bar.module.css';

export default function CircuitCapsule({items,label,tone='light'}:{
  items: TournamentFilterItem[];
  label: string;
  tone?: 'light' | 'dark';
}){
  return <nav className={styles.circuits} aria-label={label} data-tone={tone}>
    {items.map(item=><Link key={item.href} href={item.href} prefetch={false} aria-current={item.active?'page':undefined}>{item.label}</Link>)}
  </nav>;
}
