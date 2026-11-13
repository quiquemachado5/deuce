import {Suspense} from 'react';
import Form from 'next/form';
import type {Match} from '@/lib/types';
import {ArchiveMasthead} from '@/components/deuce/ArchiveMasthead';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import {HomeMotion} from '@/components/deuce/HomeMotion';
import ComparisonPlayerField from '@/app/propuestas/comparar/ComparisonPlayerField';
import {preparedSearchProducts,preparedCompactSelection} from '@/lib/revista/read-records';
import {comparePlayer,comparisonHeadToHead,comparisonLeadTimeline,comparisonPlayerWon,sharedCareerWindow} from '@/lib/player-comparison';
import {playerSlug} from '@/lib/explore';
import {playerBiography} from '@/lib/player-bio';
import {playerDirectoryPhoto} from '@/lib/player-imagery';
import {isDeciding,lostOpening} from '@/lib/archive-insights';
import {toMatchRecord} from '@/data/map-match';
import {HeadToHeadEvolution} from '@/components/deuce/HeadToHeadEvolution';
import ComparisonStudy from '@/app/propuestas/comparar/ComparisonStudy';
import styles from '@/app/propuestas/comparar/comparison-study.module.css';
export default async function CompareExperience({searchParams,basePath='/comparar'}:{searchParams:Promise<Record<string,string|undefined>>;basePath?:string}){
 const q={...await searchParams};q.from=q.from||q.fromYear||(q.year!=='all'?q.year:undefined);q.to=q.to||q.toYear||(q.year!=='all'?q.year:undefined);const tour=q.tour==='wta'?'wta':'atp';
 const archive=await preparedSearchProducts(),records=archive.players.filter(p=>(p.tour||'atp')===tour);
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
 const source=await sourcePromise;
 const years=[...new Set(source.map(m=>m.year))].sort((a,b)=>a-b);
 const from=Number(q.from)||years[0],to=Number(q.to)||years.at(-1);
 let cohort=source.filter(m=>(!from||m.year>=from)&&(!to||m.year<=to));
 if(valid&&q.period==='shared'){const window=sharedCareerWindow(cohort,names as string[],tour);cohort=window?cohort.filter(m=>m.year>=window.first&&m.year<=window.last):[];}
 const models=valid?names.map(name=>comparePlayer(cohort,name!,{tour,surface:q.surface||'all',competition:q.competition||'all',age:q.age,minimum:q.minimum},tour)):[];
 const direct=valid?comparisonHeadToHead(cohort,names as string[],models.map(m=>m.matches),tour):[];
 const players=models.map(model=>({name:model.name,country:playerBiography(model.name,tour)?.country,photo:playerDirectoryPhoto(model.name,tour),played:model.played,wins:model.won,losses:model.lost,titles:model.titles,finals:model.finals,rate:model.rate,top10:model.top10Won,surfaces:model.surfaces,straight:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&m.score_summary.games.length>0&&m.score_summary.games.every(set=>set[m.winner!-1]>set[2-m.winner!])).length,comebacks:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&lostOpening(m)).length,deciding:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&isDeciding(m)).length,
 years:[...new Set(model.matches.map(m=>m.year))].sort((a,b)=>a-b).map(year=>{const ms=model.matches.filter(m=>m.year===year);const wins=ms.filter(m=>comparisonPlayerWon(m,model.name,tour)).length;return{year,played:ms.length,wins,rate:ms.length?wins/ms.length*100:null}})}));
 return <><span hidden data-navigation-ready=""/> {valid?<ComparisonStudy key={JSON.stringify(q)} players={players} tour={tour} evolution={<HeadToHeadEvolution names={names as string[]} points={comparisonLeadTimeline(direct,names as string[],tour).map(p=>({match:toMatchRecord(p.match),wins:p.wins}))}/>} meetings={direct.map(toMatchRecord)} wins={names.map(name=>direct.filter(m=>comparisonPlayerWon(m,name!,tour)).length)}/>:<p role="status">Elige dos nombres distintos del directorio para comparar sus carreras.</p>}</>;
}
