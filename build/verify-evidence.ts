import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {recordCatalog} from '../lib/revista/records';
import {recordEvidence} from '../lib/record-evidence';
import {isRecordedTiebreak} from '../lib/historical-rules';
import type {Match} from '../lib/types';
async function main() {
const matches:Match[]=JSON.parse(gunzipSync(await readFile('data/reading/matches.json.gz')).toString());
const manifest=JSON.parse(gunzipSync(await readFile('data/reading/manifest.json.gz')).toString());
const start=performance.now(),catalog=recordCatalog(matches,new Date(manifest.generatedAt));
const fullMs=Math.round(performance.now()-start);
let checked=0;
const countIDs=/^(victorias($|-)|finales-(ganadas|jugadas|remontadas-primer-set|seguidas-ganadas|seguidas-perdidas|cuatro-juegos)$|titulos-|masters-|atp-|temporadas-|top-10$|top-5$|numero-uno$|sin-ceder-set$|seis-cero$|rachas$|bajo-techo$|aire-libre$|remontada-|ganar-menos-juegos$|remontar-rosco$|sets-decisivos$|parejas)/;
for(const piece of catalog) for(const row of piece.rows.slice(0,3)) {
  const evidence=recordEvidence(matches,piece.id,row).matches;
  assert.ok(evidence.length>0,piece.id+' / '+row.name+' has no evidence');
  assert.equal(new Set(evidence.map(m=>m.match_id)).size,evidence.length);
  if(countIDs.test(piece.id))assert.equal(evidence.length,row.value,piece.id+' / '+row.name);
  if(piece.id==='tie-breaks')assert.equal(evidence.reduce((n,m)=>n+m.score_summary.games.filter((g,i)=>isRecordedTiebreak(m,i)&&g[m.player1.name===row.name?0:1]>g[m.player1.name===row.name?1:0]).length,0),row.value);
  checked++;
}
const filtered=matches.filter(m=>m.year===2019),t=performance.now();
const single=recordCatalog(filtered,new Date(manifest.generatedAt),'top-10');
const singleMs=Math.round(performance.now()-t);
const fullFilteredStart=performance.now();
assert.deepEqual(single,recordCatalog([...filtered],new Date(manifest.generatedAt)).filter(p=>p.id==='top-10'));
const filteredFullMs=Math.round(performance.now()-fullFilteredStart);
console.log(JSON.stringify({statistics:catalog.length,leaderEvidenceChecked:checked,fullCatalogueMs:fullMs,filteredSingleMetricMs:singleMs,filteredFullCatalogueMs:filteredFullMs,datasetVersion:manifest.version}));
}
main().catch(error => {console.error(error);process.exitCode=1;});
