import test from 'node:test';
import assert from 'node:assert/strict';
import {collectFreeCurrentResults} from '../lib/free-current-results';

test('FREE current ingestion settles saved IDs and discovers only selected upcoming draws',async()=>{
 const paths:string[]=[];
 const completed={id:7,tour:'atp',draw:'singles',is_qualifying:false,tier:'atp_500',scheduled_time:'2026-11-17T12:00:00Z',outcome:'completed',winner:1,format:'BO3',score:{games:[[6,6],[3,4]]},players:{p1:{name:'A'},p2:{name:'B'}}};
 const upcoming=[{id:8,tour:'atp',draw:'singles',is_qualifying:false,tier:'atp_500',scheduled_time:'2026-11-19T12:00:00Z'},
  {id:9,tour:'atp',draw:'singles',is_qualifying:false,tier:'atp_250',scheduled_time:'2026-11-19T12:00:00Z'},
  {id:10,tour:'atp',draw:'singles',is_qualifying:false,tier:'atp_500',scheduled_time:'2026-11-25T12:00:00Z'}];
 const result=await collectFreeCurrentResults('atp',{data:[]},{ids:['7'],at:'2026-11-17T00:00:00Z'},async path=>{
  paths.push(path);return path==='/matches/7'?completed:{data:path.includes('status=upcoming')?upcoming:[],meta:{has_more:false,limit:200}};
 },10,new Date('2026-11-18T12:00:00Z'));
 assert.deepEqual(paths,['/fixtures?tour=atp&draw=singles&limit=200&offset=0','/matches/7','/matches?status=upcoming&tour=atp&draw=singles&from=2026-11-17&to=2026-11-19&limit=200&offset=0','/matches?status=live&tour=atp&draw=singles&from=2026-11-17&to=2026-11-19&limit=200&offset=0']);
 assert.deepEqual(result.fresh.map(row=>row.id),[7]);
 assert.deepEqual(result.queue.ids,['8']);
});

test('unfinished result stays queued and a capped run never spends beyond its budget',async()=>{
 const paths:string[]=[];
 const result=await collectFreeCurrentResults('wta',{data:[]},{ids:['1','2'],at:'2026-11-17T00:00:00Z'},async path=>{
  paths.push(path);return path==='/matches/1'?{id:1,tour:'wta',draw:'singles',is_qualifying:false,tier:'wta_500',outcome:null}:{data:[],meta:{has_more:false,limit:200}};
 },2,new Date('2026-11-18T12:00:00Z'));
 assert.equal(result.complete,false);
 assert.deepEqual(result.queue.ids,['1','2']);
 assert.deepEqual(paths,['/matches/1','/matches?status=upcoming&tour=wta&draw=singles&from=2026-11-17&to=2026-11-19&limit=200&offset=0']);
});

test('a result played before New Year stays in its original season',async()=>{
 const completed={id:17,tour:'wta',draw:'singles',is_qualifying:false,tier:'wta_500',scheduled_time:'2026-12-31T18:00:00Z',outcome:'completed',winner:1,format:'BO3',score:{games:[[6,6],[3,4]]}};
 const result=await collectFreeCurrentResults('wta',{data:[]},{ids:['17'],at:'2026-12-31T00:00:00Z'},async path=>
  path==='/matches/17'?completed:{data:[],meta:{has_more:false,limit:200}},10,new Date('2027-01-01T00:20:00Z'));
 assert.deepEqual(result.data,[]);
 assert.deepEqual(result.otherYears.get(2026)?.map(row=>row.id),[17]);
 assert.deepEqual(result.queue.ids,[]);
});

test('first FREE run can recover a finished 2026 Finals fixture by match ID',async()=>{
 const paths:string[]=[];
 const completed={id:19,tour:'atp',draw:'singles',is_qualifying:null,tier:null,tournament:'Finals - Turin',tournament_id:2794,scheduled_time:'2026-11-15T18:00:00Z',outcome:'completed',winner:1,format:'BO3',score:{games:[[6,6],[3,4]]}};
 const result=await collectFreeCurrentResults('atp',{data:[]},undefined,async path=>{
  paths.push(path);
  if(path.startsWith('/fixtures'))return {data:[{match_id:19,status:'finished',tournament:'Finals - Turin',event_date:'2026-11-15'}]};
  return path==='/matches/19'?completed:{data:[],meta:{has_more:false,limit:200}};
 },10,new Date('2026-11-18T00:20:00Z'));
 assert.equal(result.fresh.length,1);
 assert.equal(result.data[0].id,19);
 assert.deepEqual(paths.slice(0,2),['/fixtures?tour=atp&draw=singles&limit=200&offset=0','/matches/19']);
});

test('a later Finals fixture is discovered despite an existing queue',async()=>{
 const completed={id:20,tour:'atp',draw:'singles',is_qualifying:null,tier:null,tournament:'Finals - Turin',tournament_id:2794,scheduled_time:'2026-11-18T19:40:00Z',outcome:'completed',winner:1,format:'BO3',score:{games:[[6,6],[2,4]]}};
 const result=await collectFreeCurrentResults('atp',{data:[]},{ids:[],at:'2026-11-17T00:20:00Z'},async path=>{
  if(path.startsWith('/fixtures'))return {data:[{match_id:20,status:'finished',tournament:'Finals - Turin',event_date:'2026-11-18'}]};
  return path==='/matches/20'?completed:{data:[],meta:{has_more:false,limit:200}};
 },10,new Date('2026-11-18T21:00:00Z'));
 assert.deepEqual(result.fresh.map(row=>row.id),[20]);
 assert.deepEqual(result.queue.ids,[]);
});
