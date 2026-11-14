import {preparedComparison} from '@/lib/prepared-comparison';
import {Suspense} from 'react';
import Form from 'next/form';
import type {Match} from '@/lib/types';
import {ArchiveMasthead} from '@/components/deuce/ArchiveMasthead';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import {HomeMotion} from '@/components/deuce/HomeMotion';
import ComparisonPlayerField from '@/app/propuestas/comparar/ComparisonPlayerField';
import {preparedPublicArchive,preparedCompactSelection} from '@/lib/revista/read-records';
import {playerSlug} from '@/lib/explore';
import {playerDirectoryPhoto} from '@/lib/player-imagery';
import {HeadToHeadEvolution} from '@/components/deuce/HeadToHeadEvolution';
import ComparisonStudy from '@/app/propuestas/comparar/ComparisonStudy';
import styles from '@/app/propuestas/comparar/comparison-study.module.css';
export default async function CompareExperience({searchParams,basePath='/comparar'}:{searchParams:Promise<Record<string,string|undefined>>;basePath?:string}){
 const q={...await searchParams};q.from=q.from||q.fromYear||(q.year!=='all'?q.year:undefined);q.to=q.to||q.toYear||(q.year!=='all'?q.year:undefined);const tour=q.tour==='wta'?'wta':'atp';
 const archive=await preparedPublicArchive(),records=Object.entries(archive.players).filter(([id])=>id.startsWith(tour+':')).map(([,name])=>({name}));
 const defaults=tour==='wta'?['Serena Williams','Steffi Graf']:['Roger Federer','Rafael Nadal'];
 const resolve=(name:string|undefined,fallback:string)=>records.find(r=>playerSlug(r.name)===playerSlug(name||fallback))?.name;
 const names=[resolve(q.a,defaults[0]),resolve(q.b,defaults[1])];
 const valid=names.every(Boolean)&&names[0]!==names[1];
 const sourcePromise=valid?preparedCompactSelection({tour,players:names as string[]}):Promise.resolve([] as Match[]);
 return <HomeMotion className={styles.page}><ArchiveMasthead title="Comparar" tools={<Suspense fallback={<span className="skeleton skeleton-toolbar" role="status" aria-label="Cargando contenido"/>}><ComparisonFilters q={q} tour={tour} names={names} basePath={basePath} sourcePromise={sourcePromise}/></Suspense>}/>
 <Form prefetch={false} id="player-comparison-form" className={styles.selection} action={basePath}><input type="hidden" name="tour" value={tour}/>{['a','b'].map((key,i)=><label key={key}><span>{i?'Segundo jugador':'Primer jugador'}</span><ComparisonPlayerField key={tour+'|'+key+'|'+names[i]} name={key} tour={tour} initial={names[i]||q[key]||''} label={(tour==='wta'?'Jugadora':'Jugador')+' '+(i+1)} photo={names[i]?playerDirectoryPhoto(names[i]!,tour):null}/></label>)}<button type="submit">Comparar<svg className="lucide lucide-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button></Form>
 <Suspense fallback={<div className={styles.duel} role="status" aria-label="Cargando contenido"><div className={styles.portrait+' skeleton'}/><div className={styles.portrait+' skeleton'}/></div>}><ComparisonContent q={q} tour={tour} names={names} valid={valid} sourcePromise={sourcePromise}/></Suspense>
 </HomeMotion>;
}
type ResolvedComparison={q:Record<string,string|undefined>;tour:'atp'|'wta';names:(string|undefined)[];sourcePromise:Promise<Match[]>};
async function ComparisonFilters({q,tour,names,basePath,sourcePromise}:ResolvedComparison&{basePath:string}){
 const source=await sourcePromise,years=[...new Set(source.map(match=>match.year))].sort((a,b)=>a-b);
 const keep=<>{names.map((name,i)=><input key={i} type="hidden" name={i?'b':'a'} value={name||''}/>)}<input type="hidden" name="tour" value={tour}/>{q.age&&<input type="hidden" name="age" value={q.age}/>} {q.minimum&&<input type="hidden" name="minimum" value={q.minimum}/>}</>;
 return <ArchiveFilterBar panelTitle="Filtrar comparación" circuitLabel="Circuito de comparación" circuits={['atp','wta'].map(t=>({label:t.toUpperCase(),href:basePath+'?tour='+t,active:tour===t}))} activeCount={[q.surface,q.competition,q.from,q.to,q.period].filter(v=>v&&v!=='all'&&v!=='career').length}>
 <Form prefetch={false} className={styles.filters} action={basePath}>{keep}<label>Periodo<select name="period" defaultValue={q.period||'career'}><option value="career">Carreras documentadas</option><option value="shared">Años compartidos</option></select></label><label>Desde<select name="from" defaultValue={q.from||''}><option value="">Primera temporada</option>{years.map(y=><option key={y}>{y}</option>)}</select></label><label>Hasta<select name="to" defaultValue={q.to||''}><option value="">Última temporada</option>{years.map(y=><option key={y}>{y}</option>)}</select></label><label>Superficie<select name="surface" defaultValue={q.surface||'all'}><option value="all">Todas</option><option value="hard">Dura</option><option value="clay">Tierra</option><option value="grass">Hierba</option><option value="carpet">Moqueta</option></select></label><label>Competición<select name="competition" defaultValue={q.competition||'all'}><option value="all">Todas</option>{[...new Set(source.map(m=>m.category))].sort().map(c=><option key={c}>{c}</option>)}</select></label><button type="submit">Actualizar comparación</button></Form>
 </ArchiveFilterBar>;
}
async function ComparisonContent({q,tour,names,valid,sourcePromise}:ResolvedComparison&{valid:boolean}){
 const data=valid?await preparedComparison(q,tour,names as string[],()=>sourcePromise):null;
 return <><span hidden data-navigation-ready=""/> {valid?<ComparisonStudy key={JSON.stringify(q)} players={data!.players} tour={tour} evolution={<HeadToHeadEvolution names={names as string[]} points={data!.timeline}/>} meetings={data!.meetings} wins={data!.wins}/>:<p role="status">Elige dos nombres distintos del directorio para comparar sus carreras.</p>}</>;
}
