import {createHash} from 'node:crypto'
import type {Season} from './result-refresh'
import {resolveResultConsensus,resultContentHash,resultIdentity,type ResultObservation} from './result-consensus'
import {collectValuebetObservations} from './valuebet-results'
import {collectPointTennisObservations} from './point-tennis-results'

type Tour='atp'|'wta'
type Row=Record<string,unknown>
type Page={data?:Row[];hasNextPage?:boolean;pageNo?:number;pageSize?:number;page?:number;limit?:number}
type Fetcher=(input:string,init?:RequestInit)=>Promise<Response>

const host='tennis-api-atp-wta-itf.p.rapidapi.com'
const base=`https://${host}/tennis/v2`

export function bulkDailyResultsConfigured(){
 return Boolean(process.env.TENNIS_RESULTS_API_KEY||process.env.RAPIDAPI_KEY)
}

const day=(date:Date,offset:number)=>new Date(date.getTime()+offset*86_400_000).toISOString().slice(0,10)
const text=(value:unknown)=>typeof value==='string'?value.trim():''
const object=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{}

function surface(value:unknown,id:unknown){
 const label=text(value).toLowerCase()
 if(label.includes('clay'))return 'clay'
 if(label.includes('grass'))return 'grass'
 if(label.includes('carpet'))return 'carpet'
 if(label.includes('hard'))return 'hard'
 return Number(id)===2?'clay':Number(id)===5?'grass':Number(id)===1||Number(id)===3?'hard':null
}

function tier(value:unknown,rankId:unknown,tour:Tour){
 const label=text(value).toLowerCase().replace(/[^a-z0-9]+/g,' ')
 if(label.includes('grand slam')||Number(rankId)===4)return 'grand_slam'
 if(label.includes('finals')||Number(rankId)===7)return tour==='atp'?'atp_finals':'wta_finals'
 if(label.includes('1000')||label.includes('masters')||Number(rankId)===3)return tour==='atp'?'atp_1000':'wta_1000'
 if(label.includes('500'))return tour==='atp'?'atp_500':'wta_500'
 if(label.includes('250'))return tour==='atp'?'atp_250':'wta_250'
 return null
}

function round(value:unknown){
 return ({4:'Primera ronda',5:'Segunda ronda',6:'Tercera ronda',7:'Octavos de final',8:'RR',9:'QF',10:'SF',11:'Tercer puesto',12:'F'} as Record<string,string>)[String(value)]||''
}

function games(score:unknown){
 const pairs=[...text(score).matchAll(/(?:^|\s)(\d+)-(\d+)(?:\([^)]*\))?/g)].map(match=>[Number(match[1]),Number(match[2])])
 return [pairs.map(pair=>pair[0]),pairs.map(pair=>pair[1])]
}

function stableId(tour:Tour,row:Row){
 const tournament=object(row.tournament),players=[object(row.player1),object(row.player2)]
  .map(player=>String(player.id||player.name||'').toLowerCase()).sort()
 const identity=[tour,row.tournamentId||tournament.id,row.roundId,text(row.date).slice(0,10),...players].join('|')
 const hash=createHash('sha256').update(identity).digest().readUIntBE(0,6)
 return String(7_000_000_000_000_000+hash)
}

function apiObservation(row:Row,tour:Tour,calendar:Map<string,Row>,retrievedAt:string):ResultObservation|null{
 const tournament=object(row.tournament),calendarRow=calendar.get(String(row.tournamentId||tournament.id))||{}
 const player1=object(row.player1),player2=object(row.player2),players:[string,string]=[text(player1.name),text(player2.name)]
 const playedOn=text(row.date).slice(0,10),roundId=Number(row.roundId),resultType=text(row.result_type).toLowerCase()
 if(!playedOn||!players[0]||!players[1]||!Number.isInteger(roundId)||roundId<4)return null
 const status:ResultObservation['status']=resultType==='retired'?'retired':/walkover|w\/?o/.test(resultType)||/walkover|w\/?o/i.test(text(row.result))?'walkover':resultType==='defaulted'?'defaulted':resultType==='completed'?'completed':'unknown'
 if(status==='unknown')return null
 const resultRank=object(tournament.rank),calendarRank=object(calendarRow.rank)
 const level=tier(calendarRow.tier||calendarRank.name||tournament.tier||resultRank.name||tournament.level,tournament.rankId||calendarRow.rankId||calendarRank.id||resultRank.id,tour)||undefined
 return {schema:1,source:'tennis-api-results',sourceUrl:'https://docs.tennis-api.com/results',sourceId:String(row.liveMatchId||row.matchKey||row.matchId||row.id||stableId(tour,row)),retrievedAt,contentHash:resultContentHash(row),identity:resultIdentity(tour,playedOn,players),tour,playedOn,tournament:text(tournament.name)||text(calendarRow.name),level,round:roundId,players,winner:players[0],score:text(row.result),status}
}

