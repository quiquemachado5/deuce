import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRecordQuery,
  recordDetailModel,
  recordFamilyLabel,
  recordFamilyPresentation,
  recordIndexModel,
  recordScope,
  recordViewIds,
} from "../app/records/record-page-model";
import type { RecordManifest, RecordMeta } from "../lib/revista/snapshot";

const pieces = [
  {
    id: "victorias",
    title: "Más victorias",
    group: "Victorias",
    definition: "Partidos ganados. Solo cuadros principales.",
    leader: { name: "Rafael Nadal", value: 10, sample: 12, href: "/jugadores/rafael-nadal" },
  },
  {
    id: "finales-ganadas",
    title: "Finales ganadas",
    group: "Títulos y finales",
    definition: "Finales ganadas.",
  },
  {
    id: "titulos-clay",
    title: "Títulos en tierra",
    group: "Títulos y finales",
    definition: "Títulos ganados en tierra.",
  },
] as unknown as RecordMeta[];

const manifest = {
  pieces,
  matchCount: 24,
  circuitCoverage: {
    atp: { matches: 24, firstYear: 2001, lastYear: 2024, tournaments: 2 },
    wta: { matches: 12, firstYear: 2020, lastYear: 2024, tournaments: 2 },
  },
  circuitPieces: { atp: pieces, wta: pieces.slice(0, 2) },
} as unknown as RecordManifest;

test("record page query and copy keep ATP and WTA scopes explicit", () => {
  assert.equal(normalizeRecordQuery({ tour: "wta", dato: "victorias" }).tour, "wta");
  assert.equal(normalizeRecordQuery({ tour: "other" }).tour, "atp");
  assert.match(recordScope(manifest, "atp"), /Muestra ATP 2001–2024: 24 resultados/);
  assert.match(recordScope(manifest, "wta"), /Muestra WTA 2020–2024: 12 resultados/);
});

test("record page index filtering is canonical and leaves source pieces untouched", () => {
  const byFamily = recordIndexModel(manifest, {
    tour: "atp",
    grupo: "Títulos y finales",
  });
  assert.deepEqual(byFamily.pieces.map((piece) => piece.id), [
    "finales-ganadas",
    "titulos-clay",
  ]);
  assert.deepEqual(byFamily.visibleGroups, ["Títulos y finales"]);
  assert.equal(byFamily.overview, false);

  const bySearch = recordIndexModel(manifest, { tour: "atp", q: "rafael" });
  assert.deepEqual(bySearch.pieces.map((piece) => piece.id), ["victorias"]);
  assert.equal(manifest.pieces.length, 3);
});

test("record page configuration never reuses ATP-only options for WTA", () => {
  assert.deepEqual(recordViewIds("wta").rankingIds, [
    "victorias",
    "finales-ganadas",
    "partidos-disputados",
  ]);
  assert.ok(!new Set<string>(recordViewIds("wta").insightIds).has("aces"));
  assert.equal(
    recordFamilyPresentation("wta").photoRecords[
      "Remontadas y forma del partido"
    ],
    "remontada-primer-set",
  );
  assert.equal(
    recordFamilyPresentation("atp").photoRecords[
      "Remontadas y forma del partido"
    ],
    "remontada-dos-sets",
  );
});

test("record detail model centralizes title, definition, related records and tours", () => {
  const detail = recordDetailModel(manifest, pieces[0], {
    tour: "atp",
    dato: "victorias",
  });
  assert.equal(detail.title, "Más victorias");
  assert.equal(detail.definition, "Partidos ganados.");
  assert.equal(detail.relatedLabel, "Victorias");
  assert.deepEqual(detail.tourOptions.map((option) => option.value), ["atp", "wta"]);
  assert.equal(recordFamilyLabel("Remontadas y forma del partido"), "Remontadas");
});
