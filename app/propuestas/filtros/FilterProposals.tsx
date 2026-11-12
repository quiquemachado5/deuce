'use client';
import {useId,useRef,useState} from 'react';
import {Check,ChevronDown,SlidersHorizontal,X} from 'lucide-react';
import styles from './filters.module.css';
type Section='Partidos'|'Jugadores'|'Torneos';
type Tour='ATP'|'WTA';
type Selection={tour:Tour;query:string;category:string;extra:string};
const emptySelection=(tour:Tour):Selection=>({tour,query:'',category:'',extra:''});
const options=[
  {title:'Cápsula ligera',detail:'Circuitos visibles y filtros compactos.',variant:'capsule'},
  {title:'Un solo botón',detail:'Circuito y filtros en el mismo desplegable. La opción más compacta.',variant:'single'},
  {title:'Pestañas abiertas',detail:'Menos contenedores, más espacio para el contenido.',variant:'tabs'},
  {title:'Control integrado',detail:'Una sola pieza con el estado de los filtros visible.',variant:'integrated'},
] as const;
function CircuitButtons({tour,onChange}:{tour:Tour;onChange:(tour:Tour)=>void}){
  return <div className={styles.circuits} role="group" aria-label="Circuito">{(['ATP','WTA'] as const).map(value=><button type="button" key={value} aria-pressed={tour===value} onClick={()=>{if(value!==tour)onChange(value);}}>{value}</button>)}</div>;
}
function Proposal({section,variant}:{section:Section;variant:typeof options[number]['variant']}){
  const id=useId();
  const trigger=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false);
  const [selection,setSelection]=useState<Selection>(()=>emptySelection('ATP'));
  const [draft,setDraft]=useState(selection);
  const applied=[selection.query,selection.category,selection.extra].filter(Boolean).length;
  const filterLabel=applied===1?'1 filtro':`${applied} filtros`;
  const externalCircuit=variant==='capsule'||variant==='tabs';
  const categoryOptions=draft.tour==='ATP'?['Grand Slam','Masters 1000','ATP 500','ATP 250']:['Grand Slam','WTA 1000','WTA 500','WTA 250'];
  const close=()=>{setOpen(false);trigger.current?.focus();};
  return <div className={styles.example} data-variant={variant} onKeyDown={event=>{if(event.key==='Escape'&&open)close();}}>
    <div className={styles.controls}>
      {externalCircuit&&<CircuitButtons tour={selection.tour} onChange={tour=>{const next=emptySelection(tour);setSelection(next);setDraft(next);}}/>}
      <button ref={trigger} type="button" className={styles.trigger} aria-label={`Filtros de ${section.toLowerCase()}, circuito ${selection.tour}`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={()=>{if(open)close();else{setDraft(selection);setOpen(true);}}}>
        {variant==='single'?<><span>{selection.tour}</span><SlidersHorizontal size={18}/></>:variant==='integrated'?<><strong>{selection.tour}</strong><span>{applied?filterLabel:'Sin filtros'}</span><ChevronDown size={18}/></>:<><SlidersHorizontal size={18}/><span>Filtros</span></>}{applied>0&&variant!=='integrated'&&<small>{applied}</small>}
      </button>
    </div>
    {open&&<form className={styles.panel} id={`${id}-panel`} onSubmit={event=>{event.preventDefault();setSelection(draft);close();}}>
      <header><strong>Filtrar {section.toLowerCase()}</strong><button type="button" aria-label="Cerrar filtros" onClick={close}><X size={18}/></button></header>
      {!externalCircuit&&<CircuitButtons tour={draft.tour} onChange={tour=>setDraft(emptySelection(tour))}/>}
      <div className={styles.fields}>
        <label htmlFor={`${id}-query`}>{section==='Jugadores'?'Nombre':section==='Partidos'?'Jugador o torneo':'Torneo'}<input id={`${id}-query`} type="search" value={draft.query} onChange={event=>setDraft({...draft,query:event.target.value})} placeholder={section==='Jugadores'?'Buscar jugador':'Buscar'}/></label>
        <label htmlFor={`${id}-category`}>{section==='Jugadores'?'Ordenar por':'Categoría'}<select id={`${id}-category`} value={draft.category} onChange={event=>setDraft({...draft,category:event.target.value})}><option value="">{section==='Jugadores'?'Trayectoria':'Todas'}</option>{(section==='Jugadores'?['Nombre A–Z','Victorias','Efectividad']:categoryOptions).map(value=><option key={value}>{value}</option>)}</select></label>
        <label htmlFor={`${id}-extra`}>{section==='Jugadores'?'País':'Superficie'}<select id={`${id}-extra`} value={draft.extra} onChange={event=>setDraft({...draft,extra:event.target.value})}><option value="">{section==='Jugadores'?'Todos':'Todas'}</option>{(section==='Jugadores'?['España','Estados Unidos','Francia','Italia']:['Dura','Tierra','Hierba']).map(value=><option key={value}>{value}</option>)}</select></label>
      </div>
      <footer><button type="button" onClick={()=>setDraft(emptySelection(draft.tour))}>Restablecer</button><button type="submit">Aplicar <Check size={16}/></button></footer>
    </form>}
    <p className={styles.status} role="status">{selection.tour}{applied?` · ${filterLabel} ${applied===1?'aplicado':'aplicados'}`:' · Sin filtros'}</p>
  </div>;
}
export default function FilterProposals(){
  const [section,setSection]=useState<Section>('Partidos');
  return <div className={styles.page}>
    <header className={styles.heading}><h1>Filtros, con menos ruido.</h1><p>Cuatro opciones para probar en móvil y ordenador. Abre los filtros, cambia de circuito y aplica una selección.</p></header>
    <nav className={styles.sections} aria-label="Sección de la demostración">{(['Partidos','Jugadores','Torneos'] as const).map(value=><button type="button" key={value} aria-pressed={section===value} onClick={()=>setSection(value)}>{value}</button>)}</nav>
    <div className={styles.proposals}>{options.map(option=><section className={styles.proposal} key={option.variant}><div className={styles.description}><h2>{option.title}</h2><p>{option.detail}</p>{option.variant==='single'&&<span>Recomendada para móvil</span>}</div><div className={styles.preview}><h3>{section}</h3><Proposal key={`${section}-${option.variant}`} section={section} variant={option.variant}/></div></section>)}</div>
    <p className={styles.note}>Propuestas locales. Estas selecciones solo cambian la demostración; los filtros actuales siguen intactos.</p>
  </div>;
}
