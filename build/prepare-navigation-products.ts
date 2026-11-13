import {readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {compileNavigationProducts,type NavigationIndex} from '../lib/navigation-products';
import type {PlayerRecord} from '../lib/season-analytics';
import type {Match} from '../lib/types';
import type {RecordManifest} from '../lib/revista/snapshot';
async function main(){
const directory=process.argv[2]||join(process.cwd(),'data','reading');
const read=async<T>(id:string)=>JSON.parse(gunzipSync(await readFile(join(directory,`${id}.json.gz`))).toString()) as T;
const manifest=await read<RecordManifest>('manifest');
const existing=await read<NavigationIndex>('navigation-index').catch(()=>undefined);
if(existing?.schema===1&&existing.count===manifest.matchCount){console.info('Navigation products reused:',existing.count);}
else{
 const matches:Match[]=[];
 for(const partition of manifest.matchPartitions||[])matches.push(...await read<Match[]>(partition.id));
 if(matches.length!==manifest.matchCount)throw new Error('Navigation projection does not match the published match count');
 const products=compileNavigationProducts(matches,await read<PlayerRecord[]>('players'));let entities=0,bytes=0;
 async function write(id:string,value:unknown){const path=join(directory,`${id}.json.gz`),encoded=gzipSync(JSON.stringify(value));await writeFile(path+'.tmp',encoded);await rename(path+'.tmp',path);bytes+=encoded.length;}
 for(const [id,entity] of products.entities()){await write(id,entity);entities++;}
 // The index is the completion marker; a failed attempt is never reusable.
 await write('navigation-index',products.index);
 console.info('Navigation products prepared:',JSON.stringify({matches:matches.length,entities,bytes}));
}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
