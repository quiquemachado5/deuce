'use client';

import {useEffect,useState,type CSSProperties,type DragEvent} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowDown,ArrowRight,ArrowUp,GripVertical,KeyRound,RotateCcw,Search,Share2,Trophy,X} from 'lucide-react';
import styles from './game.module.css';

type Match={id:string;players:string;year:number;round:string;tournament:string;logo:string;href:string};
type ArchiveItem={date:string;status:'won'|'lost'|'playing'|'open'};
type Stats={played:number;wins:number;winRate:number;averageAttempts:number;currentStreak:number;bestStreak:number;favoriteTournament:{name:string;wins:number}|null;totalPlayers:number};
type Visual={src:string;credit:string;position:string;mobilePosition:string};
type Editorial={headline:string;summary:string;moment:string|null;winner:string;score:string;duration:string|null};
type Performance={position:number|null;total:number;topPercent:number|null};
type State={date:string;today:string;isToday:boolean;name:string;guesses:Match[];comparisons:string[];feedback:string|null;won:boolean;finished:boolean;clues:string[];answer:Match|null;visual:Visual|null;editorial:Editorial|null;votes:string[];selectedVotes:Match[];ranking:(Match&{count:number;percent:number})[];totalVoters:number;performance:Performance;stats:Stats;archive:ArchiveItem[]};

