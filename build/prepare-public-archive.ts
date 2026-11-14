import {readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {compilePublicArchiveProducts} from '../lib/public-archive-products';
import type {RecordManifest} from '../lib/revista/snapshot';
import type {Match} from '../lib/types';
async function main(){
 const dir=process.argv[2]||join(process.cwd(),'data','reading');
 const read=async<T>(id:string)=>JSON.parse(gunzipSync(await readFile(join(dir,id+'.json.gz'))).toString()) as T;
 const manifest=await read<RecordManifest>('manifest');
 const current=await read<import('../lib/public-archive-products').PublicArchiveProducts>('public-archive').catch(()=>undefined);
 if(current?.schema===1&&current.version===manifest.version)return;
 const matches:Match[]=[];for(const part of manifest.matchPartitions||[])matches.push(...await read<Match[]>(part.id));
 if(matches.length!==manifest.matchCount)throw new Error('Public archive projection lost matches');
 const product=compilePublicArchiveProducts(matches,await read('players'),manifest,await read<import('../lib/publication-pages').PageRevisions>('page-revisions').catch(()=>undefined),await read('audit'));
 const file=join(dir,'public-archive.json.gz');await writeFile(file+'.tmp',gzipSync(JSON.stringify(product)));await rename(file+'.tmp',file);
 console.info('Public sitemap and coverage prepared:',product.sitemap.length);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
