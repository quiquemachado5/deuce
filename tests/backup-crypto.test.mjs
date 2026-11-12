import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cryptBackup} from '../ops/vps/backup-crypto.mjs';
test('offsite encryption round-trips bytes and rejects tampering without leaving plaintext',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'deuce-encryption-'));
 try{
  const pair=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
  const input=join(dir,'in'),enc=join(dir,'enc'),out=join(dir,'out'),pub=join(dir,'pub'),priv=join(dir,'priv'),data=randomBytes(120000);
  await Promise.all([writeFile(input,data),writeFile(pub,pair.publicKey),writeFile(priv,pair.privateKey)]);
  await cryptBackup('encrypt',input,enc,pub);assert.notDeepEqual(await readFile(enc),data);
  await cryptBackup('decrypt',enc,out,priv);assert.deepEqual(await readFile(out),data);
  const broken=await readFile(enc);broken[broken.length-25]^=1;await writeFile(enc,broken);
  await assert.rejects(cryptBackup('decrypt',enc,join(dir,'bad'),priv));
  await assert.rejects(access(join(dir,'bad')));await assert.rejects(access(join(dir,'bad.tmp')));
 }finally{await rm(dir,{recursive:true,force:true});}
});
