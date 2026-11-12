import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../ops/vps/export-backup.sh',import.meta.url));
for(const command of ['bash','download:../../.env.production','download:deuce-archive-20261112T000000Z.tar.gz','ack:x:123','metadata; env']){
 test('restricted backup reader rejects '+command,()=>{
  const result=spawnSync('bash',[script],{env:{...process.env,SSH_ORIGINAL_COMMAND:command},encoding:'utf8'});
  assert.equal(result.status,64);assert.equal(result.stdout,'');
 });
}
