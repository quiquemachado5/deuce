import test from 'node:test'
import assert from 'node:assert/strict'
import {collectBulkDailyResults,normalizeBulkResult} from '../lib/daily-results'

const calendar=new Map([['91',{id:91,name:'Australian Open',tier:'Grand Slam',court:{id:1,name:'Hard'}}]])

test('bulk result rows become stable closed provider rows',()=>{
 const source={matchId:12,liveMatchId:'3-4-91-4',date:'2026-01-19T10:00:00Z',roundId:4,tournamentId:91,result:'6-3 7-6(5)',result_type:'completed',best_of:'5',player1:{id:3,name:'Winner',countryAcr:'ESP'},player2:{id:4,name:'Loser',countryAcr:'ITA'},tournament:{id:91,name:'Australian Open',rankId:4,courtId:1}}
 const first=normalizeBulkResult(source,'atp',calendar,'2026-01-20T09:20:00Z')!
 const second=normalizeBulkResult({...source,matchId:999},'atp',calendar,'2026-01-21T09:20:00Z')!
 assert.equal(first.id,second.id)
 assert.equal(first.tier,'grand_slam')
 assert.equal(first.round_code,'Primera ronda')
 assert.deepEqual((first.score as {games:number[][]}).games,[[6,7],[3,6]])
 assert.equal(first.winner,1)
})

test('bulk daily collection fetches yesterday and the correction day without live calls',async()=>{
 const previous=process.env.TENNIS_RESULTS_API_KEY
 const previousDays=process.env.DEUCE_RESULT_REPAIR_DAYS
 process.env.TENNIS_RESULTS_API_KEY='test-key'
 process.env.DEUCE_RESULT_REPAIR_DAYS='2'
 const urls:string[]=[]
 const fetcher=async(input:string)=>{
  urls.push(input)
  const payload=input.includes('/tournament/calendar/')
   ?{data:[...calendar.values()],hasNextPage:false}
   :{data:[{matchId:12,date:input.includes('2026-01-19')?'2026-01-19T10:00:00Z':'2026-01-18T10:00:00Z',roundId:4,tournamentId:91,result:'6-3 6-4',result_type:'completed',best_of:'5',player1:{id:3,name:'Winner'},player2:{id:4,name:'Loser'},tournament:{id:91,name:'Australian Open',rankId:4,courtId:1}}],hasNextPage:false}
  return new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}})
 }
 try{
  const evidence=async()=>new Response(`match_id;date;tournoi;tournoi_id;categorie;genre;surface;tour;joueur1;joueur1_id;joueur2;joueur2_id;cote1_ouverture;cote2_ouverture;cote1_cloture;cote2_cloture;vainqueur_id;score;duree_min
v1;"2026-01-19 10:00:00";"Australian Open";91;Grand Chelem;atp;dur;4;Winner;3;Loser;4;;;;;3;"6-3 6-4";
v2;"2026-01-18 10:00:00";"Australian Open";91;Grand Chelem;atp;dur;4;Winner;3;Loser;4;;;;;3;"6-3 6-4";
`,{status:200,headers:{'content-type':'text/csv'}})
  const result=await collectBulkDailyResults('atp',{data:[]},new Date('2026-01-20T09:20:00Z'),fetcher,async()=>{},evidence)
  assert.equal(result.calls,3)
  assert.deepEqual(result.dates,['2026-01-19','2026-01-18'])
  assert.equal(result.data.length,2)
  assert.equal(result.consensus.every(entry=>entry.status==='confirmed'),true)
  assert.equal(urls.some(url=>url.includes('/live')||url.includes('/upcoming')),false)
 }finally{
  if(previous===undefined)delete process.env.TENNIS_RESULTS_API_KEY;else process.env.TENNIS_RESULTS_API_KEY=previous
  if(previousDays===undefined)delete process.env.DEUCE_RESULT_REPAIR_DAYS;else process.env.DEUCE_RESULT_REPAIR_DAYS=previousDays
 }
})

test('a partial evidence outage retains the archive and does not publish an unconfirmed candidate',async()=>{
 const previous=process.env.TENNIS_RESULTS_API_KEY,previousDays=process.env.DEUCE_RESULT_REPAIR_DAYS
 process.env.TENNIS_RESULTS_API_KEY='test-key';process.env.DEUCE_RESULT_REPAIR_DAYS='2'
 const existing={id:'saved',tour:'atp'}
 const fetcher=async(input:string)=>new Response(JSON.stringify(input.includes('/tournament/calendar/')?{data:[...calendar.values()],hasNextPage:false}:{data:[{matchId:12,date:input.match(/results\/(\d{4}-\d{2}-\d{2})/)?.[1]+'T10:00:00Z',roundId:4,tournamentId:91,result:'6-3 6-4',result_type:'completed',best_of:'5',player1:{id:3,name:'Winner'},player2:{id:4,name:'Loser'},tournament:{id:91,name:'Australian Open',rankId:4,courtId:1}}],hasNextPage:false}),{status:200})
 try{
  const result=await collectBulkDailyResults('atp',{data:[existing]},new Date('2026-01-20T09:20:00Z'),fetcher,async()=>{},async()=>new Response('unavailable',{status:503}))
  assert.deepEqual(result.data,[existing])
  assert.equal(result.fresh.length,0)
  assert.match(result.evidence.error||'',/503/)
  assert.equal(result.consensus.every(entry=>entry.status==='provisional'),true)
 }finally{
  if(previous===undefined)delete process.env.TENNIS_RESULTS_API_KEY;else process.env.TENNIS_RESULTS_API_KEY=previous
  if(previousDays===undefined)delete process.env.DEUCE_RESULT_REPAIR_DAYS;else process.env.DEUCE_RESULT_REPAIR_DAYS=previousDays
 }
})
