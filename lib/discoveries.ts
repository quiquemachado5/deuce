import type { Match } from './types'
import { buildSeasonAnalytics, leaders, rankingMetrics } from './season-analytics'
import { archiveSummary, tournamentInsights } from './archive-insights'
import { metricDefinition, metricTopic } from './statistics-catalog'
import { tournamentName } from './labels'
import { TOURNAMENTS } from './types'

export type Discovery = { key:string; kind:'jugador'|'torneo'|'partido'|'archivo'; title:string; explanation:string; href:string; value:number; unit:string; player?:string; matchId?:string }
/** Every headline is backed by the same validated cohort as its destination. */
export function buildDiscoveries(matches:Match[]) {
 const analysis=buildSeasonAnalytics(matches)
 const stories:Discovery[]=[]
 for(const key of ['two-set-comebacks','top10-wins','five-set-wins','number-one-wins','matchpoint-rescues','fewer-points','thirty-all-games']) {
  const metric=rankingMetrics.find(m=>m.key===key)!
  const lead=leaders(analysis.players,metric,1)[0]
  if(!lead)continue
  stories.push({key,kind:'jugador',title:`${lead.player.name}: ${lead.value.toLocaleString('es-ES')}${metric.unit} · ${metric.label.toLowerCase()}`,explanation:`${metric.detail(lead.player)}. ${metricDefinition(metric)}`,href:`/patterns?metric=${key}`,value:lead.value,unit:metric.unit,player:lead.player.name})
 }
 const summary=archiveSummary(analysis.matches)
 for(const key of ['comeback-share','final-deciding-share','longest','most-games','youngest-champion','oldest-champion']){
  const row=summary.observations.find(x=>x.metric.key===key)
  if(!row)continue
  const subject=matches.find(m=>m.match_id===row.matchId)
  stories.push({key,kind:row.matchId?'partido':'archivo',title:`${subject?`${subject.player1.name} contra ${subject.player2.name}: `:''}${row.value.toLocaleString('es-ES')}${row.metric.unit} · ${row.metric.label.toLowerCase()}`,explanation:`${row.sample.toLocaleString('es-ES')} partidos con dato. ${row.metric.definition}`,href:row.matchId?`/match/${row.matchId}`:`/patterns?scope=archivo&metric=${key}`,value:row.value,unit:row.metric.unit,matchId:row.matchId})
 }
 const tournaments=tournamentInsights(analysis.matches)
 for(const key of ['tiebreak-share','comeback-share','games-average']){
  const rows=tournaments.flatMap(t=>{const observation=t.observations.find(o=>o.metric.key===key);return observation&&observation.sample>=100?[{t,...observation}]:[]}).sort((a,b)=>b.value-a.value)
  const lead=rows[0]
  if(!lead)continue
  const slug=TOURNAMENTS.find(t=>t.name===lead.t.name)?.slug
  stories.push({key:`tournament-${key}`,kind:'torneo',title:`${tournamentName(lead.t.name)}: ${lead.value.toLocaleString('es-ES')}${lead.metric.unit} · ${lead.metric.label.toLowerCase()}`,explanation:`${lead.sample.toLocaleString('es-ES')} partidos · ${lead.t.category}. ${lead.metric.definition}`,href:`/patterns?scope=torneos&metric=${key}${slug?`&tournament=${slug}`:''}&category=${encodeURIComponent(lead.t.category)}`,value:lead.value,unit:lead.metric.unit})
 }
 return stories
}

export function playerStatisticGroups(matches:Match[],name:string) {
 const record=buildSeasonAnalytics(matches.filter(m=>m.player1.name===name||m.player2.name===name)).players.find(p=>p.name===name)
 if(!record)return []
 return rankingMetrics.flatMap(metric=>{const value=metric.value(record);return value===null?[]:[{key:metric.key,topic:metricTopic(metric),label:metric.label,value,unit:metric.unit,detail:metric.detail(record),definition:metricDefinition(metric)}]})
}

export function seasonInsights(matches:Match[]) {
 const groups=new Map<number,Match[]>()
 for(const match of matches){const rows=groups.get(match.year)||[];rows.push(match);groups.set(match.year,rows)}
 return [...groups].sort(([a],[b])=>a-b).map(([year,rows])=>({year,...archiveSummary(rows)}))
}