export function normalizeBulkResult(row:Row,tour:Tour,calendar:Map<string,Row>,retrievedAt:string){
 const tournament=object(row.tournament),calendarRow=calendar.get(String(row.tournamentId||tournament.id))||{}
 const calendarRank=object(calendarRow.rank),calendarCourt=object(calendarRow.court),resultRank=object(tournament.rank),resultCourt=object(tournament.court)
 const level=tier(calendarRow.tier||calendarRank.name||tournament.tier||resultRank.name||tournament.level,tournament.rankId||calendarRow.rankId||calendarRank.id||resultRank.id,tour)
 const roundCode=round(row.roundId),player1=object(row.player1),player2=object(row.player2),score=games(row.result)
 const resultType=text(row.result_type).toLowerCase()
 const playedAt=text(row.date),name=text(tournament.name)||text(calendarRow.name)
 if(!level||!roundCode||!playedAt||!name||!text(player1.name)||!text(player2.name)||!score[0].length)return null
 if(!['completed','retired'].includes(resultType))return null
 const sets=[0,0]
 for(let index=0;index<score[0].length;index++){
  const first=score[0][index],second=score[1][index]
  if(first>second)sets[0]++;else if(second>first)sets[1]++
 }
 return {
  id:stableId(tour,row),external_id:String(row.liveMatchId||row.matchKey||row.matchId||row.id||''),_deuce_provider:'tennis-api-results',
  _deuce_retrieved_at:retrievedAt,created_at:retrievedAt,updated_at:retrievedAt,result_restated_at:retrievedAt,result_version:1,
  tour,gender:tour==='atp'?'men':'women',draw:'singles',is_doubles:false,is_qualifying:false,tier:level,tier_source:'results-calendar',
  tournament:name,tournament_id:String(row.tournamentId||tournament.id||calendarRow.id||''),
  scheduled_time:playedAt.includes('T')?playedAt:`${playedAt}T12:00:00Z`,surface:surface(calendarCourt.name||resultCourt.name||tournament.court,calendarCourt.id||resultCourt.id||tournament.courtId),
  indoor:/indoor/i.test(text(calendarCourt.name||resultCourt.name||tournament.court)),round_code:roundCode,round:roundCode,
  format:String(row.best_of)==='5'?'BO5':'BO3',status:resultType,outcome:resultType,winner:1,event_status:resultType==='retired'?'Retired':'Finished',
  players:{
   p1:{id:player1.id??row.player1Id,name:text(player1.name),country:text(player1.countryAcr).toLowerCase(),tour,is_doubles_team:false},
   p2:{id:player2.id??row.player2Id,name:text(player2.name),country:text(player2.countryAcr).toLowerCase(),tour,is_doubles_team:false},
  },
  score:{sets,games:score,points:[],server:null,is_tiebreak:false,timestamp:playedAt.includes('T')?playedAt:`${playedAt}T12:00:00Z`,origin:'results'},
 } satisfies Row
}

