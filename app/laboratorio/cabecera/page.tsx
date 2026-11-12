import Link from 'next/link';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import { MatchArchivePage } from '@/components/deuce/MatchArchivePage';
import { preparedGeneration } from '@/lib/revista/read-records';
import { toMatchRecord } from '@/data/map-match';
import { PUBLICATION_CATEGORIES } from '@/lib/publication-scope';
import styles from './preview.module.css';

export const metadata={title:'Cabecera compacta · propuesta DEUCE',robots:{index:false,follow:false}};

export default async function HeaderPreview({searchParams}:{searchParams:Promise<{tour?:string}>}){
  const query=await searchParams,tour=query.tour==='wta'?'wta':'atp';
  const generation=await preparedGeneration();
  const matches=generation.manifest.home?.circuits?.[tour].latest||[];
  return <div className={styles.preview}>
    <div className={styles.masthead}><header><h1>Partidos</h1><ArchiveFilterBar circuitLabel="Circuito" panelTitle="Filtrar partidos" circuits={(['atp','wta'] as const).map(value=>({label:value.toUpperCase(),active:value===tour,href:`/laboratorio/cabecera?tour=${value}`}))}>
      <form action="/partidos" className={styles.form}><input type="hidden" name="tour" value={tour}/><label>Jugador o torneo<input name="q" type="search" placeholder="Buscar en los partidos"/></label><label>Categoría<select name="category"><option value="">Todas</option>{[...PUBLICATION_CATEGORIES[tour]].map(category=><option key={category}>{category}</option>)}</select></label><button type="submit">Ver partidos</button></form>
    </ArchiveFilterBar></header><nav aria-label="Cambiar vista de la propuesta"><span>Archivo {tour.toUpperCase()}</span><Link href="/partidos">Volver al diseño actual</Link></nav></div>
    <section className={styles.content} aria-label="Resultados de ejemplo del archivo"><MatchArchivePage matches={matches.map(toMatchRecord)}/></section>
  </div>;
}
