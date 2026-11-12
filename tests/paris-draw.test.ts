import test from 'node:test';
import assert from 'node:assert/strict';
import {editionReferenceMatches,mergeEditionReferences} from '../lib/verified-editions';
import {auditEditions} from '../lib/edition-audit';
import {prepareMatch,eligibleMatch} from '../lib/quality';
import {preservePublishedArchive} from '../lib/revista/release-source';
const paris=editionReferenceMatches.filter(match=>match.tournament==='Paris'&&match.year===2026&&match.tour==='atp');
test('official Paris draw keeps all 55 contests, including terminal results, with provenance',()=>{
  assert.equal(paris.length,55);assert.equal(new Set(paris.map(match=>match.match_id)).size,55);
  const [audit]=auditEditions(paris);
  assert.equal(audit.completeDraw,true);assert.equal(audit.pending,0);assert.equal(audit.completed,54);assert.equal(audit.terminal,1);
  assert.ok(paris.every(match=>match.context?.resultSource&&match.context.metadataSources?.length));
  assert.ok(paris.filter(match=>match.status==='Finished').every(match=>Number.isInteger(match.context?.minutes)&&match.statistics.every(stat=>stat.period==='match')));
  assert.equal(auditEditions(paris.filter(match=>match.round!=='Final'))[0].completeDraw,false);
});
test('official scores and statistics retain the provider identity and player orientation',()=>{
  const final=paris.find(match=>match.round==='Final')!;
  const provider={...final,match_id:'live-216535',player1:final.player2,player2:final.player1,winner:2 as const,final_score:'6–7 5–7',score_summary:{...final.score_summary,games:final.score_summary.games.map(([a,b])=>[b,a])},statistics:[]};
  const result=mergeEditionReferences([provider],2026).find(match=>match.match_id===provider.match_id)!;
  assert.equal(result.winner,2);assert.equal(result.statistics.find(stat=>stat.player===2&&stat.name==='Aces')?.won,final.statistics.find(stat=>stat.player===1&&stat.name==='Aces')?.won);
  assert.equal(eligibleMatch(prepareMatch(result)),true);
});
test('a fresh correction updates a published identity while an old checkout cannot undo it',async()=>{
  const final=prepareMatch(paris.find(match=>match.round==='Final')!);
  const previous={...final,context:{...final.context,resultReviewedAt:'2026-11-09T00:00:00Z'},provider_revision:{retrieved_at:'2026-11-09T00:00:00Z'}};
  const fresh={...previous,provider_revision:{retrieved_at:'2026-11-10T13:00:00Z'},statistics:previous.statistics.slice(0,1)};
  const [merged]=await preservePublishedArchive([fresh],{matchCount:1,version:'v1',generatedAt:'2026-11-09T10:00:00Z'},async()=>[previous]);
  assert.equal(merged.provider_revision?.retrieved_at,fresh.provider_revision.retrieved_at);assert.equal(merged.statistics.length,previous.statistics.length);
  const [restored]=await preservePublishedArchive([previous],{matchCount:1,version:'v2',generatedAt:'2026-11-10T14:00:00Z'},async()=>[fresh]);
  assert.equal(restored,fresh);
});
test('a compact projection cannot permanently erase reviewed official measurements',async()=>{
  const rich=prepareMatch(paris.find(match=>match.round==='Final')!);
  const compact={...rich,statistics:[]};
  const [result]=await preservePublishedArchive([rich],{matchCount:1,version:'reviewed',generatedAt:'2026-11-10T15:00:00Z'},async()=>[compact]);
  assert.equal(result.match_id,compact.match_id);
  assert.equal(result.statistics.length,20);
  assert.equal(result.context?.resultReviewedAt,rich.context?.resultReviewedAt);
});