export async function collectBulkDailyResults(tour:Tour,previous:Season,now=new Date(),fetcher:Fetcher=fetch,pause:(milliseconds:number)=>Promise<void>=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds)),evidenceFetcher:Fetcher=fetch){
 const key=process.env.TENNIS_RESULTS_API_KEY||process.env.RAPIDAPI_KEY
 if(!key)throw new Error('Bulk daily tennis results are not configured')
 const repairDays=Math.max(2,Math.min(14,Number(process.env.DEUCE_RESULT_REPAIR_DAYS||7)||7))
 const dates=Array.from({length:repairDays},(_,index)=>day(now,-1-index)),years=[...new Set(dates.map(value=>value.slice(0,4)))]
 let calls=0,lastCall=0
 const request=async(path:string)=>{
  const wait=Math.max(0,275-(Date.now()-lastCall));if(wait)await pause(wait)
  const response=await fetcher(`${base}${path}`,{headers:{'X-RapidAPI-Key':key,'X-RapidAPI-Host':host},cache:'no-store',signal:AbortSignal.timeout(20_000)})
  calls++;lastCall=Date.now()
  if(!response.ok)throw new Error(`Bulk tennis results HTTP ${response.status}`)
  const payload=await response.json() as Page
  if(!Array.isArray(payload.data))throw new Error('Invalid bulk tennis results response')
  return payload
 }
 const calendar=new Map<string,Row>()
 for(const year of years){
  for(let pageNo=1;pageNo<=10;pageNo++){
   const page=await request(`/${tour}/tournament/calendar/${year}?pageSize=500&pageNo=${pageNo}`)
   for(const row of page.data||[])if(row.id!==undefined)calendar.set(String(row.id),row)
   if(page.hasNextPage!==true)break
   if(pageNo===10)throw new Error('Bulk tennis calendar pagination exceeded safety limit')
  }
 }
 const retrievedAt=now.toISOString(),candidates:Row[]=[],apiObservations:ResultObservation[]=[]
 for(const date of dates){
  for(let pageNo=1;pageNo<=10;pageNo++){
   const page=await request(`/${tour}/results/${date}?pageSize=500&pageNo=${pageNo}&filter=PlayerGroup%3Asingles`)
   for(const source of page.data||[]){
    const observation=apiObservation(source,tour,calendar,retrievedAt)
    const normalized=normalizeBulkResult(source,tour,calendar,retrievedAt)
    if(observation){
     if(normalized)observation.providerRow=normalized
     apiObservations.push(observation)
    }
    if(normalized)candidates.push(normalized)
   }
   if(page.hasNextPage!==true)break
   if(pageNo===10)throw new Error('Bulk tennis result pagination exceeded safety limit')
  }
 }
 let evidence:ResultObservation[]=[],evidenceError:string|undefined,point:ResultObservation[]=[],pointError:string|undefined,pointCalls=0
 try{evidence=await collectValuebetObservations(tour,dates,retrievedAt,evidenceFetcher)}catch(error){evidenceError=error instanceof Error?error.message:'Valuebetennis evidence failed'}
 try{const result=await collectPointTennisObservations(tour,dates,retrievedAt,evidenceFetcher);point=result.observations;pointCalls=result.calls}catch(error){pointError=error instanceof Error?error.message:'api.tennis evidence failed'}
 const consensus=resolveResultConsensus([...apiObservations,...evidence,...point])
 const fresh:Row[]=consensus.flatMap(entry=>entry.accepted?.providerRow?[{...entry.accepted.providerRow,
  _deuce_result_source:entry.accepted.sourceUrl,
  _deuce_evidence_sources:[...new Set(entry.observations.map(observation=>observation.sourceUrl))],
  _deuce_consensus_status:entry.status,
 } as Row]:[])
 const merged=new Map<string,Row>()
 for(const row of previous?.data||[])merged.set(String(row.id),row)
 for(const row of fresh)merged.set(String(row.id),row)
 return {data:[...merged.values()],fresh,scope:`${tour}-main-v2` as const,at:retrievedAt,calls,dates,provider:'multi-source-results' as const,consensus,evidence:{providers:['valuebetennis','point-tennis'] as const,observations:evidence.length+point.length,error:evidenceError||pointError,valuebetennis:{observations:evidence.length,error:evidenceError},pointTennis:{observations:point.length,calls:pointCalls,error:pointError,configured:Boolean(process.env.POINT_TENNIS_API_KEY)}},candidates:candidates.length}
}
