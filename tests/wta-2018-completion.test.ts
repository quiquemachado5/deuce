import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import rows from '../lib/verified-wta-2018-completion.json';
import {editionReferenceMatches,mergeEditionReferences} from '../lib/verified-editions';
import {auditEditions} from '../lib/edition-audit';
import {eligibleMatch,prepareMatch} from '../lib/quality';
import {isCompetitionOnly,prepareCompetitionMatch} from '../lib/competition';

const matches=editionReferenceMatches.filter(m=>m.match_id.startsWith('reference-wta-2018-'));
test('both 2018 WTA brackets contain every branch, with retirement wins included and walkovers excluded',()=>{
 assert.equal(matches.length,254);
 assert.equal(matches.filter(m=>eligibleMatch(prepareMatch(m))).length,253);
 const terminal=matches.filter(isCompetitionOnly).map(prepareCompetitionMatch);
 assert.equal(terminal.length,2);
 assert.equal(terminal.find(m=>m.status==='Walkover')?.final_score,'');
 for(const edition of auditEditions(matches)){
  assert.equal(edition.tour,'wta');assert.equal(edition.year,2018);
  assert.equal(edition.sourceRows,127);assert.equal(edition.pending,0);
  assert.deepEqual(edition.rounds,{'1':64,'2':32,'3':16,'4':8,'5':4,'6':2,'7':1});
  assert.equal(edition.completeDraw,true);
 }
 assert.equal(matches.find(m=>m.tournament==='Australian Open'&&m.round==='Final')?.player1.name,'Caroline Wozniacki');
 assert.equal(matches.find(m=>m.tournament==='Roland Garros'&&m.round==='Final')?.player1.name,'Simona Halep');
});
test('references have independent evidence, no invented match dates or measurements, and merge idempotently',()=>{
 assert.equal(new Set(rows.map(r=>r.id)).size,254);
 for(const row of rows){
  assert.notEqual(new URL(row.source).hostname,new URL(row.corroboration).hostname);
  assert.equal(row.dateLabel,'Semana del torneo');
 }
 for(const match of matches){assert.deepEqual(match.statistics,[]);assert.deepEqual(match.point_tape,[]);assert.equal(match.context?.minutes,undefined);}
 const once=mergeEditionReferences([],2018).filter(m=>m.match_id.startsWith('reference-wta-2018-'));
 const twice=mergeEditionReferences(once,2018).filter(m=>m.match_id.startsWith('reference-wta-2018-'));
 assert.equal(twice.length,254);
});
test('archived official draw PDFs and independent result file retain their reviewed hashes',()=>{
 const root='data/archive/references/wta-2018-completion/';
 const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8')) as Array<{name:string;sha256?:string}>;
 for(const source of manifest.filter(s=>s.sha256))assert.equal(createHash('sha256').update(readFileSync(root+source.name)).digest('hex'),source.sha256);
});
