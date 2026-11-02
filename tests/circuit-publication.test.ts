import test from 'node:test';
import assert from 'node:assert/strict';
import {mockMatches} from '../lib/mocks';
import {filterArchive} from '../lib/archive-index';
import {recordCatalog} from '../lib/revista/records';
import {compileRecordSnapshot} from '../lib/revista/snapshot';
import {comparePublishedMatches} from '../lib/publication-delta';
import {reconcileSeasonResults,type SeasonCheckpoint} from '../lib/result-refresh';
import {editionCompleteness} from '../lib/edition-audit';
import {packArtifacts,registerArtifactPacks,readSnapshotArtifact,clearArtifactPacks} from '../lib/revista/artifact-packs';
import {wtaBackfillProgress,operationHistory,operationStatus,withOperationHistory} from '../lib/archive-operations';
import {evidenceHref} from '../lib/record-evidence';
import {playerPhoto} from '../lib/player-imagery';

const atp={...mockMatches[0],match_id:'same-id',tour:'atp' as const,data_source:'api' as const};
const wta={...atp,match_id:'wta-same-id',tour:'wta' as const};

test('identical player names remain separate in selection, prepared records and home',()=>{
  const rows=[atp,wta];
  for(const tour of ['atp','wta'] as const){
    assert.deepEqual(filterArchive(rows,{tour}).map(m=>m.tour),[tour]);
    const snapshot=compileRecordSnapshot(rows);
    assert.ok(snapshot.manifest.home?.circuits?.[tour].latest.every(m=>m.tour===tour));
    const meta=snapshot.manifest.circuitPieces![tour].find(p=>p.id==='victorias')!;
    assert.equal(meta.leader?.value,1);
    assert.equal(meta.leader?.proof?.tour,tour);
  }
  assert.throws(()=>recordCatalog(rows),/one explicit circuit/);
});

test('corrections compare identities and retain previous values; deletions cannot hide behind additions',()=>{
  const corrected={...wta,context:{...wta.context,minutes:123}};
  const {delta,changes}=comparePublishedMatches([atp,wta],[atp,corrected,{...wta,match_id:'new'}]);
  assert.equal(delta.added,1);assert.equal(delta.corrected,1);
  assert.deepEqual(delta.tours.atp,{added:0,corrected:0});
  assert.equal(changes[0].before?.context?.minutes,wta.context?.minutes);
  assert.equal(changes[0].after.context?.minutes,123);
  assert.equal(comparePublishedMatches([atp,wta],[atp,wta]).changes.length,0);
  assert.throws(()=>comparePublishedMatches([atp,wta],[atp,{...wta,match_id:'replacement'}]),/remove a verified match/);
  assert.throws(()=>comparePublishedMatches([],[{...atp,tour:undefined}]),/explicit circuit/);
});

test('WTA provider contamination is rejected before a season is saved',async()=>{
  await assert.rejects(reconcileSeasonResults(2025,2026,null,async()=>({data:[{id:1,tour:'atp'}],meta:{has_more:false}}),'wta'),/another circuit/);
});

test('late rounds alone never certify a whole draw; sourced sizes require every round',()=>{
  const base={category:'WTA 250',rounds:{'5':4,'6':2,'7':1},pending:0};
  assert.equal(editionCompleteness(base).completeDraw,null);
  assert.equal(editionCompleteness({...base,drawSize:16,drawSizeSource:'https://example.org/draw'}).completeDraw,false);
  assert.equal(editionCompleteness({...base,rounds:{...base.rounds,'4':8},drawSize:16,drawSizeSource:'https://example.org/draw'}).completeDraw,true);
  assert.equal(editionCompleteness({...base,rounds:{...base.rounds,'7':2}}).completeDraw,false);
  assert.equal(editionCompleteness({...base,duplicateIds:1}).completeDraw,false);
});

