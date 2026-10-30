import test from "node:test";
import assert from "node:assert/strict";
import { mockMatches } from "../lib/mocks";
import { prepareCompetitionMatch } from "../lib/competition";
import { eligibleMatch } from "../lib/quality";
import { resultIssue } from "../lib/quality";
import { displaySetsWon, displayTotal } from "../lib/score-display";
import { compileRecordSnapshot } from "../lib/revista/snapshot";
import { selectGeneration } from "../lib/revista/generation";
test("a retirement preserves its named winner after orientation, but partial games never become a won set or a statistical win", () => {
  const match = {
    ...mockMatches[0],
    status: "Retired",
    winner: 2 as const,
    player1: { name: "Zed", seed: null },
    player2: { name: "Ada", seed: null },
    score_summary: {
      ...mockMatches[0].score_summary,
      games: [
        [6, 4],
        [6, 3],
        [1, 3],
      ],
    },
  };
  const result = prepareCompetitionMatch(match);
  assert.equal(result.player1.name, "Ada");
  assert.equal(result.winner, 1);
  assert.equal(displaySetsWon(result, 0), 0);
  assert.equal(displaySetsWon(result, 1), 2);
  assert.equal(eligibleMatch(result), false);
  assert.deepEqual(result.statistics, []);
});
test("draw results are versioned separately and a missing competition artifact cannot activate a remote generation", async () => {
  const rows = mockMatches.map((m) => ({ ...m, data_source: "api" as const }));
  const old = compileRecordSnapshot(rows, new Date("2026-10-20")),
    entry = prepareCompetitionMatch({
      ...rows[0],
      match_id: "retired",
      status: "Retired",
    }),
    next = compileRecordSnapshot(rows, new Date("2026-10-21"), [entry]);
  assert.equal(next.manifest.matchCount, old.manifest.matchCount);
  assert.equal(next.manifest.competitionCount, 1);
  const chosen = await selectGeneration(
    {
      manifest: old.manifest,
      source: "bundled",
      matches: async () => old.matches,
      records: async () => old.players,
    },
    next.manifest,
    async () => ({ matches: next.matches, records: next.players }),
    true,
  );
  assert.equal(chosen.fallbackReason, "remote-incomplete");
});
import { reconcileSeasonResults } from "../lib/result-refresh";
test("modern migration follows empty intermediate pages and preserves all rows until a complete query succeeds", async () => {
  const calls: string[] = [];
  const result = await reconcileSeasonResults(
    2024,
    2026,
    { scope: "atp-main-v1", data: [{ id: 1 }] },
    async (path) => {
      calls.push(path);
      return calls.length === 1
        ? { data: [], meta: { has_more: true, limit: 200 } }
        : { data: [{ id: 2 }], meta: { has_more: false, limit: 200 } };
    },
  );
  assert.equal(calls.length, 2);
  assert.match(calls[0], /from=2024-01-01/);
  assert.match(calls[1], /offset=200/);
  assert.deepEqual(
    result.data.map((r) => r.id),
    [1, 2],
  );
  await assert.rejects(
    reconcileSeasonResults(2024, 2026, null, async () => ({
      data: [],
      meta: { has_more: true, limit: 0 },
    })),
    /pagination/,
  );
});
test("a migrated current season polls old January corrections as well as recent fixtures", async () => {
  const calls: string[] = [];
  await reconcileSeasonResults(
    2026,
    2026,
    { scope: "atp-main-v2", at: "2026-10-21T04:00:00Z", data: [] },
    async (path) => {
      calls.push(path);
      return { data: [], meta: { has_more: false } };
    },
  );
  assert.equal(calls.length, 2);
  assert.match(calls[0], /from=2026-10-14/);
  assert.match(calls[1], /from=2026-01-01/);
  assert.match(calls[1], /restated_since=/);
});

