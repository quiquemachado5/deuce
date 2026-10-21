import test from "node:test";
import assert from "node:assert/strict";
import { mockMatches } from "../lib/mocks";
import { verifiedResult, verifiedResults } from "../lib/verified-results";
import { prepareMatch, eligibleMatch, canonicalName } from "../lib/quality";
import { recordCatalog } from "../lib/revista/records";
import { recordEvidence } from "../lib/record-evidence";
import type { Match } from "../lib/types";
const fixture = (extra: Partial<Match> = {}): Match => ({
  ...mockMatches[0],
  match_id: "fixture",
  year: 2024,
  tournament: "Roland Garros",
  category: "Grand Slam",
  status: "Finished",
  point_tape: [],
  statistics: [],
  context: { format: "BO5" },
  ...extra,
});
test("all17 FFT/ATP corrections have closed sets, coherent winners and preserve the source reference", () => {
  for (const [id, first, second, result, winner, source] of verifiedResults) {
    const input = fixture({
      match_id: id,
      player1: { name: first, seed: null },
      player2: { name: second, seed: null },
      winner: null,
      score_summary: { ...mockMatches[0].score_summary, games: [[6, 6]] },
      final_score: "6–6",
    });
    const corrected = prepareMatch(input);
    assert.equal(eligibleMatch(corrected), true, id);
    assert.equal(corrected.context?.resultSource, source);
    assert.equal(
      (corrected.winner === 1 ? corrected.player1 : corrected.player2).name,
      canonicalName(winner === 1 ? first : second),
    );
    assert.equal(verifiedResult(input).final_score, result);
    assert.equal(input.final_score, "6–6");
    const reversed = prepareMatch({
      ...input,
      player1: input.player2,
      player2: input.player1,
    });
    assert.equal(eligibleMatch(reversed), true);
    assert.equal(reversed.final_score, corrected.final_score);
  }
});
test("a reference never repairs another identity, year or a retirement", () => {
  const ref = verifiedResults[0];
  const input = fixture({
    match_id: ref[0],
    player1: { name: ref[1], seed: null },
    player2: { name: ref[2], seed: null },
  });
  for (const extra of [
    { year: 2023 },
    { player1: { name: "Other", seed: null } },
    { status: "Retired" },
  ]) {
    const m = { ...input, ...extra };
    assert.equal(verifiedResult(m), m);
  }
});
test("new result records and their evidence use the same eligibility and exact predicates", () => {
  const make = (id: string, games: number[][]): Match =>
    fixture({
      match_id: id,
      tournament: "Example",
      category: "ATP 500",
      context: { format: "BO3" },
      player1: { name: "One", seed: null },
      player2: { name: "Two", seed: null },
      winner: 1,
      round: "Final",
      score_summary: {
        ...mockMatches[0].score_summary,
        games,
        sets: [
          games.filter((s) => s[0] > s[1]).length,
          games.filter((s) => s[1] > s[0]).length,
        ],
      },
    });
  const matches = [
    make("fewer", [
      [0, 6],
      [7, 6],
      [7, 6],
    ]),
    make("final", [
      [6, 0],
      [6, 4],
    ]),
    make("bad", [
      [6, 6],
      [6, 4],
    ]),
  ];
  for (const id of [
    "ganar-menos-juegos",
    "remontar-rosco",
    "finales-cuatro-juegos",
  ]) {
    const piece = recordCatalog(matches, new Date("2026-10-21"), id)[0];
    assert.ok(piece, id);
    assert.equal(piece.rows[0].value, 1, id);
    assert.equal(
      recordEvidence(matches, id, piece.rows[0]).matches.length,
      1,
      id,
    );
  }
});
