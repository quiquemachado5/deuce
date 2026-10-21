import Image from 'next/image';
import Link from 'next/link';
import type {Match} from '@/lib/types';
import {courtPhoto} from '@/lib/imagery';
import {durationLabel} from '@/lib/editorial';
import {score} from '@/lib/cuaderno/model';
import {tournamentName} from '@/lib/labels';
export function TennisFeature({match}:{match:Match}) {
 const photo=courtPhoto(match.tournament);
 return <section className="tennis-feature wide">
  <div className="tennis-feature-copy">
   <h1>¿Sabías que…?</h1>
   <p className="tennis-feature-number">{durationLabel(match.context!.minutes!)}</p>
   <p className="tennis-feature-names">{match.player1.name}<span className="versus"> contra </span>{match.player2.name}</p>
   <p className="tennis-feature-description">El partido más largo con minutos publicados en este archivo.</p>
   <Link className="tennis-score" href={`/match/${match.match_id}`}>
    <span><i className={`surface-dot ${match.surface}`}/>{tournamentName(match.tournament)} · {match.year}</span>
    <strong>{score(match).split(", ").map((set,i)=><span className="score-set" key={i}>{set}{i<match.score_summary.games.length-1?", ":""}</span>)}</strong>
    <span className="tennis-score-action">Leer el partido</span>
   </Link>
  </div>
  {photo&&<figure className="tennis-feature-photo">
   <Image src={photo.src} alt={photo.alt} width={1120} height={840} sizes="(max-width:759px) 100vw, 60vw" priority/>
   <figcaption><span>{tournamentName(match.tournament)} · Vista del recinto, no del encuentro.</span><a href={photo.source}>{photo.credit}</a></figcaption>
  </figure>}
 </section>;
}
export function RecordsMasthead({matches}:{matches:number}) {
 const photo=courtPhoto('Roland Garros')!;
 return <header className="records-masthead">
  <div><p className="small">Grand Slams · Masters · Precursores</p><h1>El archivo, bajo otra mirada.</h1><p>Encuentra líderes, compara épocas y descubre patrones. Cada lista incluye su definición, muestra y partidos.</p><p className="scope">{matches.toLocaleString('es-ES',{useGrouping:'always'})} partidos del archivo.</p></div>
  <figure><Image src={photo.src} alt={photo.alt} width={734} height={560} sizes="(max-width:759px) 100vw, 45vw" priority/><figcaption><span>Philippe-Chatrier · 2024</span><a href={photo.source}>{photo.credit}</a></figcaption></figure>
 </header>;
}
