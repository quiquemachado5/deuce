import Link from 'next/link';
import {cloudRead} from '@/lib/cloud-archive';
import {tourActivity,type TourActivity as Activity} from '@/lib/tour-activity';
import type {Match} from '@/lib/types';
import {modernTournamentCategory,visibleTournamentCategory} from '@/lib/tournament-tier';
export default async function TourActivity({matches}:{matches:Match[]}) {
  const activity=await cloudRead('tour-activity') as Activity|null;
  const events=tourActivity(activity,matches);
  if (!events.length) return null;
  const date=(at:string)=>new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(at));
  return <section className="ds-tour-section" aria-labelledby="ds-tour-title"><div className="dx-section-heading"><h2 id="ds-tour-title">Lo que se está jugando.</h2><Link href="/tournaments">Explorar torneos</Link></div>
    <div className="ds-tour-grid">{events.map(event=>{const year=new Date(event.fixtures[0].scheduledAt).getUTCFullYear();const category=visibleTournamentCategory(modernTournamentCategory(event.fixtures[0].tier,event.name,year),event.name,year);return <article key={event.id} className="ds-tour-card"><div><span className={`ds-event-state ${event.ongoing?'ds-event-ongoing':''}`}><i/>{event.ongoing?'En curso':'Próximos partidos'}</span>{category&&<span className="ds-tour-level">{category}</span>}</div><h3>{event.name.replace(/^ATP\s+/i,'')}</h3><p>{event.fixtures[0].players.join(' · ')}</p><span className="ds-tour-date">Programado: {date(event.fixtures[0].scheduledAt)} · Madrid</span><Link href={event.href}>Resultados del torneo</Link></article>})}</div><p className="ds-update-note">Consulta al proveedor: {date(activity!.checkedAt)}. Actualización diaria, no marcador en directo. «En curso» indica actividad observada en esta edición; los horarios pueden cambiar.{!activity!.complete?' Muestra parcial de partidos programados.':''}</p>
  </section>;
}
