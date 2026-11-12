import Link from 'next/link';
import { playerSlug } from '@/lib/explore';
import { statisticRegistry, verifiedStatistics } from '@/lib/verified-statistics';
import type { Tour } from '@/lib/types';
import styles from './verified-milestones.module.css';

export default function VerifiedMilestones({ tour }: { tour: Tour }) {
  const facts = verifiedStatistics(tour);
  if (!facts.length) return null;
  return <section className={styles.section} aria-labelledby="verified-milestones-title">
    <div className={styles.heading}><h2 id="verified-milestones-title">Hitos de una carrera.</h2><p>Rachas, temporadas y títulos, contrastados en publicaciones independientes. Cada hito conserva su periodo y sus fuentes.</p></div>
    <ul className={styles.list}>{facts.map(fact => <li key={fact.id}>
      <div className={styles.figure}><strong>{fact.value.toLocaleString('es-ES')}</strong><span>{fact.unit}</span></div>
      <div className={styles.description}><Link href={`/jugadores/${playerSlug(fact.player)}${tour === 'wta' ? '?tour=wta' : ''}`}>{fact.player}</Link><h3>{fact.label}</h3><p>{fact.period}</p>
        <details><summary>Consultar fuentes<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></summary><div><p>{fact.definition}</p><ul>{fact.observations.map(observation => {
          const source = statisticRegistry.sources[observation.source];
          return <li key={observation.source}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher}<span> · {source.title}</span></a></li>;
        })}</ul></div></details>
      </div>
    </li>)}</ul>
  </section>;
}
