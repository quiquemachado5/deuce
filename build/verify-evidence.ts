import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {recordCatalog} from '../lib/revista/records';
import {recordEvidence} from '../lib/record-evidence';
import {isRecordedTiebreak} from '../lib/historical-rules';
import type {Match} from '../lib/types';
import {readingSource} from './reading-source';
async function main() {
  const root = readingSource();
  const matches: Match[] = JSON.parse(
    gunzipSync(await readFile(join(root, 'matches.json.gz'))).toString(),
  );
  const manifest = JSON.parse(
    gunzipSync(await readFile(join(root, 'manifest.json.gz'))).toString(),
  );
  const generatedAt = new Date(manifest.generatedAt);
  let checked = 0;
  let statistics = 0;
  let fullMs = 0;
  let singleMs = 0;
  let filteredFullMs = 0;
  const circuits: Record<string, {matches: number; statistics: number}> = {};

  // Evidence is a list of matches. Season, set, game and distinct-rival metrics
  // count a different unit, so their value cannot equal the number of matches.
  const countIDs = /^(victorias($|-)|finales-(ganadas|jugadas|remontadas-primer-set|seguidas-ganadas|seguidas-perdidas|cuatro-juegos)$|titulos-|masters-|atp-|wta-|top-10$|top-5$|numero-uno$|sin-ceder-set$|seis-cero$|rachas$|bajo-techo$|aire-libre$|remontada-|ganar-menos-juegos$|remontar-rosco$|sets-decisivos$|parejas)/;

  for (const tour of ['atp', 'wta'] as const) {
    const tourMatches = matches.filter(match => (match.tour ?? 'atp') === tour);
    assert.ok(tourMatches.length > 0, `${tour.toUpperCase()} has no matches`);

    const start = performance.now();
    const catalog = recordCatalog(tourMatches, generatedAt);
    fullMs += Math.round(performance.now() - start);
    statistics += catalog.length;
    circuits[tour] = {matches: tourMatches.length, statistics: catalog.length};

    for (const piece of catalog) {
      for (const row of piece.rows.slice(0, 3)) {
        const evidence = recordEvidence(tourMatches, piece.id, row).matches;
        assert.ok(evidence.length > 0, `${tour} / ${piece.id} / ${row.name} has no evidence`);
        assert.equal(new Set(evidence.map(match => match.match_id)).size, evidence.length);
        if (countIDs.test(piece.id)) {
          assert.equal(evidence.length, row.value, `${tour} / ${piece.id} / ${row.name}`);
        }
        if (piece.id === 'tie-breaks') {
          assert.equal(
            evidence.reduce(
              (total, match) => total + match.score_summary.games.filter(
                (game, index) => isRecordedTiebreak(match, index)
                  && game[match.player1.name === row.name ? 0 : 1]
                    > game[match.player1.name === row.name ? 1 : 0],
              ).length,
              0,
            ),
            row.value,
          );
        }
        checked++;
      }
    }

    const filtered = tourMatches.filter(match => match.year === 2019);
    const singleStart = performance.now();
    const single = recordCatalog(filtered, generatedAt, 'top-10');
    singleMs += Math.round(performance.now() - singleStart);
    const fullFilteredStart = performance.now();
    assert.deepEqual(
      single,
      recordCatalog([...filtered], generatedAt).filter(piece => piece.id === 'top-10'),
    );
    filteredFullMs += Math.round(performance.now() - fullFilteredStart);
  }

  console.log(JSON.stringify({
    statistics,
    circuits,
    leaderEvidenceChecked: checked,
    fullCatalogueMs: fullMs,
    filteredSingleMetricMs: singleMs,
    filteredFullCatalogueMs: filteredFullMs,
    datasetVersion: manifest.version,
  }));
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
