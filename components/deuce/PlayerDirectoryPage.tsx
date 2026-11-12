import { ArchiveMasthead } from '@/components/deuce/ArchiveMasthead';
import Link from 'next/link';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import {HomeMotion} from '@/components/deuce/HomeMotion';
import {PlayerDirectoryStudy} from '@/components/deuce/PlayerDirectoryStudy';
import {preparedPlayerDirectoryProducts} from '@/lib/revista/read-records';
import {normalizeText} from '@/lib/quality';
import {playerSlug} from '@/lib/explore';
import {playerDirectoryPhoto} from '@/lib/player-imagery';
import {playerBiography} from '@/lib/player-bio';
import styles from '@/app/jugadores/player-index.module.css';
export default async function PlayerDirectoryPage({query}:{query:{q?:string;tour?:string;page?:string;orden?:string;filtros?:string}}){
  const tour=query.tour==='wta'?'wta':'atp',term=normalizeText(query.q||'');
  const circuit=(await preparedPlayerDirectoryProducts()).circuits[tour];
  const byName=new Map(circuit.records.map(record=>[record.name,record]));
  const order=query.orden==='name'?'name':query.orden==='wins'?'wins':'relevance';
  const names=(order==='name'?circuit.byName:order==='wins'?circuit.byWins:circuit.byRelevance).filter(name=>normalizeText(name).includes(term));
  const page=Math.max(1,Math.min(Math.ceil(names.length/25)||1,Number(query.page)||1));
  const href=(values:Record<string,string>)=>{const params=new URLSearchParams({...query,...values});return '/jugadores?'+params.toString();};
  const rows=names.slice((page-1)*25,page*25).flatMap(name=>{const record=byName.get(name);return record?[{name,href:'/jugadores/'+playerSlug(name)+(tour==='wta'?'?tour=wta':''),country:playerBiography(name,tour)?.country,wins:record.wins,played:record.played,rate:record.played?record.wins/record.played*100:0,slams:order==='relevance'?record.grandSlamFinalsWon:undefined,photo:playerDirectoryPhoto(name,tour)}]:[];});
  return <HomeMotion className={styles.page}><ArchiveMasthead title={tour==='wta'?'Jugadoras':'Jugadores'} tools={<ArchiveFilterBar key={tour+'|'+(query.filtros||'closed')} initiallyOpen={query.filtros==='nombre'} autoFocusField="q" circuitLabel="Circuito de jugadores" panelTitle="Filtrar directorio" circuits={['atp','wta'].map(value=>({href:href({tour:value,page:'1'}),label:value.toUpperCase(),active:tour===value}))} activeCount={[query.q,order!=='relevance'?order:''].filter(Boolean).length}><form className={styles.filters} action="/jugadores"><input type="hidden" name="tour" value={tour}/><label>Nombre<input type="search" name="q" defaultValue={query.q}/></label><label>Ordenar<select name="orden" defaultValue={order}><option value="relevance">Trayectoria</option><option value="wins">Victorias</option><option value="name">Nombre</option></select></label><button type="submit">Aplicar</button></form></ArchiveFilterBar>}/><PlayerDirectoryStudy key={tour+'|'+page+'|'+term+'|'+order} rows={rows}/><nav className={styles.pagination} aria-label="Paginación del directorio">{page>1&&<Link href={href({page:String(page-1)})}>Anterior</Link>}{page*25<names.length&&<Link href={href({page:String(page+1)})}>Siguiente</Link>}</nav></HomeMotion>;
}