const dayLabel=(date:string,wide=false)=>new Intl.DateTimeFormat('es-ES',wide?{day:'numeric',month:'long'}:{day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00Z`));

function MatchPicker({onPick,exclude=[],placeholder='Jugador, torneo, ronda o año'}:{onPick:(match:Match)=>void;exclude?:string[];placeholder?:string}){
 const [query,setQuery]=useState(''),[results,setResults]=useState<{query:string;items:Match[]}>({query:'',items:[]}),[open,setOpen]=useState(false);
 useEffect(()=>{if(query.trim().length<2)return;const controller=new AbortController(),timer=setTimeout(()=>{fetch(`/api/juego/buscar?q=${encodeURIComponent(query)}`,{signal:controller.signal}).then(async response=>{const data=await response.json();if(!controller.signal.aborted)setResults({query,items:response.ok&&Array.isArray(data)?data:[]});}).catch(()=>{if(!controller.signal.aborted)setResults({query,items:[]});});},180);return()=>{clearTimeout(timer);controller.abort();};},[query]);
 const loading=query.trim().length>=2&&results.query!==query,options=loading?[]:results.items.filter(match=>!exclude.includes(match.id));
 return <div className={styles.picker}><div className={styles.searchBox}><Search size={20} aria-hidden="true"/><input role="combobox" aria-expanded={open&&query.length>=2} aria-controls="match-suggestions" aria-autocomplete="list" aria-label={placeholder} value={query} placeholder={placeholder} onChange={event=>{setQuery(event.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}/></div>{open&&query.length>=2&&<div className={styles.suggestions} id="match-suggestions" role="listbox">{options.length?options.map(match=><button type="button" role="option" aria-selected="false" key={match.id} onClick={()=>{onPick(match);setQuery('');setOpen(false);}}><Image src={match.logo} alt="" width={44} height={44}/><span><strong>{match.players}</strong><small>{match.tournament} · {match.year} · {match.round}</small></span></button>):<p>{loading?'Buscando en el archivo…':'Sin resultados. Prueba jugadores, torneo, ronda y año.'}</p>}</div>}</div>;
}

function MiniMatch({match,remove}:{match:Match;remove?:()=>void}){
 return <div className={styles.miniMatch}><Image src={match.logo} alt="" width={42} height={42}/><span><strong>{match.players}</strong><small>{match.tournament} · {match.year} · {match.round}</small></span>{remove&&<button type="button" onClick={remove} aria-label={`Quitar ${match.players}`}><X size={17}/></button>}</div>;
}

function VictoryMoment(){return <div className={styles.victoryMoment} aria-hidden="true"><div className={styles.victoryLight}/><div className={styles.victoryWord}>ACIERTO</div><div className={styles.victoryPulse}/></div>;}

function VisualClue({state}:{state:State}){
 if(!state.visual)return null;
 const reveal=state.finished?5:Math.min(4,state.guesses.length),style={'--visual-blur':`${[16,12,8,5,2,0][reveal]}px`,'--visual-scale':String([1.14,1.11,1.08,1.05,1.02,1][reveal]),'--visual-position':state.visual.position,'--visual-position-mobile':state.visual.mobilePosition} as CSSProperties;
 return <figure className={styles.visualClue} style={style} data-finished={state.finished||undefined}><Image src={state.visual.src} alt={state.finished&&state.answer?`Pista de ${state.answer.tournament}`:'Pista visual del partido oculto'} fill sizes="(max-width:800px) 100vw, 48vw" priority/><span aria-hidden="true"/>{state.finished&&<figcaption>{state.visual.credit}</figcaption>}</figure>;
}

function EditorialResult({editorial}:{editorial:Editorial}){
 return <article className={styles.editorialResult}><h4>{editorial.headline}</h4><p>{editorial.summary}{editorial.duration?` Duró ${editorial.duration}.`:''}</p>{editorial.moment&&<blockquote>{editorial.moment}</blockquote>}</article>;
}

function DailyStanding({performance,won}:{performance:Performance;won:boolean}){
 return <div className={styles.rankingSummary}><Trophy size={19}/>{won&&performance.position?<p><strong>#{performance.position} hoy</strong><span>Entre el {performance.topPercent}% mejor de {performance.total}.</span></p>:<p><strong>Clasificación diaria</strong><span>{performance.total?'Termina para entrar.':'Sé el primero en resolverlo.'}</span></p>}</div>;
}

function PersonalProgress({state,busy,onSelect}:{state:State;busy:boolean;onSelect:(date:string)=>void}){
 const stats=state.stats;
 return <section className={styles.progressSection} aria-labelledby="progress-title"><div className={styles.progressHeader}><h2 id="progress-title">Tu juego, {state.name}.</h2></div><div className={styles.statsRail}><div><strong>{stats.currentStreak}</strong><span>Racha</span></div><div><strong>{stats.winRate}%</strong><span>Aciertos</span></div><div><strong>{stats.averageAttempts||'—'}</strong><span>Intentos</span></div></div><div className={styles.archiveHeader}><h3>Retos recientes</h3></div><div className={styles.archiveStrip}>{state.archive.map(item=><button type="button" key={item.date} data-status={item.status} data-selected={item.date===state.date||undefined} disabled={busy} onClick={()=>onSelect(item.date)} aria-label={`${dayLabel(item.date,true)}. ${item.status==='won'?'Acertado':item.status==='lost'?'No acertado':item.status==='playing'?'En curso':'Sin jugar'}`}><span>{item.date===state.today?'Hoy':dayLabel(item.date)}</span><i aria-hidden="true"/></button>)}</div></section>;
}

function BallotChoice({match,index,total,onRemove,onMove,onDragStart,onDrop}:{match:Match;index:number;total:number;onRemove:()=>void;onMove:(direction:-1|1)=>void;onDragStart:(event:DragEvent<HTMLDivElement>)=>void;onDrop:(event:DragEvent<HTMLDivElement>)=>void}){
 return <div className={styles.ballotChoice} draggable onDragStart={onDragStart} onDragOver={event=>event.preventDefault()} onDrop={onDrop}><span className={styles.podiumPosition}>{index+1}</span><GripVertical className={styles.dragHandle} size={18} aria-hidden="true"/><div className={styles.ballotMatch}><MiniMatch match={match} remove={onRemove}/></div><div className={styles.orderActions}><button type="button" disabled={index===0} onClick={()=>onMove(-1)} aria-label={`Subir ${match.players}`}><ArrowUp size={16}/></button><button type="button" disabled={index===total-1} onClick={()=>onMove(1)} aria-label={`Bajar ${match.players}`}><ArrowDown size={16}/></button></div></div>;
}

export default function Game(){
 const [name,setName]=useState(''),[active,setActive]=useState(false),[state,setState]=useState<State|null>(null),[selected,setSelected]=useState<Match|null>(null),[ballot,setBallot]=useState<Match[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[initializing,setInitializing]=useState(true),[shareStatus,setShareStatus]=useState(''),[reaction,setReaction]=useState<'miss'|'hit'|null>(null),[dragIndex,setDragIndex]=useState<number|null>(null),[recovering,setRecovering]=useState(false),[recoveryInput,setRecoveryInput]=useState('');

 useEffect(()=>{let cancelled=false;(async()=>{try{const stored=localStorage.getItem('deuce-game-name')||'',query=new URLSearchParams();if(stored)query.set('name',stored);let response=await fetch(`/api/juego?${query}`),data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo cargar el juego.');if(stored){response=await fetch('/api/juego',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',name:stored,date:data.date})});data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo abrir tu perfil.');}if(cancelled)return;setState(data);if(stored){setName(data.name||stored);setActive(true);}}catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:'No se pudo cargar el juego.');}finally{if(!cancelled)setInitializing(false);}})();return()=>{cancelled=true;};},[]);

 async function request(action:string,extra:Record<string,unknown>={}){
  const response=await fetch('/api/juego',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,name,date:state?.date,...extra})}),data=await response.json();
  if(!response.ok)throw new Error(data.error||'No se pudo guardar.');
  setState(data);return data as State;
 }
 async function submit(action:'guess'|'vote',ids:string[]){
  setBusy(true);setError('');
  try{const data=await request(action,action==='guess'?{id:ids[0]}:{ids});setSelected(null);if(action==='vote')setBallot([]);else setReaction(data.won?'hit':'miss');}
  catch(cause){setError(cause instanceof Error?cause.message:'Error de conexión.');}finally{setBusy(false);}
 }
 async function start(){
  const cleaned=name.trim();if(cleaned.length<2){setError('Escribe al menos dos caracteres.');return;}setBusy(true);setError('');
  try{const data=await request('start');setName(data.name||cleaned);setActive(true);localStorage.setItem('deuce-game-name',data.name||cleaned);}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo abrir tu perfil.');}finally{setBusy(false);}
 }
 async function recoverProfile(){
  setBusy(true);setError('');
  try{const data=await request('recover',{code:recoveryInput});setName(data.name);setActive(true);setRecovering(false);localStorage.setItem('deuce-game-name',data.name);}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo recuperar el perfil.');}finally{setBusy(false);}
 }
 async function loadDate(date:string){
  if(!state||date===state.date)return;setBusy(true);setError('');setReaction(null);setSelected(null);
  try{const response=await fetch(`/api/juego?name=${encodeURIComponent(name)}&date=${date}`),data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo abrir el reto.');setState(data);window.history.replaceState(null,'','/juego');document.getElementById('reto')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo abrir el reto.');}finally{setBusy(false);}
 }
 async function replay(){
  setBusy(true);setError('');
  try{await request('reset');setSelected(null);setReaction(null);setShareStatus('');}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo reiniciar.');}finally{setBusy(false);}
 }
 async function shareResult(){
  if(!state)return;const date=dayLabel(state.date,true),result=state.won?`Lo acerté en ${state.guesses.length} ${state.guesses.length===1?'intento':'intentos'}.`:'Hoy no lo acerté.',text=`DEUCE · ${date}\n${result}\n¿Reconoces el partido?`,url=`${window.location.origin}/juego`;
  try{if(navigator.share&&window.matchMedia('(pointer:coarse)').matches){await navigator.share({title:'Juego de DEUCE',text,url});setShareStatus('Compartido');}else{await navigator.clipboard.writeText(`${text}\n${url}`);setShareStatus('Resultado copiado');}}
  catch(cause){if(cause instanceof Error&&cause.name!=='AbortError'){setShareStatus('No se pudo compartir.');}}
 }
 function moveBallot(from:number,to:number){if(to<0||to>=ballot.length)return;const next=[...ballot],[item]=next.splice(from,1);next.splice(to,0,item);setBallot(next);}
 const tries=state?.guesses.length||0,picked=new Set(ballot.map(match=>match.id)),title=state?.isToday!==false?'El partido de hoy.':`El partido del ${dayLabel(state?.date||'',true)}.`;

 if(initializing)return <main className={styles.page} aria-busy="true"><div className={styles.content}><header className={styles.gameIntro}><h1>El partido de hoy.</h1><p>Cinco pistas. Un partido.</p></header><div className={styles.loadingGame} role="status"><span/><p>Preparando el partido…</p></div></div></main>;

 return <main className={styles.page}>{reaction==='hit'&&<VictoryMoment/>}<div className={styles.content}>
  <header className={styles.gameIntro}><h1 id="daily-title">{title}</h1><p>Cinco pistas. Un partido.</p></header>
  <section className={styles.challenge} id="reto" aria-labelledby="daily-title">
   {!active?<div className={styles.namePanel}><div><h3>{recovering?'Recupera tu perfil':'¿Cómo te llamas?'}</h3><p>{recovering?'Introduce tu código privado de doce caracteres.':'Tu nombre se guarda en este dispositivo.'}</p></div>{recovering?<div className={styles.recoveryForm}><input value={recoveryInput} onChange={event=>setRecoveryInput(event.target.value.toUpperCase())} onKeyDown={event=>{if(event.key==='Enter')recoverProfile();}} placeholder="XXXX-XXXX-XXXX" aria-label="Código privado"/><button type="button" disabled={busy||recoveryInput.replace(/[^A-Z0-9]/gi,'').length!==12} onClick={recoverProfile}>Recuperar <ArrowRight size={18}/></button><button type="button" className={styles.backAction} onClick={()=>setRecovering(false)}>Volver</button></div>:<div><div className={styles.nameForm}><input maxLength={40} value={name} onChange={event=>setName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')start();}} placeholder="Tu nombre" aria-label="Tu nombre"/><button onClick={start} disabled={busy}>Empezar <ArrowRight size={18}/></button></div><button type="button" className={styles.recoverAction} onClick={()=>setRecovering(true)}><KeyRound size={16}/> Recuperar perfil</button></div>}</div>:
   <div className={styles.gameGrid}><div className={styles.cluePanel}><div className={styles.clueHeading}><h3>Pistas</h3><strong>{state?.clues.length||0} de 5</strong></div><div className={styles.clueProgress} aria-hidden="true">{Array.from({length:5},(_,index)=><span key={index} data-active={index<(state?.clues.length||0)||undefined}/>)}</div>{state&&<VisualClue state={state}/>}<ol>{state?.clues.map((clue,index)=><li key={index} className={reaction&&index===state.clues.length-1?styles.newClue:undefined}><span aria-hidden="true"/><p>{clue}</p></li>)}</ol></div>
   <div className={styles.guessPanel} data-reaction={reaction||undefined} key={`${state?.date}-${tries}`}>{state?.finished?<div className={styles.result}><h3>{state.won?'Lo has acertado.':'El partido era…'}</h3>{state.answer&&<MiniMatch match={state.answer}/>}<DailyStanding performance={state.performance} won={state.won}/>{state.editorial&&<EditorialResult editorial={state.editorial}/>}<div className={styles.resultActions}>{state.answer&&<Link href={state.answer.href}>Ver el partido <ArrowRight size={18}/></Link>}<button className={styles.shareButton} onClick={shareResult}><Share2 size={18}/> Compartir</button>{process.env.NODE_ENV!=='production'&&<button className={styles.replayButton} onClick={replay} disabled={busy}><RotateCcw size={17}/> Repetir</button>}</div><span className={styles.shareStatus} role="status">{shareStatus}</span></div>:<><h3>Tu respuesta</h3><MatchPicker onPick={setSelected} exclude={state?.guesses.map(match=>match.id)||[]}/>{selected&&<MiniMatch match={selected} remove={()=>setSelected(null)}/>}<button className={styles.submit} disabled={!selected||busy} onClick={()=>selected&&submit('guess',[selected.id])}>Probar partido <ArrowRight size={18}/></button>{reaction==='miss'&&state?.feedback&&<div className={styles.comparisonFeedback} role="status"><strong>No era ese.</strong><p>{state.feedback}</p></div>}</>}{reaction==='hit'&&<p className={styles.reactionText} role="status">Gran lectura. Has acertado.</p>}{reaction==='miss'&&state?.finished&&<p className={styles.reactionText} role="status">Se acabaron los intentos. Mañana habrá otro partido.</p>}{!state?.finished&&!!state?.guesses.length&&<div className={styles.history}>{state.guesses.map(match=><div key={match.id}><span className={styles.historyMark}>×</span><span>{match.players}</span></div>)}</div>}</div></div>}
   {error&&<p className={styles.error} role="alert">{error}</p>}
  </section>
  {active&&state&&<PersonalProgress state={state} busy={busy} onSelect={loadDate}/>}
  <section className={styles.voting} aria-labelledby="vote-title"><header className={styles.voteHeading}><h2 id="vote-title">Los partidos que se quedan.</h2><p>Ordena tus tres favoritos.</p></header><div className={styles.voteGrid}><div className={styles.ballot}><h3>Tu podio</h3>{!active?<p>Escribe tu nombre arriba para votar.</p>:state?.votes.length===3?<div className={styles.savedVotes}>{state.selectedVotes.map((match,index)=><div key={match.id} className={styles.savedVote}><span>{index+1}</span><Link href={match.href}><MiniMatch match={match}/></Link></div>)}</div>:<><div className={styles.slots}>{ballot.map((match,index)=><BallotChoice key={match.id} match={match} index={index} total={ballot.length} onRemove={()=>setBallot(ballot.filter(item=>item.id!==match.id))} onMove={direction=>moveBallot(index,index+direction)} onDragStart={event=>{setDragIndex(index);event.dataTransfer.effectAllowed='move';}} onDrop={event=>{event.preventDefault();if(dragIndex!==null)moveBallot(dragIndex,index);setDragIndex(null);}}/>)}</div>{ballot.length<3&&<MatchPicker onPick={match=>{if(!picked.has(match.id))setBallot([...ballot,match]);}} exclude={[...picked]} placeholder="Añade un partido"/>}<button className={styles.submit} disabled={ballot.length!==3||busy} onClick={()=>submit('vote',ballot.map(match=>match.id))}>Guardar podio <ArrowRight size={18}/></button></>}</div><div className={styles.ranking}><h3>Los más votados</h3>{state?.ranking.length?state.ranking.map((match,index)=><Link key={match.id} href={match.href}><span className={styles.rankPosition}>{index+1}</span><Image src={match.logo} alt="" width={44} height={44}/><span><strong>{match.players}</strong><small>{match.tournament} · {match.year}</small></span><em>{match.percent}%</em></Link>):<p className={styles.empty}>Todavía no hay votos.</p>}</div></div></section>
 </div></main>;
}
