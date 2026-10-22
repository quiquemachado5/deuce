import test from "node:test";
import assert from "node:assert/strict";
import { mockMatches } from "../lib/mocks";
import { prepareCompetitionMatch } from "../lib/competition";
import { eligibleMatch } from "../lib/quality";
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
