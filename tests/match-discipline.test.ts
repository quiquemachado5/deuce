import assert from "node:assert/strict";
import test from "node:test";
import { matchDiscipline, singlesMatches } from "../lib/match-discipline";

function match(player1: string, player2: string, raw_fixture?: unknown) {
  return {
    player1: { name: player1, seed: null },
    player2: { name: player2, seed: null },
    raw_fixture,
  };
}

test("provider discipline metadata takes priority when it is available", () => {
  assert.equal(matchDiscipline(match("Player one", "Player two", { is_doubles: true, draw: "doubles" })), "doubles");
  assert.equal(matchDiscipline(match("Team / Label", "Other / Label", { is_doubles: false, draw: "singles" })), "singles");
  assert.equal(matchDiscipline(match("Player one", "Player two", { match: { players: { p1: { is_doubles_team: true } } } })), "doubles");
});

test("published team labels identify doubles after raw fixtures are removed", () => {
  assert.equal(matchDiscipline(match("Aleksandra Krunic / Anna Danilina", "Katerina Siniakova / Taylor Townsend")), "doubles");
  assert.equal(matchDiscipline(match("Maja Chwalinska", "Mirra Andreeva")), "singles");
});

test("singles tournament views exclude pair rows without changing their order", () => {
  const rows = [
    { id: "single-final", ...match("Maja Chwalinska", "Mirra Andreeva") },
    { id: "doubles-final", ...match("Aleksandra Krunic / Anna Danilina", "Katerina Siniakova / Taylor Townsend") },
    { id: "single-semi", ...match("Diana Shnaider", "Maja Chwalinska") },
  ];

  assert.deepEqual(singlesMatches(rows).map((row) => row.id), ["single-final", "single-semi"]);
});
