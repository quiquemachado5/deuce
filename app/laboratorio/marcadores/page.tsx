import type { Metadata } from 'next';
import Link from 'next/link';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
import type { MatchRecord } from '@/types/deuce';
import cases from './cases.json';
import styles from './preview.module.css';

export const metadata:Metadata={title:'Propuestas de marcador · DEUCE',robots:{index:false,follow:false}};

export default function ScorecardPreview(){
  return <main id="main-content" className={styles.page}>
    <header className={styles.intro}><Link href="/">Volver a inicio</Link><h1>El partido, de un vistazo.</h1><p>Una cabecera, el resultado y la fecha. Casos reales del archivo para comprobar nombres largos, cinco sets, desempates y partidos sin completar.</p></header>
    <section className={styles.proposal} aria-label="Casos del marcador compacto">
      <div className={styles.grid}>{cases.map(item=><div className={styles.example} key={item.match.id}><h2>{item.label}</h2><MatchScoreboard match={item.match as MatchRecord}/></div>)}</div>
    </section>
  </main>;
}