test('packed artifacts preserve identities, validate checksums and fail closed',async()=>{
  async function* entries(){for(let i=0;i<12;i++)yield [`item-${i}`,{value:i}] as [string,unknown];}
  const stored=new Map<string,unknown>(),mapping:Record<string,string>={},version='a'.repeat(20);
  let writes=0;
  for await(const pack of packArtifacts(entries(),100)){
    stored.set(`reading-v2-${version}-${pack.id}`,pack.payload);writes++;
    for(const id of Object.keys(pack.payload.artifacts))mapping[id]=pack.id;
  }
  assert.ok(writes<12);registerArtifactPacks(version,mapping);
  for(let i=0;i<12;i++)assert.deepEqual(await readSnapshotArtifact(`reading-v2-${version}-item-${i}`,async k=>stored.get(k)),{value:i});
  clearArtifactPacks();registerArtifactPacks(version,mapping);
  await assert.rejects(readSnapshotArtifact(`reading-v2-${version}-item-0`,async()=>({artifacts:{'item-0':{value:999}}})),/checksum/);
  clearArtifactPacks();
});

test('progress uses only the configured cohorts and failure retains last successful attempt',()=>{
  assert.equal(wtaBackfillProgress(undefined),undefined);
  const progress=wtaBackfillProgress({complete:['1968-G','1968-G','9999-G']})!;
  assert.equal(progress.completed,1);assert.equal(progress.total,165);assert.equal(progress.pending.length,164);
  assert.equal(operationStatus({status:'error',at:'2026-11-01T08:00:00Z',lastSuccessAt:'2026-10-31T08:00:00Z'}).successAt,'2026-10-31T08:00:00Z');
  assert.equal(operationStatus(undefined).found,undefined);
});

test('operation status retains completed attempts for the daily API journal',()=>{
  const first=withOperationHistory(undefined,{status:'error',attemptAt:'2026-11-01T04:00:00Z',at:'2026-11-01T04:00:03Z',calls:2,message:'HTTP 403'});
  const running=withOperationHistory(first,{status:'running',attemptAt:'2026-11-02T04:00:00Z',at:'2026-11-02T04:00:00Z'});
  const second=withOperationHistory(running,{status:'success',attemptAt:'2026-11-02T04:00:00Z',at:'2026-11-02T04:01:00Z',calls:7,extracted:12});
  const history=operationHistory(second);
  assert.equal(history.length,2);
  assert.deepEqual(history.map(row=>row.status),['error','success']);
  assert.deepEqual(history.map(row=>row.calls),[2,7]);
  assert.equal(history[1].extracted,12);
});

test('WTA evidence URLs and portraits cannot fall through to ATP',()=>{
  const href=evidenceHref('victorias',{name:'Same Name',value:1,sample:1,detail:'',href:'/jugadores/same-name'},{tour:'wta'});
  assert.equal(new URL(href,'https://example.org').searchParams.get('tour'),'wta');
  assert.equal(playerPhoto('Novak Djokovic','wta'),null);
  assert.equal(playerPhoto('Iga Swiatek','atp'),null);
  assert.equal(playerPhoto('Iga Swiatek','wta')?.auditStatus,'verified');
});


test('a quota interruption resumes the next WTA page without publishing or repeating finished pages',async()=>{
  let checkpoint:SeasonCheckpoint|undefined;
  const progress={save:async(value:SeasonCheckpoint)=>{checkpoint=value;}};
  let calls=0;
  await assert.rejects(reconcileSeasonResults(2024,2026,null,async()=>{
    if(calls++)throw new Error('Quota exhausted');
    return {data:[{id:1,tour:'wta'}],meta:{has_more:true,limit:200}};
  },'wta',progress),/Quota exhausted/);
  assert.equal(checkpoint?.offset,200);
  const paths:string[]=[];
  const resumed=await reconcileSeasonResults(2024,2026,null,async path=>{
    paths.push(path);return {data:[{id:2,tour:'wta'}],meta:{has_more:false,limit:200}};
  },'wta',{...progress,resume:checkpoint});
  assert.equal(paths.length,1);assert.ok(paths[0].endsWith('offset=200'));
  assert.deepEqual(resumed.data.map(row=>row.id),[1,2]);
  const completed=await reconcileSeasonResults(2024,2026,null,async()=>{throw Error('Must not repeat a completed page');},'wta',{...progress,resume:checkpoint});
  assert.deepEqual(completed.data,resumed.data);
});
