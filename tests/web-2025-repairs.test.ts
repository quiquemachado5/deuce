import test from 'node:test';
import assert from 'node:assert/strict';
import {editionReferenceMatches,mergeEditionReferences} from '../lib/verified-editions';
import {eligibleMatch,prepareMatch} from '../lib/quality';
test('web verified retirement and walkover retain terminal states without invented sets',()=>{
 const walk=editionReferenceMatches.find(m=>m.match_id==='reference-ad25-korda-kokkinakis')!;
 assert.equal(walk.status,'Walkover');assert.deepEqual(walk.score_summary.games,[]);assert.equal(eligibleMatch(prepareMatch(walk)),false);
 const retired=editionReferenceMatches.find(m=>m.match_id==='reference-ad25-keys-samsonova')!;
 assert.equal(retired.status,'Retired');assert.deepEqual(retired.score_summary.games.at(-1),[3,0]);assert.equal(eligibleMatch(prepareMatch(retired)),true);
});
test('repair preserves provider identity, reverses score and invalidates unsupported measurements',()=>{
 const ref=editionReferenceMatches.find(m=>m.match_id==='reference-ao25-navarro-kasatkina')!;
 const stale={...ref,match_id:'wta-live-34242',player1:ref.player2,player2:ref.player1,winner:1 as const,final_score:'4–6 7–5 5–6',score_summary:{...ref.score_summary,games:[[4,6],[7,5],[5,6]]},statistics:[]};
 const result=mergeEditionReferences([stale],2025).find(m=>m.match_id===stale.match_id)!;
 assert.equal(result.winner,2);assert.equal(result.final_score,'4–6 7–5 5–7');assert.equal(eligibleMatch(prepareMatch(result)),true);assert.ok(result.context?.metadataSources?.length);
 assert.equal(mergeEditionReferences([stale],2025).filter(m=>m.tour==='wta'&&m.tournament==='Australian Open'&&[m.player1.name,m.player2.name].includes('Emma Navarro')).length,1);
});
