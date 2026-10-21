import test from "node:test";
import assert from "node:assert/strict";
import { editionTournamentCourt, latestTournamentCourt, tournamentCourt } from "../lib/tournament-presentation";
import type { Match } from "../lib/types";

test("Madrid Masters distinguishes indoor hard from outdoor clay by edition", () => {
  assert.deepEqual(tournamentCourt({ tournament: "Madrid", category: "Masters 1000", year: 2007, surface: "hard" }),
    { surface: "hard", indoor: true, corrected: false });
  assert.deepEqual(tournamentCourt({ tournament: "Madrid", category: "Masters 1000", year: 2009, surface: "clay" }),
    { surface: "clay", indoor: false, corrected: false });
  assert.deepEqual(tournamentCourt({ tournament: "Madrid", category: "Masters 1000", year: 2026, surface: "hard" }),
    { surface: "clay", indoor: false, corrected: true });
});

test("card colour follows the latest edition while historical surfaces remain intact", () => {
  const fixtures = [
    { tournament: "Australian Open", year: 1987, surface: "grass", context: { indoor: null } },
    { tournament: "Australian Open", year: 2026, surface: "hard", context: { indoor: false } },
  ] as Match[];
  const current = latestTournamentCourt(fixtures);
  assert.equal(current.surface, "hard");
  assert.equal(current.year, 2026);
  assert.equal(current.indoor, false);
  assert.equal(fixtures[0].surface, "grass");
});

test("mixed Madrid 2026 provider metadata resolves to clay without mutating the archive", () => {
  const fixtures = [
    { tournament: "Madrid", category: "Masters 1000", year: 2026, surface: "hard", context: { indoor: null } },
    { tournament: "Madrid", category: "Masters 1000", year: 2026, surface: "clay", context: { indoor: false } },
  ] as Match[];
  const current = editionTournamentCourt(fixtures);
  assert.equal(current.surface, "clay");
  assert.equal(current.indoor, false);
  assert.equal(current.corrected, true);
  assert.equal(fixtures[0].surface, "hard");
});

test("city names and unknown conditions never acquire invented classifications", () => {
  assert.deepEqual(tournamentCourt({ tournament: "Madrid", category: "ATP Tour · nivel no especificado", year: 1984, surface: "carpet" }),
    { surface: "carpet", indoor: null, corrected: false });
  assert.deepEqual(tournamentCourt({ tournament: "Paris", year: 2005, surface: "carpet", context: { indoor: true } }),
    { surface: "carpet", indoor: true, corrected: false });
  assert.deepEqual(tournamentCourt({ tournament: "Unknown", year: 2026 }),
    { surface: "unknown", indoor: null, corrected: false });
});
