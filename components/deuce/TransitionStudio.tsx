 'use client';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import styles from './transition-studio.module.css';
const effects=[{id:'soft',name:'Enfoque',description:'Fundido y desplazamiento breve.'},{id:'court',name:'Apertura central',description:'La nueva página se abre desde el centro.'},{id:'depth',name:'Profundidad',description:'La nueva página se acerca desde el fondo.'},{id:'curtain',name:'Barrido',description:'Relevo lateral entre las dos páginas.'}];
export function TransitionStudio(){
 return <div className={styles.studio}><p>Elige una transición y abre una sección. Se anima el cambio de página completo; después puedes seguir navegando con el menú.</p><div className={styles.options}>{effects.map(item=><section key={item.id}><h2>{item.name}</h2><p>{item.description}</p><nav aria-label={'Probar '+item.name}>{[{href:'/jugadores',name:'Jugadores'},{href:'/torneos',name:'Torneos'},{href:'/comparar',name:'Comparar'}].map(page=><Link key={page.href} href={page.href} data-motion={item.id}>{page.name}<ArrowUpRight size={18}/></Link>)}</nav></section>)}</div></div>;
}
