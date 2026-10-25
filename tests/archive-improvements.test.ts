import test from 'node:test';
import assert from 'node:assert/strict';
import { mockMatches } from '../lib/mocks';
import type { Match } from '../lib/types';
import { matchSearchIntent, matchesIntent } from '../lib/search-intent';
import { matchingMatches } from '../lib/cuaderno/search';
import { archiveExtent, exactDay } from '../lib/archive-freshness';
import { sharedCareerWindow } from '../lib/player-comparison';
import { editionNeighbors } from '../lib/edition-neighbors';
import { tournamentTimeline } from '../lib/tournament-presentation';
import { compileRecordSnapshot } from '../lib/revista/snapshot';
import { attachRecordChanges, assertSnapshotIntegrity } from '../lib/revista/record-changes';
import { archiveStories } from '../lib/archive-stories';
const base={...mockMatches[0],data_source:'api' as const};

test('compound search interprets rounds, surface, format and year without weakening names',()=>{
  const intent=matchSearchIntent('finales a cinco sets en tierra batida 2008 Nadal Federer');
  assert.deepEqual(intent.terms,['nadal','federer']);assert.equal(intent.year,2008);assert.equal(intent.round,7);assert.equal(intent.surface,'clay');assert.equal(intent.fiveSets,true);
  assert.deepEqual(matchSearchIntent('Nadal vs Federer Wimbledon 2008').terms,['nadal','federer','wimbledon']);
  assert.deepEqual(matchSearchIntent('RG 2008').terms,['roland','garros']);
  assert.equal(matchSearchIntent('semifinales').round,6);
  assert.equal(matchesIntent({...base,year:2009},intent),false);
});
test('semantic match search returns only the requested format, round and names',()=>{
  const final={...base,match_id:'search-a',year:2008,tournament:'Wimbledon',round:'Final',surface:'grass' as const,player1:{name:'Rafael Nadal',seed:null},player2:{name:'Roger Federer',seed:null},score_summary:{...base.score_summary,games:[[6,4],[6,4],[6,7],[6,7],[9,7]]}};
  const semi={...final,match_id:'search-b',round:'Semifinal'};
  assert.deepEqual(matchingMatches('Nadal Federer Wimbledon 2008 finales a cinco sets',[final,semi]).map(m=>m.match_id),['search-a']);
  assert.equal(matchingMatches('Djokovic Wimbledon 2008',[final,semi]).length,0);
});
test('freshness separates exact dates, edition starts, invalid dates and future data',()=>{
  assert.equal(exactDay('2026-02-30'),null);
  const matches=[{...base,context:{date:'2026-10-20',dateLabel:'Fecha del partido'}},{...base,context:{date:'2026-10-23',dateLabel:'Inicio del torneo'}},{...base,context:{date:'2027-01-01',dateLabel:'Fecha del partido'}}];
  assert.deepEqual(archiveExtent(matches,new Date('2026-10-25')), {latestExactDate:'2026-10-20',latestEditionDate:'2026-10-23',exactDates:1});
});
test('edition neighbors include both players but never another category or edition',()=>{
  const match={...base,year:2008,tournament:'Wimbledon',category:'Grand Slam',round:'Final'};
  const before={...match,match_id:'before',round:'Semifinal'};
  const wrong={...before,match_id:'wrong',category:'Challenger'};
  const paths=editionNeighbors([match,before,wrong],match);
  assert.equal(paths.length,2);assert.ok(paths.every(p=>p.previous?.match_id==='before'&&!p.next));
});
test('shared career comparison uses the documented intersection and handles no overlap',()=>{
  const make=(year:number,a:string,b:string):Match=>({...base,year,player1:{name:a,seed:null},player2:{name:b,seed:null}});
  const matches=[make(2001,'A','C'),make(2008,'A','B'),make(2010,'B','C')];
  assert.deepEqual(sharedCareerWindow(matches,['A','B']),{first:2008,last:2008});
  assert.equal(sharedCareerWindow(matches,['A','Unknown']),null);
});
test('tournament timeline does not fill absent years or merge different conditions',()=>{
  const matches=[2001,2002,2004].map(year=>({...base,tournament:'Example',year,surface:'hard' as const,context:{indoor:true}}));
  assert.deepEqual(tournamentTimeline(matches).map(p=>[p.from,p.to]),[[2001,2002],[2004,2004]]);
});
test('leader observations preserve ties and are idempotent across publication retries',()=>{
  const snap=compileRecordSnapshot([base],new Date('2026-10-20'));
  const previous={...snap.manifest,version:'a',pieces:[{...snap.manifest.pieces[0],id:'test',minimum:1,leader:{name:'A',value:10,href:'/players/a',detail:'',sample:10},leaders:[{name:'A',value:10,href:'/players/a'}]}]};
  const current={...previous,version:'b',generatedAt:'2026-10-21T00:00:00Z',pieces:previous.pieces.map(p=>({...p,leaders:[...p.leaders,{name:'B',value:10,href:'/players/b'}]}))};
  const next=attachRecordChanges(previous,current);assert.equal(next.leaderChanges?.length,1);assert.deepEqual(next.leaderChanges?.[0].after.names,['A','B']);
  assert.equal(attachRecordChanges(next,current).leaderChanges?.length,1);
  assert.equal(attachRecordChanges({...previous,rulesVersion:'other'},current).leaderChanges,undefined);
});
test('publication rejects invalid ratios and non-finite statistics',()=>{
  const snapshot=compileRecordSnapshot([base]);assertSnapshotIntegrity(snapshot);
  const piece=snapshot.manifest.pieces.find(p=>p.leader)!;
  snapshot.pieces[piece.id].pages['1'][0].value=Number.NaN;
  assert.throws(()=>assertSnapshotIntegrity(snapshot),/Non-finite/);
});
test('editorial stories never display invented or demo matches',()=>{
  assert.deepEqual(archiveStories(mockMatches),[]);
  assert.deepEqual(archiveStories([]),[]);
});
