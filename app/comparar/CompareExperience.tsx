import {ArchiveMasthead} from '@/components/deuce/ArchiveMasthead';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import {HomeMotion} from '@/components/deuce/HomeMotion';
import ComparisonPlayerField from '@/app/propuestas/comparar/ComparisonPlayerField';
import {preparedPlayerRecords,preparedCompactSelection} from '@/lib/revista/read-records';
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
 const archive=await preparedPlayerRecords(),records=archive.records.filter(p=>(p.tour||'atp')===tour);
 const defaults=tour==='wta'?['Serena Williams','Steffi Graf']:['Roger Federer','Rafael Nadal'];
 const resolve=(name:string|undefined,fallback:string)=>records.find(r=>playerSlug(r.name)===playerSlug(name||fallback))?.name;
 const names=[resolve(q.a,defaults[0]),resolve(q.b,defaults[1])];
 const valid=names.every(Boolean)&&names[0]!==names[1];
 const source=valid?await preparedCompactSelection({tour,players:names as string[]}):[];
 const years=[...new Set(source.map(m=>m.year))].sort((a,b)=>a-b);
 const from=Number(q.from)||years[0],to=Number(q.to)||years.at(-1);
 let cohort=source.filter(m=>(!from||m.year>=from)&&(!to||m.year<=to));
 if(valid&&q.period==='shared'){const window=sharedCareerWindow(cohort,names as string[],tour);cohort=window?cohort.filter(m=>m.year>=window.first&&m.year<=window.last):[];}
 const models=valid?names.map(name=>comparePlayer(cohort,name!,{tour,surface:q.surface||'all',competition:q.competition||'all',age:q.age,minimum:q.minimum},tour)):[];
 const direct=valid?comparisonHeadToHead(cohort,names as string[],models.map(m=>m.matches),tour):[];
 const players=models.map(model=>({name:model.name,country:playerBiography(model.name,tour)?.country,photo:playerDirectoryPhoto(model.name,tour),played:model.played,wins:model.won,losses:model.lost,titles:model.titles,finals:model.finals,rate:model.rate,top10:model.top10Won,surfaces:model.surfaces,straight:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&m.score_summary.games.length>0&&m.score_summary.games.every(set=>set[m.winner!-1]>set[2-m.winner!])).length,comebacks:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&lostOpening(m)).length,deciding:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&isDeciding(m)).length,
 years:[...new Set(model.matches.map(m=>m.year))].sort((a,b)=>a-b).map(year=>{const ms=model.matches.filter(m=>m.year===year);const wins=ms.filter(m=>comparisonPlayerWon(m,model.name,tour)).length;return{year,played:ms.length,wins,rate:ms.length?wins/ms.length*100:null}})}));
 const keep=<>{names.map((name,i)=><input key={i} type="hidden" name={i?'b':'a'} value={name||''}/>)}<input type="hidden" name="tour" value={tour}/>{q.age&&<input type="hidden" name="age" value={q.age}/>} {q.minimum&&<input type="hidden" name="minimum" value={q.minimum}/>}</>;
 return <HomeMotion className={styles.page}><ArchiveMasthead title="Comparar" tools={<ArchiveFilterBar panelTitle="Filtrar comparación" circuitLabel="Circuito de comparación" circuits={['atp','wta'].map(t=>({label:t.toUpperCase(),href:basePath+'?tour='+t,active:tour===t}))} activeCount={[q.surface,q.competition,q.from,q.to,q.period].filter(v=>v&&v!=='all'&&v!=='career').length}>
 <form className={styles.filters} action={basePath}>{keep}<label>Periodo<select name="period" defaultValue={q.period||'career'}><option value="career">Carreras documentadas</option><option value="shared">Años compartidos</option></select></label><label>Desde<select name="from" defaultValue={q.from||''}><option value="">Primera temporada</option>{years.map(y=><option key={y}>{y}</option>)}</select></label><label>Hasta<select name="to" defaultValue={q.to||''}><option value="">Última temporada</option>{years.map(y=><option key={y}>{y}</option>)}</select></label><label>Superficie<select name="surface" defaultValue={q.surface||'all'}><option value="all">Todas</option><option value="hard">Dura</option><option value="clay">Tierra</option><option value="grass">Hierba</option><option value="carpet">Moqueta</option></select></label><label>Competición<select name="competition" defaultValue={q.competition||'all'}><option value="all">Todas</option>{[...new Set(source.map(m=>m.category))].sort().map(c=><option key={c}>{c}</option>)}</select></label><button type="submit">Actualizar comparación</button></form>
 </ArchiveFilterBar>}/>
 <form id="player-comparison-form" className={styles.selection} action={basePath}><input type="hidden" name="tour" value={tour}/>{['a','b'].map((key,i)=><label key={key}><span>{i?'Segundo jugador':'Primer jugador'}</span><ComparisonPlayerField key={tour+'|'+key+'|'+names[i]} name={key} tour={tour} initial={names[i]||q[key]||''} label={(tour==='wta'?'Jugadora':'Jugador')+' '+(i+1)} photo={players[i]?.photo||null}/></label>)}<button type="submit">Comparar<svg className="lucide lucide-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button></form>
 {valid?<ComparisonStudy key={JSON.stringify(q)} players={players} tour={tour} evolution={<HeadToHeadEvolution names={names as string[]} points={comparisonLeadTimeline(direct,names as string[],tour).map(p=>({match:toMatchRecord(p.match),wins:p.wins}))}/>} meetings={direct.map(toMatchRecord)} wins={names.map(name=>direct.filter(m=>comparisonPlayerWon(m,name!,tour)).length)}/>:<p role="status">Elige dos nombres distintos del directorio para comparar sus carreras.</p>}
 </HomeMotion>;
}
