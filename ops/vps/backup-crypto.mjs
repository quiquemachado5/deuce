import {createCipheriv,createDecipheriv,publicEncrypt,privateDecrypt,randomBytes,constants} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {open,readFile,writeFile,appendFile,rename,rm,stat} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';

export async function cryptBackup(mode,input,output,keyFile){
 const temporary=output+'.tmp';
 try{
  const key=await readFile(keyFile);
  if(mode==='encrypt'){
   const secret=randomBytes(32),iv=randomBytes(12);
   const wrapped=publicEncrypt({key,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},secret);
   const header=Buffer.from(JSON.stringify({format:'deuce-backup-v1',key:wrapped.toString('base64'),iv:iv.toString('base64')})+'\n');
   const cipher=createCipheriv('aes-256-gcm',secret,iv);cipher.setAAD(header);
   await writeFile(temporary,header,{mode:0o600,flag:'wx'});
   await pipeline(createReadStream(input),cipher,createWriteStream(temporary,{flags:'a'}));
   await appendFile(temporary,cipher.getAuthTag());
  }else if(mode==='decrypt'){
   const handle=await open(input);let prefix,tag;
   try{prefix=Buffer.alloc(4096);const r=await handle.read(prefix,0,prefix.length,0);prefix=prefix.subarray(0,r.bytesRead);const size=(await handle.stat()).size;tag=Buffer.alloc(16);await handle.read(tag,0,16,size-16);}finally{await handle.close();}
   const end=prefix.indexOf(10);if(end<0)throw Error('Invalid backup envelope');
   const header=prefix.subarray(0,end+1),meta=JSON.parse(header.toString());
   if(meta.format!=='deuce-backup-v1')throw Error('Unsupported backup format');
   const secret=privateDecrypt({key,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(meta.key,'base64'));
   const decipher=createDecipheriv('aes-256-gcm',secret,Buffer.from(meta.iv,'base64'));decipher.setAAD(header);decipher.setAuthTag(tag);
   await pipeline(createReadStream(input,{start:end+1,end:(await stat(input)).size-17}),decipher,createWriteStream(temporary,{mode:0o600,flags:'wx'}));
  }else throw Error('Expected encrypt or decrypt');
  await rename(temporary,output);
 }catch(error){await rm(temporary,{force:true});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,input,output,key]=process.argv.slice(2);
 if(!mode||!input||!output||!key)throw Error('Usage: backup-crypto.mjs encrypt|decrypt input output key');
 await cryptBackup(mode,input,output,key);
}
