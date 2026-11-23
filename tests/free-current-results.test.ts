import test from 'node:test';
import assert from 'node:assert/strict';
import {collectFreeCurrentResults} from '../lib/free-current-results';

test('FREE fallback discovers finished fixtures and never polls live or upcoming lists',async()=>{
 const paths:string[]=[];
 const completed={id:7,tour:'atp',draw:'singles',is_qualifying:false,tier:'atp_250',scheduled_time:'2026-10-17T12:00:00Z',outcome:'completed',winner:1,format:'BO3',score:{games:[[6,6],[3,4]]},players:{p1:{name:'A'},p2:{name:'B'}}};
 const result=await collectFreeCurrentResults('atp',{data:[]},undefined,async path=>{
  paths.push(path);return path==='/matches/7'?completed:{data:[{match_id:7,status:'finished',event_date:'2026-10-17'}],meta:{has_more:false,limit:200}};
 },10,new Date('2026-10-18T12:00:00Z'));
 assert.equal(paths.some(path=>path.includes('status=live')||path.includes('status=upcoming')),false);
 assert.equal(paths[0],'/fixtures?tour=atp&draw=singles&limit=200&offset=0');
 assert.equal(paths[0].includes('from=')||paths[0].includes('to=')||paths[0].includes('tier='),false);
 assert.equal(paths[1],'/matches/7');
 assert.deepEqual(result.fresh.map(row=>row.id),[7]);
 assert.deepEqual(result.queue.ids,[]);
});

test('unfinished result stays queued and a capped run never spends beyond its budget',async()=>{
 const paths:string[]=[];
 const result=await collectFreeCurrentResults('wta',{data:[]},{ids:['1','2'],at:'2026-11-17T00:00:00Z'},async path=>{
  paths.push(path);return path==='/matches/1'?{id:1,tour:'wta',draw:'singles',is_qualifying:false,tier:'wta_500',outcome:null}:{data:[],meta:{has_more:false,limit:200}};
 },2,new Date('2026-10-18T12:00:00Z'));
 assert.equal(result.complete,true);
 assert.deepEqual(result.queue.ids,['1','2']);
 assert.equal(paths.length,2);
 assert.match(paths[0],/^\/fixtures/);
 assert.equal(paths[1],'/matches/1');
});

test('a result played before New Year stays in its original season',async()=>{
 const completed={id:17,tour:'wta',draw:'singles',is_qualifying:false,tier:'wta_500',scheduled_time:'2026-12-31T18:00:00Z',outcome:'completed',winner:1,format:'BO3',score:{games:[[6,6],[3,4]]}};
 const result=await collectFreeCurrentResults('wta',{data:[]},{ids:['17'],at:'2026-12-31T00:00:00Z'},async path=>
  path==='/matches/17'?completed:{data:[],meta:{has_more:false,limit:200}},10,new Date('2027-01-01T09:20:00Z'));
 assert.deepEqual(result.data,[]);
 assert.deepEqual(result.otherYears.get(2026)?.map(row=>row.id),[17]);
 assert.deepEqual(result.queue.ids,[]);
});

test('a verified retirement is stored and removed from the pending queue',async()=>{
 const retired={id:18,tour:'wta',draw:'singles',is_qualifying:false,tier:'wta_250',scheduled_time:'2026-10-17T18:00:00Z',outcome:'retired',winner:2,format:'BO3',score:{games:[[6,2,1],[4,6,3]]}};
 const result=await collectFreeCurrentResults('wta',{data:[]},{ids:['18'],at:'2026-10-17T00:00:00Z'},async path=>
  path==='/matches/18'?retired:{data:[],meta:{has_more:false,limit:200}},10,new Date('2026-10-18T09:20:00Z'));
 assert.deepEqual(result.fresh.map(row=>row.id),[18]);
 assert.deepEqual(result.queue.ids,[]);
});

test('first FREE run can recover a finished 2026 Finals fixture by match ID',async()=>{
 const paths:string[]=[];
 const completed={id:19,tour:'atp',draw:'singles',is_qualifying:null,tier:null,tournament:'Finals - Turin',tournament_id:2794,scheduled_time:'2026-11-15T18:00:00Z',outcome:'completed',winner:1,format:'BO3',score:{games:[[6,6],[3,4]]}};
 const result=await collectFreeCurrentResults('atp',{data:[]},undefined,async path=>{
  paths.push(path);
  if(path.startsWith('/fixtures'))return {data:[{match_id:19,status:'finished',tournament:'Finals - Turin',event_date:'2026-11-15',tier:null,is_qualifying:null}],meta:{has_more:false,limit:200}};
  return path==='/matches/19'?completed:{data:[],meta:{has_more:false,limit:200}};
 },10,new Date('2026-11-19T09:20:00Z'));
 assert.equal(result.fresh.length,1);
 assert.equal(result.data[0].id,19);
 assert.equal(paths.length,2);
 assert.equal(paths[0],'/fixtures?tour=atp&draw=singles&limit=200&offset=0');
 assert.equal(paths[1],'/matches/19');
});

test('a later Finals fixture is discovered despite an existing queue',async()=>{
 const completed={id:20,tour:'atp',draw:'singles',is_qualifying:null,tier:null,tournament:'Finals - Turin',tournament_id:2794,scheduled_time:'2026-11-18T19:40:00Z',outcome:'completed',winner:1,format:'BO3',score:{games:[[6,6],[2,4]]}};
 const result=await collectFreeCurrentResults('atp',{data:[]},{ids:[],at:'2026-11-17T00:20:00Z'},async path=>{
  if(path.startsWith('/fixtures'))return {data:[{match_id:20,status:'finished',tournament:'Finals - Turin',event_date:'2026-11-18',tier:null,is_qualifying:null}],meta:{has_more:false,limit:200}};
  return path==='/matches/20'?completed:{data:[],meta:{has_more:false,limit:200}};
 },10,new Date('2026-11-19T09:20:00Z'));
 assert.deepEqual(result.fresh.map(row=>row.id),[20]);
 assert.deepEqual(result.queue.ids,[]);
});

test('Grand Slam rounds remain discoverable for a full three-week repair window',async()=>{
 const completed={id:21,tour:'atp',draw:'singles',is_qualifying:false,tier:'grand_slam',scheduled_time:'2026-06-02T12:00:00Z',outcome:'completed',winner:1,format:'BO5',score:{games:[[6,6,6],[3,4,2]]}};
 const result=await collectFreeCurrentResults('atp',{data:[]},undefined,async path=>path==='/matches/21'?completed:{data:[{match_id:21,status:'finished',event_date:'2026-06-02',tier:'grand_slam',is_qualifying:false}],meta:{has_more:false,limit:200}},10,new Date('2026-06-17T09:20:00Z'));
 assert.deepEqual(result.fresh.map(row=>row.id),[21]);
 assert.equal(result.queue.grandSlamWindowDays,21);
});
