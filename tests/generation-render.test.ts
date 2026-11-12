import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('a suspended real RSC render pins one generation while the next request sees the publication',()=>{
 const evidence=JSON.parse(execFileSync(process.execPath,['--conditions=react-server','--import','tsx','build/generation-render-drill.mjs'],{encoding:'utf8',timeout:15_000}));
 assert.equal(evidence.verified,true);assert.equal(evidence.loads,2);
 assert.deepEqual(evidence.observed,[['generation-A','generation-A','generation-A'],['generation-B','generation-B','generation-B']]);
 const source=readFileSync('lib/revista/read-records.ts','utf8');assert.match(source,/const selectedSnapshotSource=requestGenerationSelection\(/);
 assert.match(source,/return generations\(generationSelectionKey\(decision\)/);
 assert.equal((source.match(/await selectedSnapshotSource\(\)/g)||[]).length,1,'Only the validated generation can consume the pointer; readers share its decision');
});
