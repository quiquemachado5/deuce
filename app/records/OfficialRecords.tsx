import Link from 'next/link';
import {playerSlug} from '@/lib/explore';
import {publishedOfficialRecords} from '@/lib/official-records';
import type {Tour} from '@/lib/types';
import styles from './official-records.module.css';

export default async function OfficialRecords({tour}:{tour:Tour}){
  const rows=(await publishedOfficialRecords()).filter(row=>row.tour===tour);
  if(!rows.length)return null;
  return <section className={styles.section} aria-labelledby="official-records-title">
    <div className={styles.heading}><h2 id="official-records-title">Palmarés oficial.</h2><p>Una segunda lectura del archivo, contrastada cada día con los históricos publicados por los torneos.</p></div>
    <ol>{rows.map(row=><li key={row.id}><div><span>{row.tournament}</span><Link href={`/jugadores/${playerSlug(row.player)}${tour==='wta'?'?tour=wta':''}`}>{row.player}</Link></div><strong>{row.titles}<small> títulos</small></strong><a href={row.source} target="_blank" rel="noopener noreferrer" aria-label={`Fuente oficial: ${row.publisher}`}>Fuente oficial</a></li>)}</ol>
  </section>;
}
