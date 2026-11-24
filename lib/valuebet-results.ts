import {resultContentHash,resultIdentity,type ResultObservation,type ResultTour} from './result-consensus'

type Fetcher=(input:string,init?:RequestInit)=>Promise<Response>
type CsvRow=Record<string,string>
const sourcePage='https://www.valuebetennis.com/en/donnees.htm'
const dataset=(year:string)=>`https://www.valuebetennis.com/datasets/valuebetennis-matchs-${year}.csv`

function fields(line:string){
 const values:string[]=[]
 let value='',quoted=false
 for(let index=0;index<line.length;index++){
  const character=line[index]
  if(character==='"'){
   if(quoted&&line[index+1]==='"'){value+='"';index++}else quoted=!quoted
  }else if(character===';'&&!quoted){values.push(value);value=''}else value+=character
 }
 values.push(value)
 return values
}

function rows(csv:string){
 const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean)
 if(!lines.length)return []
 const header=fields(lines[0])
 return lines.slice(1).map(line=>{const values=fields(line);return Object.fromEntries(header.map((key,index)=>[key,values[index]||''])) as CsvRow})
}

function playedOn(value:string){
 const direct=value.slice(0,10)
 if(/^\d{4}-\d{2}-\d{2}$/.test(direct))return direct
 const match=value.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
 return match?`${match[3]}-${match[2]}-${match[1]}`:''
}

function status(score:string):ResultObservation['status']{
 if(/w\/?o|walkover/i.test(score))return 'walkover'
 if(/ret|abandon/i.test(score))return 'retired'
 if(/def/i.test(score))return 'defaulted'
 return /\d+-\d+/.test(score)?'completed':'unknown'
}

export function valuebetObservation(row:CsvRow,retrievedAt:string):ResultObservation|null{
 const tour=row.genre?.toLowerCase() as ResultTour,day=playedOn(row.date||''),round=Number(row.tour)
 if((tour!=='atp'&&tour!=='wta')||!day||!Number.isInteger(round)||round<4)return null
 if(!['Main tour','Masters','Grand Chelem'].includes(row.categorie)&&!/finals/i.test(row.tournoi||''))return null
 const players:[string,string]=[row.joueur1?.trim(),row.joueur2?.trim()]
 const winnerId=row.vainqueur_id?.trim(),winner=winnerId===row.joueur1_id?.trim()?players[0]:winnerId===row.joueur2_id?.trim()?players[1]:''
 if(!players[0]||!players[1]||!winner)return null
 return {schema:1,source:'valuebetennis',sourceUrl:sourcePage,sourceId:row.match_id,retrievedAt,contentHash:resultContentHash(row),identity:resultIdentity(tour,day,players),tour,playedOn:day,tournament:row.tournoi?.trim()||'',level:row.categorie,round,players,winner,score:row.score?.trim()||'',status:status(row.score||'')}
}

export async function collectValuebetObservations(tour:ResultTour,dates:readonly string[],retrievedAt:string,fetcher:Fetcher=fetch){
 const wanted=new Set(dates),years=[...new Set(dates.map(date=>date.slice(0,4)))],observations:ResultObservation[]=[]
 for(const year of years){
  const response=await fetcher(dataset(year),{cache:'no-store',headers:{Accept:'text/csv,text/plain;q=0.9'},signal:AbortSignal.timeout(45_000)})
  if(!response.ok)throw new Error(`Valuebetennis CSV HTTP ${response.status}`)
  const length=Number(response.headers.get('content-length')||0)
  if(length>30_000_000)throw new Error('Valuebetennis CSV exceeds safety limit')
  const csv=await response.text()
  if(csv.length>30_000_000||!csv.replace(/^\uFEFF/,'').startsWith('match_id;date;'))throw new Error('Invalid Valuebetennis CSV response')
  for(const row of rows(csv)){
   const observation=valuebetObservation(row,retrievedAt)
   if(observation?.tour===tour&&wanted.has(observation.playedOn))observations.push(observation)
  }
 }
 return observations
}

export const VALUEBETENNIS_ATTRIBUTION='Valuebetennis, Tennis results and odds since 2021, https://www.valuebetennis.com/en/donnees.htm'

