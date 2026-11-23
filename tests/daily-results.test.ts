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
 process.env.TENNIS_RESULTS_API_KEY='test-key'
 const urls:string[]=[]
 const fetcher=async(input:string)=>{
  urls.push(input)
  const payload=input.includes('/tournament/calendar/')
   ?{data:[...calendar.values()],hasNextPage:false}
   :{data:[{matchId:12,date:input.includes('2026-01-19')?'2026-01-19T10:00:00Z':'2026-01-18T10:00:00Z',roundId:4,tournamentId:91,result:'6-3 6-4',result_type:'completed',best_of:'5',player1:{id:3,name:'Winner'},player2:{id:4,name:'Loser'},tournament:{id:91,name:'Australian Open',rankId:4,courtId:1}}],hasNextPage:false}
  return new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}})
 }
 try{
  const result=await collectBulkDailyResults('atp',{data:[]},new Date('2026-01-20T09:20:00Z'),fetcher,async()=>{})
  assert.equal(result.calls,3)
  assert.deepEqual(result.dates,['2026-01-19','2026-01-18'])
  assert.equal(result.data.length,2)
  assert.equal(urls.some(url=>url.includes('/live')||url.includes('/upcoming')),false)
 }finally{
  if(previous===undefined)delete process.env.TENNIS_RESULTS_API_KEY;else process.env.TENNIS_RESULTS_API_KEY=previous
 }
})
