import type {ResultConsensusEntry,ResultTour} from './result-consensus'

export type ResultDrawAudit={
 schema:1
 generatedAt:string
 editions:{tour:ResultTour;year:number;tournament:string;confirmed:number;terminal:number;hasFinal:boolean;complete:boolean|null;rounds:Record<string,number>;missing:string[]}[]
}

const grandSlamRounds:Record<number,number>={4:64,5:32,6:16,7:8,9:4,10:2,12:1}
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()

/** Draw arithmetic is evidence checking only; it never manufactures a match. */
export function auditConsensusDraws(entries:readonly ResultConsensusEntry[],generatedAt=new Date().toISOString()):ResultDrawAudit{
 const groups=new Map<string,ResultDrawAudit['editions'][number]&{grandSlam:boolean}>()
 for(const entry of entries){
  if(!entry.status.startsWith('confirmed')||!entry.accepted)continue
  const row=entry.accepted,year=Number(row.playedOn.slice(0,4)),key=[row.tour,year,normalized(row.tournament)].join('|')
  const edition=groups.get(key)||{tour:row.tour,year,tournament:row.tournament,confirmed:0,terminal:0,hasFinal:false,complete:null,rounds:{},missing:[],grandSlam:false}
  edition.confirmed++
  if(['walkover','retired','defaulted'].includes(row.status))edition.terminal++
  if(row.round){edition.rounds[String(row.round)]=(edition.rounds[String(row.round)]||0)+1;if(row.round===12)edition.hasFinal=true}
  edition.grandSlam||=row.level==='Grand Chelem'||row.level==='grand_slam'||entry.observations.some(observation=>observation.level==='Grand Chelem'||observation.level==='grand_slam')
  groups.set(key,edition)
 }
 return {schema:1,generatedAt,editions:[...groups.values()].map(({grandSlam,...edition})=>{
  if(!grandSlam||!edition.hasFinal)return edition
  const missing=Object.entries(grandSlamRounds).flatMap(([round,expected])=>{
   const difference=expected-(edition.rounds[round]||0)
   return difference>0?[`${difference} resultado${difference===1?'':'s'} · ronda ${round}`]:[]
  })
  const overfull=Object.entries(grandSlamRounds).some(([round,expected])=>(edition.rounds[round]||0)>expected)
  return {...edition,missing,complete:missing.length===0&&!overfull}
 }).sort((a,b)=>b.year-a.year||a.tour.localeCompare(b.tour)||a.tournament.localeCompare(b.tournament,'es'))}
}

