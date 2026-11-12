import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import Link from 'next/link';
import { preparedPlayerDirectoryProducts } from '@/lib/revista/read-records';
import { normalizeText } from '@/lib/quality';
import { playerSlug } from '@/lib/explore';
import styles from '../archive.module.css';

export const metadata={title:'Tennis players — DEUCE',description:'ATP and WTA player careers documented by the DEUCE archive.',alternates:{canonical:'/en/players',languages:{es:'/jugadores',en:'/en/players'}}};

export default async function EnglishPlayers({searchParams}:{searchParams:Promise<{tour?:string;q?:string}>}){
  const query=await searchParams,tour=query.tour==='wta'?'wta':'atp',term=normalizeText(query.q||'');
  const products=await preparedPlayerDirectoryProducts();
  const rows=products.circuits[tour].records.filter(player=>!term||normalizeText(player.name).includes(term)).slice(0,60);
  return <div className={styles.page} lang="en"><header className={styles.heading}><div><h1>Players</h1><p>Documented careers, surfaces and results. ATP and WTA remain separate throughout every calculation.</p></div><ArchiveFilterBar language="en" circuitLabel="Circuit" panelTitle="Filter players" circuits={(['atp','wta'] as const).map(value=>({label:value.toUpperCase(),active:tour===value,href:'/en/players?tour='+value}))}><form className={styles.form}><input type="hidden" name="tour" value={tour}/><label>Find a player<input name="q" defaultValue={query.q||''} maxLength={80}/></label><button>Search</button></form></ArchiveFilterBar></header><section className={styles.list} aria-label={`${tour.toUpperCase()} players`}>{rows.map(player=><Link className={styles.row} href={`/en/players/${playerSlug(player.name)}${tour==='wta'?'?tour=wta':''}`} key={player.name}><strong>{player.name}</strong><span>{player.seasons.length?`${Math.min(...player.seasons)}–${Math.max(...player.seasons)}`:'Documented career'}</span><b>{player.wins}</b><small>{player.played} matches</small></Link>)}</section></div>;
}
