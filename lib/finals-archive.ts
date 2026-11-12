import 'server-only';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {finalsIdentity} from './finals-identity';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw provider boundary validated below.
type Row=Record<string,any>;
let pending:Promise<{kind:'archive'|'modern';row:Row}[]>|undefined;
/** A sealed local pack; incomplete/checkpoint downloads never enter publication. */
export function finalsArchiveRows():Promise<{kind:'archive'|'modern';row:Row}[]>{
 return pending||=(async()=>{
  const file=join(process.cwd(),'data/archive/finals/results.json.gz');
  let packed:Buffer;try{packed=await readFile(file)}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error}
  const payload=JSON.parse(gunzipSync(packed).toString());
  if(payload.schema!==1||payload.complete!==true||!Array.isArray(payload.data)||payload.count!==payload.data.length||createHash('sha256').update(JSON.stringify(payload.data)).digest('hex')!==payload.sha256)throw new Error('Finals pack failed integrity validation');
  const ids=new Set<string>();
  return payload.data.map((entry:{kind:'archive'|'modern';row:Row})=>{
   const identity=finalsIdentity(entry.row),key=[entry.kind,entry.row.tour,entry.row.id].join(':');
   if(!identity||!['archive','modern'].includes(entry.kind)||!Number.isSafeInteger(entry.row.id)||ids.has(key))throw new Error('Finals pack identity mismatch');
   ids.add(key);return entry;
  });
 })().catch(error=>{pending=undefined;throw error});
}