test("women's seasons use their own provider query and publication scope", async () => {
  const calls: string[] = [];
  const result = await reconcileSeasonResults(
    2025, 2026, null,
    async path => { calls.push(path); return { data: [{ id: 42, tour: 'wta' }], meta: { has_more: false, limit: 200 } }; },
    'wta',
  );
  assert.match(calls[0], /tour=wta/);
  assert.equal(result.scope, 'wta-main-v2');
  assert.equal(result.data[0].tour, 'wta');
});
test("a women's Grand Slam final is best of three and remains separate in edition audits", () => {
  const women = {
    ...mockMatches[0], match_id: 'wta-final', tour: 'wta' as const,
    tournament: 'Wimbledon', category: 'Grand Slam', year: 2026, round: 'Final',
    status: 'Finished', winner: 1 as const,
    score_summary: { ...mockMatches[0].score_summary, games: [[6, 4], [6, 3]] },
  };
  const men = { ...women, match_id: 'atp-final', tour: 'atp' as const,
    score_summary: { ...women.score_summary, games: [[6, 4], [6, 3], [6, 4]] } };
  assert.equal(resultIssue(women), null);
  const audits = auditEditions([women, men]);
  assert.equal(audits.length, 2);
  assert.deepEqual(new Set(audits.map(row => row.tour)), new Set(['atp', 'wta']));
});

