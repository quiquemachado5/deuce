import test from 'node:test';
import assert from 'node:assert/strict';
import {mockMatches} from '../lib/mocks';
import {grandSlamSeasons,bestGrandSlamSeasons} from '../lib/grand-slam-seasons';
import {recordCatalog} from '../lib/revista/records';
import {recordEvidence} from '../lib/record-evidence';
import type {Match} from '../lib/types';
const base=mockMatches.find(match=>match.category==='Grand Slam')!;
const fixture=(id:string,year:number,tour:'atp'|'wta'='atp'):Match=>({...base,match_id:id,tour,year,category:'Grand Slam',tournament:'Australian Open',status:'Finished',winner:1,round:'Final',player1:{name:'Player A',seed:null},player2:{name:'Player B',seed:null},point_tape:[],statistics:[],score_summary:{...base.score_summary,games:tour==='wta'?[[6,3],[6,4]]:[[6,3],[6,4],[6,4]],sets:tour==='wta'?[2,0]:[3,0]}});
test('counts one best season per player, excludes duplicates, other levels, qualifying and walkovers while including retirement wins',()=>{
 const a=fixture('a',2020),b=fixture('b',2020),c=fixture('c',2021);
 const rows=grandSlamSeasons([a,a,b,c,{...c,match_id:'250',category:'ATP 250'},{...c,match_id:'q',context:{qualifying:true}},{...c,match_id:'ret',status:'Walkover'}]);
 const best=bestGrandSlamSeasons(rows,'wins');assert.equal(best.length,1);assert.equal(best[0].year,2020);assert.equal(best[0].wins.length,2);assert.equal(best[0].straight.length,2);
});
test('ties select the latest season, circuits cannot mix and WTA best-of-three is counted',()=>{
 const rows=grandSlamSeasons([fixture('a',2020,'wta'),fixture('b',2021,'wta')]);assert.equal(bestGrandSlamSeasons(rows,'wins')[0].year,2021);
 assert.throws(()=>grandSlamSeasons([fixture('a',2020),fixture('b',2021,'wta')]),/one circuit/);
});
test('catalog rows retain exact evidence for the selected year and metric',()=>{
 const matches=[fixture('a',2020),fixture('b',2020),fixture('c',2021)];const piece=recordCatalog(matches,new Date(),'grand-slam-victorias-temporada')[0];assert.equal(piece.rows[0].value,2);assert.deepEqual(recordEvidence(matches,piece.id,piece.rows[0]).matches.map(match=>match.match_id),['a','b']);
});
