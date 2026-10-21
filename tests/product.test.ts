import test from 'node:test';
import assert from 'node:assert/strict';
import { mockMatches } from '../lib/mocks';
import type { Match } from '../lib/types';
import { recordCatalog } from '../lib/revista/records';
import { recordEvidence, bestRun } from '../lib/record-evidence';
import { comparePlayer } from '../lib/player-comparison';
import { chronological } from '../lib/editorial';
import { conflictCandidates } from '../lib/archive-review';
import { archiveIndex } from '../lib/archive-index';
import { resultIssue } from '../lib/quality';
import { isRecordedTiebreak, tiebreakTarget } from '../lib/historical-rules';
const fixture = (extra: Partial<Match> = {}):Match => ({...mockMatches[0],match_id:'evidence',category:'ATP 500',surface:'hard',year:2020,player1:{name:'One',seed:null},player2:{name:'Two',seed:null},winner:1,status:'Finished',round:'Final',point_tape:[],statistics:[],context:{date:'2020-01-01',dateLabel:'Inicio del torneo',format:'BO3'},score_summary:{...mockMatches[0].score_summary,sets:[2,0],games:[[6,3],[6,4]],timestamp:'2020-01-01'},...extra});
test('comparison applies the same filters and never estimates absent ages/rankings',() => {
  const matches=[fixture({context:{age1:22.9,rankLabel:'Ranking al jugar',rank2:4,format:'BO3'}}),fixture({match_id:'clay',surface:'clay'}),fixture({match_id:'missing-age'})];
  const c=comparePlayer(matches,'One',{surface:'hard',age:'22'});
  assert.equal(c.played,1);assert.equal(c.base,2);assert.equal(c.ageCoverage,1);assert.equal(c.top10Won,1);assert.equal(c.sufficient,false);
  assert.equal(comparePlayer(matches,'Unknown',{}).rate,null);
  assert.equal(comparePlayer([fixture({context:{rankLabel:'Ranking en la descarga',rank2:1}})],'One',{}).ranking,0);
});
test('single-metric calculation matches the full catalogue',() => {
  const matches=Array.from({length:8},(_,i) => fixture({match_id:String(i),year:2020+i%2}));
  for(const piece of recordCatalog(matches,new Date('2026-10-21'))) {
    assert.deepEqual(recordCatalog(matches.map(m=>({...m})),new Date('2026-10-21'),piece.id),[piece],piece.id);
  }
});
test('every count record links to contributing matches without duplicate IDs',() => {
  const matches=Array.from({length:8},(_,i)=>fixture({match_id:String(i),year:2024}));
  const catalog=recordCatalog(matches,new Date('2026-10-21'));
  for(const id of ['victorias','finales-ganadas','finales-jugadas','titulos-torneo','temporadas-titulos','victorias-temporada','sin-ceder-set','titulos-hard','atp-500-titulos']) {
    const row=catalog.find(p=>p.id===id)!.rows[0], evidence=recordEvidence(matches,id,row);
    assert.equal(evidence.matches.length,row.value,id);
  }
});
test('chronology uses source date then round, not arbitrary IDs, and invalid results break streaks',() => {
  const early=fixture({match_id:'z',round:'Quarterfinal'}),later=fixture({match_id:'a',round:'Final'});
  assert.ok(chronological(early,later)<0);
  const invalid=fixture({match_id:'bad',round:'Semifinal',status:'Retired'});
  assert.equal(bestRun([later,early,invalid],'One').length,1);
});
test('review queue preserves all ambiguous candidates without changing data',() => {
  const a=fixture(),b=fixture({match_id:'another',context:{date:'2020-02-01'}}),matches=[a,b];
  const groups=conflictCandidates(matches);
  assert.equal(groups.length,1);assert.equal(groups[0].kind,'Mismo marcador, fechas diferentes');assert.equal(matches.length,2);
  assert.equal(archiveIndex(matches),archiveIndex(matches));assert.equal(archiveIndex(matches).ids.get('another'),b);
});
test('historical Wimbledon 13–12 is accepted only for a documented deciding-set era',() => {
  const games=[[7,6],[1,6],[7,6],[4,6],[13,12]];
  const m=fixture({tournament:'Wimbledon',year:2019,category:'Grand Slam',context:{format:'BO5'},score_summary:{...fixture().score_summary,games,sets:[3,2]}});
  assert.equal(resultIssue(m),null);assert.equal(isRecordedTiebreak(m,4),true);assert.equal(tiebreakTarget(m,5),7);
  assert.notEqual(resultIssue({...m,year:2018}),null);
  assert.equal(tiebreakTarget({...m,year:2022},5),10);
  assert.equal(tiebreakTarget({...m,tournament:'Australian Open'},5),10);
  assert.equal(tiebreakTarget(undefined,5),null);
});