import { auditEditions } from "../lib/edition-audit";
test("edition audit distinguishes incomplete source results and walkovers without inventing a score", () => {
  const base = { ...mockMatches[0], data_source: "api" as const },
    wo = {
      ...base,
      status: "Walkover",
      winner: 1 as const,
      score_summary: { ...base.score_summary, games: [] },
    };
  const audits = auditEditions([
    base,
    wo,
    {
      ...base,
      status: "Finished",
      score_summary: { ...base.score_summary, games: [[2, 1]] },
    },
  ]);
  assert.equal(audits[0].sourceRows, 3);
  assert.equal(audits[0].terminal, 1);
  assert.equal(audits[0].pending, 1);
  assert.equal(displayTotal(wo, 0), "W/O");
  assert.equal(displayTotal(wo, 1), "—");
});
test("edition audit detects missing quarterfinals, semifinals and finals conservatively",()=>{
  const rows=Array.from({length:4},(_,index)=>({...mockMatches[0],match_id:`qf-${index}`,category:'ATP 250',round:'Quarterfinal'}));
  rows.push({...mockMatches[0],match_id:'sf-1',category:'ATP 250',round:'Semifinal'});
  rows.push({...mockMatches[0],match_id:'final',category:'ATP 250',round:'Final'});
  const [audit]=auditEditions(rows);
  assert.equal(audit.expectedLateRounds,true);
  assert.deepEqual(audit.missingLateRounds,['1 semifinal']);
  assert.equal(audit.completeDraw,false);
});
import {archiveMatches} from '../lib/live-tennis';
import {prepareMatch} from '../lib/quality';
import {editionReferenceMatches,mergeEditionReferences} from '../lib/verified-editions';
import {hasClosedModernResult,recoveredModernResult} from '../lib/modern-result';
import {reconcileEditionSummaries} from '../lib/edition-reconcile';
test('Australian Open 2026 has every round: 120 closed matches, six retirements and the documented Mensik walkover',async()=>{const rows=(await archiveMatches(2026,true)).filter(m=>m.tournament==='Australian Open'&&m.category==='Grand Slam');const [audit]=auditEditions(rows);assert.equal(rows.length,127);assert.equal(new Set(rows.map(m=>m.match_id)).size,127);assert.equal(audit.completed,120);assert.equal(audit.terminal,7);assert.equal(audit.pending,0);assert.deepEqual(audit.rounds,{'1':64,'2':32,'3':16,'4':8,'5':4,'6':2,'7':1});const final=rows.map(prepareMatch).find(m=>m.round==='Final')!;assert.equal(final.final_score,'2–6 6–2 6–3 7–5');assert.equal(final.player1.name,'Carlos Alcaraz');assert.equal(final.winner,1);assert.match(final.context?.resultSource||'',/ausopen.com/);assert.deepEqual(final.point_tape,[]);});
test('a reference never duplicates a subsequently supplied provider contest',()=>{const final=editionReferenceMatches.find(m=>m.tournament==='Australian Open'&&m.round==='Final')!;const provider={...final,match_id:'live-123456',data_source:'api' as const};const result=mergeEditionReferences([provider],2026);assert.equal(result.filter(m=>m.tournament==='Australian Open'&&m.round==='Final').length,1);assert.equal(result.find(m=>m.tournament==='Australian Open'&&m.round==='Final')?.match_id,provider.match_id);});
test('a verified 2025 walkover fills the bracket without becoming a played match',()=>{const row=editionReferenceMatches.find(m=>m.match_id==='reference-winston-salem-2025-korda-withdrawal')!;assert.equal(row.year,2025);assert.equal(row.tour||'atp','atp');assert.equal(row.winner,1);assert.equal(row.score_summary.games.length,0);assert.match(row.context?.resultSource||'',/atptour.com/);assert.match(row.context?.metadataSources?.[0]?.url||'',/winstonsalemopen.com/);assert.equal(eligibleMatch(prepareMatch(row)),false);const rows=mergeEditionReferences([],2025);assert.equal(rows.filter(m=>m.match_id===row.match_id).length,1);assert.equal(mergeEditionReferences([],2026).some(m=>m.match_id===row.match_id),false);});
test('Miami 2026 has all 95 played draw slots and a documented final',async()=>{
  const rows=(await archiveMatches(2026,true)).filter(m=>m.tournament==='Miami'&&m.category==='Masters 1000');
  const [audit]=auditEditions(rows);
  assert.equal(rows.length,95);
  assert.equal(new Set(rows.map(m=>m.match_id)).size,95);
  assert.deepEqual(audit.rounds,{'1':32,'2':32,'3':16,'4':8,'5':4,'6':2,'7':1});
  assert.equal(audit.completed,94);
  assert.equal(audit.terminal,1);
  assert.equal(audit.pending,0);
  const final=rows.map(prepareMatch).find(m=>m.round==='Final')!;
  assert.equal(final.player1.name,'Jannik Sinner');
  assert.equal(final.player2.name,'Jiri Lehecka');
  assert.equal(final.final_score,'6–4 6–4');
  assert.match(final.context?.resultSource||'',/miamiopen.com\/draws/);
});
test('Roland Garros 2026 reconciles every official draw slot without counting retirements as statistical wins',async()=>{
  const rows=(await archiveMatches(2026,true)).filter(m=>m.tournament==='Roland Garros'&&m.category==='Grand Slam');
  const [audit]=auditEditions(rows);
  assert.equal(rows.length,127);
  assert.equal(new Set(rows.map(m=>m.match_id)).size,127);
  assert.deepEqual(audit.rounds,{'1':64,'2':32,'3':16,'4':8,'5':4,'6':2,'7':1});
  assert.equal(audit.completed,118);
  assert.equal(audit.terminal,9);
  assert.equal(audit.pending,0);
  const final=rows.map(prepareMatch).find(m=>m.round==='Final')!;
  assert.equal(final.player1.name,'Alexander Zverev');
  assert.equal(final.player2.name,'Flavio Cobolli');
  assert.equal(final.final_score,'6–1 4–6 6–4 6–7(5) 6–1');
  assert.match(final.context?.resultSource||'',/rolandgarros.com/);
});
test('a coherent saved detail repairs an incomplete season result without replacing a valid result',()=>{
  const base={id:8829,tournament:'French Open',format:'BO5',outcome:'completed',winner:null as number|null,players:{p1:{name:'Félix Auger-Aliassime'},p2:{name:'Alejandro Tabilo'}},score:{games:[[6,7,5],[3,5,1]]}};
  const corrected={...base,winner:1,score:{games:[[6,7,6],[3,5,1]]}};
  assert.equal(hasClosedModernResult(base),false);
  assert.equal(hasClosedModernResult(corrected),true);
  assert.equal(hasClosedModernResult({...corrected,score:{games:[[6,7,6],[3,5,null]]}}),false);
  assert.deepEqual(recoveredModernResult(base,{match:corrected}).score,corrected.score);
  assert.equal(recoveredModernResult(base,{match:corrected}).winner,1);
  assert.equal(recoveredModernResult(corrected,{match:base}),corrected);
  assert.equal(recoveredModernResult({...base,outcome:'retired'},{match:corrected}).outcome,'retired');
  assert.equal(recoveredModernResult(base,{match:{...corrected,players:{p1:{name:'Another player'},p2:{name:'Alejandro Tabilo'}}}}),base);
});
test('publication recovers an invalid list row from its validated detail',()=>{
  const valid={...mockMatches[0],match_id:'live-8829',data_source:'api' as const};
  const incomplete={...valid,winner:null,score_summary:{...valid.score_summary,games:[[6,3],[5,2]]}};
  assert.equal(eligibleMatch(prepareMatch(incomplete)),false);
  const [resolved]=reconcileEditionSummaries([incomplete],[valid]);
  assert.equal(resolved,valid);
  assert.equal(eligibleMatch(prepareMatch(resolved)),true);
  assert.equal(reconcileEditionSummaries([incomplete],[incomplete])[0],incomplete);
});
