import test from 'node:test';
import assert from 'node:assert/strict';
import {spanishArchiveUrl} from '../lib/legacy-english';
import {buildPageRevisions,matchCorrections,validPageRevisions} from '../lib/publication-pages';
import {reviewedFinalsRound} from '../lib/finals-identity';
import {mockMatches} from '../lib/mocks';
import {generationMetadata} from '../lib/revista/generation';
import {compileRecordSnapshot} from '../lib/revista/snapshot';
import type {Match} from '../lib/types';

const result:Match={...mockMatches[0],tour:'atp',data_source:'api',match_id:'known-match',tournament:'Roland Garros',year:2024,context:{date:'2024-06-09',dateLabel:'Fecha del partido'}};
const at='2026-11-13T13:00:00Z';
test('English retirement keeps every entity and circuit, with a Spanish destination',()=>{
 for(const [from,to] of [
  ['/en','/'],['/en/','/'],['/en/matches/live-123','/match/live-123'],['/en/matches','/partidos?tour=all'],
  ['/en/matches/wta-live-123?tour=wta','/match/wta-live-123?tour=wta'],
  ['/en/players/iga-swiatek?tour=wta','/jugadores/iga-swiatek?tour=wta'],
  ['/en/tournaments/roland-garros/2024?tour=wta','/torneos/roland-garros/2024?cuadro=wta'],
  ['/en/tournaments?tour=wta','/torneos?circuito=wta'],['/en/records?tour=wta','/records?tour=wta&dato=victorias'],
  ['/en/compare?a=Roger+Federer&b=Rafael+Nadal','/comparar?a=Roger+Federer&b=Rafael+Nadal'],
 ]){const redirect=spanishArchiveUrl(new URL(from,'https://deucearchive.com'));assert.equal(redirect.pathname+redirect.search,to);assert.equal(redirect.origin,'https://deucearchive.com');}
});
test('per-page lastmod ignores download/publication timestamps and follows corrected content',()=>{
 const initial=buildPageRevisions([result],{},undefined,at);
 assert.ok(validPageRevisions(initial));assert.equal(initial.pages['/match/known-match'].modifiedAt,undefined);
 const refreshed={...result,provider_revision:{retrieved_at:at},raw_fixture:{secret:'never in the index'}};
 const same=buildPageRevisions([refreshed],{},initial,'2026-11-14T12:00:00Z');
 assert.deepEqual(same.pages,initial.pages);
 const changed={...refreshed,round:'Fase de grupos'};
 const next=buildPageRevisions([changed],{},same,'2026-11-15T12:00:00Z');
 assert.equal(next.pages['/match/known-match'].modifiedAt,'2026-11-15T12:00:00Z');
 assert.equal(next.pages['/torneos/roland-garros/2024'].modifiedAt,'2026-11-15T12:00:00Z');
 assert.equal(buildPageRevisions([changed],{},next,'2026-11-16T12:00:00Z').pages['/match/known-match'].modifiedAt,'2026-11-15T12:00:00Z');
 assert.equal(JSON.stringify(next).includes('never in the index'),false);
});
test('correction history records before, after, evidence and date, without duplicate retries',()=>{
 const previous={...result,round:'Ronda no especificada'};
 const changed={...result,round:'Fase de grupos',context:{...result.context,metadataSources:[{field:'Ronda',url:'https://wtafiles.wtatennis.com/pdf/matchnotes/2026/808_3.pdf'}]}};
 const corrections=matchCorrections([previous],[changed],at);
 assert.equal(corrections.length,1);assert.equal(corrections[0].before.round,'Ronda no especificada');assert.equal(corrections[0].after.round,'Fase de grupos');assert.equal(corrections[0].at,at);assert.equal(corrections[0].sources.length,1);
 assert.deepEqual(matchCorrections([changed],[changed],at),[]);
 const initial=buildPageRevisions([changed],{},undefined,at,corrections);
 assert.equal(buildPageRevisions([changed],{},initial,at,corrections).corrections.length,1);
});
test('WTA Finals group correction is event/date bounded and preserves explicit knockouts',()=>{
 const row={tour:'wta',tier:'wta_finals',tournament:'WTA Finals',scheduled_time:'2026-11-10T22:10:00Z'};
 assert.equal(reviewedFinalsRound(row),'RR');
 assert.equal(reviewedFinalsRound({...row,round:'Ronda no especificada'}),'RR');
 for(const code of ['F','SF','QF'])assert.equal(reviewedFinalsRound({...row,round_code:code}),null);
 assert.equal(reviewedFinalsRound({...row,scheduled_time:'2026-11-14T12:00:00Z'}),null);
 assert.equal(reviewedFinalsRound({...row,scheduled_time:'2025-11-10T12:00:00Z'}),null);
 assert.equal(reviewedFinalsRound({...row,tier:'wta_500',tournament:'Paris'}),null);
});
test('generation metadata distinguishes match date, incorporation and publication; totals reconcile',()=>{
 const snapshot=compileRecordSnapshot([result],new Date(at));
 snapshot.manifest.ingestionHistory=[{date:'2026-11-12',added:1,total:1,included:{matches:1,statistics:0,points:0,ranking:0}}];
 const data=generationMetadata({manifest:snapshot.manifest,source:'remote'});
 assert.equal(data.totalMatches,data.totalsByTour.atp+data.totalsByTour.wta);
 assert.equal(data.freshness.latestMatchDate,'2024-06-09');assert.equal(data.freshness.latestIncorporationDate,'2026-11-12');assert.equal(data.freshness.publishedAt,new Date(at).toISOString());
});

test('saved WTA Finals rows reach browser filters and statistics as group stage',async()=>{
 const {archiveMatch}=await import('../lib/live-tennis');
 const {prepareMatch}=await import('../lib/quality');
 const {compileMatchBrowser,queryMatchBrowserPage}=await import('../lib/match-browser-snapshot');
 const rows=(await Promise.all(['wta-live-215417','wta-live-216549'].map(id=>archiveMatch(id)))).filter((row):row is Match=>Boolean(row)).map(prepareMatch);
 assert.equal(rows.length,2);assert.ok(rows.every(row=>row.round==='Fase de grupos'&&row.tour==='wta'&&row.category==='WTA Finals'));
 const browser=compileMatchBrowser(rows);
 assert.equal(queryMatchBrowserPage(browser.partitions,{round:'Fase de grupos'},1,20).total,2);
 const snapshot=compileRecordSnapshot(rows,new Date(at));
 assert.equal(snapshot.manifest.matchCount,2);
 assert.ok(snapshot.players.every(player=>player.finalsWon===0&&player.finalsPlayed===0));
});
