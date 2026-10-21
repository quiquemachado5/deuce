import { cp, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
// Only published archive artifacts. Never includes .env, auth, or database credentials.
const source = join(process.cwd(),'data','reading');
const location = await mkdtemp(join(tmpdir(),'deuce-restore-drill-'));
const backup = join(location,'backup'), restored = join(location,'restored');
await cp(source,backup,{recursive:true,errorOnExist:true,force:false});
const files = (await readdir(backup)).filter(f => f.endsWith('.json.gz')).sort();
const hashes = {};
for(const file of files) hashes[file] = createHash('sha256').update(await readFile(join(backup,file))).digest('hex');
await writeFile(join(location,'checksums.json'),JSON.stringify(hashes,null,2),{flag:'wx'});
await cp(backup,restored,{recursive:true,errorOnExist:true,force:false});
for(const file of files) assert.equal(createHash('sha256').update(await readFile(join(restored,file))).digest('hex'),hashes[file]);
const decode = async name => JSON.parse(gunzipSync(await readFile(join(restored,name+'.json.gz'))).toString());
const manifest = await decode('manifest'), matches = await decode('matches'), players = await decode('players');
assert.equal(matches.length,manifest.matchCount);
assert.equal(new Set(matches.map(m => m.match_id)).size,matches.length);
assert.ok(players.length > 0);
const validIds = new Set(matches.map(m => m.match_id));
for (const p of players) assert.ok(p.matchIds.every(id => validIds.has(id)));
for (const piece of manifest.pieces) {
  const record = await decode('piece-'+piece.id);
  const rows = Object.values(record.pages).flat(), small = Object.values(record.smallPages).flat();
  assert.equal(rows.length,piece.total); assert.equal(small.length,piece.smallTotal);
  for(const row of [...rows,...small]) if(row.proof)assert.ok(validIds.has(row.proof.match_id));
}
console.log(JSON.stringify({status:'verified',files:files.length,matches:matches.length,statistics:manifest.pieces.length,datasetVersion:manifest.version,location,scope:'Bundled published generation only; not a Supabase PITR restore'},null,2));
