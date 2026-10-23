import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { featuredFinal, homeTotals, homeRecordStories } from "../lib/home-story";
import { homeMaterials } from "../lib/home-photography";
import type { Match } from "../lib/types";

function match(overrides: Partial<Match> = {}): Match {
  return { match_id: "example", tournament: "Shanghai", surface: "hard", category: "Masters 1000", year: 2026,
    player1: { name: "Alejandro Davidovich Fokina", seed: null }, player2: { name: "Rafael Jódar", seed: null },
    score_summary: { games: [[1,6],[7,6],[6,4]], sets: [2,1], points: [], server: null, is_tiebreak: false, win_probability_p1: null, timestamp: "" },
    final_score: "1–6 7–6(5) 6–4", round: "Final", winner: 1, status: "finished", point_tape: [], statistics: [], data_source: "reference", ...overrides };
}

test("season totals exclude other years and distinguish final from semifinal", () => {
  const data = homeTotals([match(), match({ round: "Semifinal", surface: "clay" }), match({ year: 2025, surface: "grass" }), match({ surface: "unknown" })], 2026);
  assert.deepEqual(data.season, { matches: 3, finals: 2, hard: 1, clay: 1, grass: 0, other: 1 });
  assert.equal(Object.values(data.surfaces).reduce((a,b) => a+b,0), 4);
  assert.equal(data.season.hard + data.season.clay + data.season.grass + data.season.other, data.season.matches);
});

test('home follows the published leader and does not invent missing record values', () => {
  assert.deepEqual(homeRecordStories([]), []);
  const first = homeRecordStories([{ id: 'top-10', leader: { name: 'Novak Djokovic', value: 191 } }]);
  assert.equal(first[0].value, 191);
  const changed = homeRecordStories([{ id: 'top-10', leader: { name: 'Otro líder', value: 192 } }]);
  assert.equal(changed[0].name, 'Otro líder');
  assert.equal(changed[0].value, 192);
});

test("the editorial final cannot silently become another match", () => {
  assert.equal(featuredFinal([match({ round: "Octavos de final" })]), "live-205270");
  assert.equal(featuredFinal([match({ year: 2025 })]), "live-205270");
  assert.equal(featuredFinal([match({ tournament: "Shanghái", match_id: "verified-final" })]), "verified-final");
});

test("each material has a distinct documented photograph and responsive assets", () => {
  assert.equal(new Set(homeMaterials.map(item => item.photo.src)).size, 3);
  for (const { photo } of homeMaterials) {
    assert.ok(photo.credit && photo.source && photo.licenseUrl);
    for (const size of [768,1440,2400]) assert.ok(readFileSync(`public${photo.src.replace('.webp', `-${size}.webp`)}`).length > 0);
  }
});

test("motion is enhancement only; reduced motion exposes all record scenes", () => {
  const css = readFileSync("app/home-story.module.css", "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.story \.recordScene \{ position: relative !important; opacity: 1 !important; transform: none !important;/);
  const page = readFileSync("app/page.tsx", "utf8");
  assert.equal((page.match(/<HomeSearch /g) || []).length, 1);
  assert.doesNotMatch(page, /MatchCard|QuickH2H|HomeFeaturedFinal|HomeHighlights|HomeSeason|HomeExplore/);
});
