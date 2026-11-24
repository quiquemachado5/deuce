import {resultContentHash,resultIdentity,type ResultObservation,type ResultTour} from './result-consensus'

type Row=Record<string,unknown>
type Fetcher=(input:string,init?:RequestInit)=>Promise<Response>
const base='https://api.tennis/v1/matches'
const object=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{}
const text=(value:unknown)=>typeof value==='string'?value.trim():''
const roundNumber=(value:unknown)=>({r1:4,'round of 128':4,r2:5,'round of 64':5,r3:6,'round of 32':6,r16:7,'round of 16':7,rr:8,'round robin':8,qf:9,quarterfinal:9,quarterfinals:9,sf:10,semifinal:10,semifinals:10,f:12,final:12}[text(value).toLowerCase()]||null)

function payloadRows(value:unknown):Row[]{
 if(Array.isArray(value))return value.filter(row=>row&&typeof row==='object') as Row[]
 const payload=object(value),candidate=payload.data||payload.matches||payload.results
 return Array.isArray(candidate)?candidate.filter(row=>row&&typeof row==='object') as Row[]:[]
}

function score(row:Row,winnerIndex:number){
 const value=object(row.score),sets=Array.isArray(value.sets)?value.sets:Array.isArray(row.sets)?row.sets:[]
 return sets.flatMap(set=>Array.isArray(set)&&set.length>=2?[`${Number(set[winnerIndex])}-${Number(set[winnerIndex===0?1:0])}`]:[]).join(' ')
}

export function pointTennisObservation(row:Row,tour:ResultTour,retrievedAt:string):ResultObservation|null{
 const sourcePlayers=Array.isArray(row.players)?row.players.map(object):[object(row.player1),object(row.player2)]
 if(sourcePlayers.length<2)return null
 const players:[string,string]=[text(sourcePlayers[0].name),text(sourcePlayers[1].name)]
 const winnerObject=object(row.winner),winnerId=String(row.winner_id||winnerObject.id||''),winnerName=text(row.winner)||text(winnerObject.name)
 let winnerIndex=winnerName?players.findIndex(player=>player===winnerName):-1
 if(winnerIndex<0&&winnerId)winnerIndex=sourcePlayers.findIndex(player=>String(player.id||'')===winnerId)
 if(winnerIndex<0&&Number.isInteger(row.winner_index))winnerIndex=Number(row.winner_index)
 const playedOn=text(row.date||row.started_at||row.scheduled_at||row.updated_at).slice(0,10),statusText=text(row.status).toLowerCase()
 const status:ResultObservation['status']=/walkover|w\/?o/.test(statusText)?'walkover':/retired|abandoned/.test(statusText)?'retired':/default/.test(statusText)?'defaulted':/complete|finished|final/.test(statusText)?'completed':'unknown'
 const tournamentValue=object(row.tournament),tournament=text(row.tournament)||text(tournamentValue.name),round=roundNumber(row.round||row.round_name)
 if(!players[0]||!players[1]||winnerIndex<0||winnerIndex>1||!playedOn||!tournament||!round||status==='unknown')return null
 return {schema:1,source:'point-tennis',sourceUrl:'https://point.tennis/api',sourceId:String(row.match_id||row.id||resultContentHash(row).slice(0,24)),retrievedAt,contentHash:resultContentHash(row),identity:resultIdentity(tour,playedOn,players),tour,playedOn,tournament,level:text(row.category||row.tier)||undefined,round,players,winner:players[winnerIndex],score:score(row,winnerIndex),status}
}

export async function collectPointTennisObservations(tour:ResultTour,dates:readonly string[],retrievedAt:string,fetcher:Fetcher=fetch){
 const key=process.env.POINT_TENNIS_API_KEY
 if(!key)return {observations:[] as ResultObservation[],calls:0,configured:false}
 const observations:ResultObservation[]=[]
 for(const date of dates){
  const response=await fetcher(`${base}?date=${encodeURIComponent(date)}`,{cache:'no-store',headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},signal:AbortSignal.timeout(20_000)})
  if(!response.ok)throw new Error(`api.tennis HTTP ${response.status}`)
  for(const row of payloadRows(await response.json())){
   const rowTour=text(row.tour||row.circuit).toLowerCase()
   if(rowTour&&rowTour!==tour)continue
   const observation=pointTennisObservation(row,tour,retrievedAt)
   if(observation)observations.push(observation)
  }
 }
 return {observations,calls:dates.length,configured:true}
}

