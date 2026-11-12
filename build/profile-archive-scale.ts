import {readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import {createGzip,gunzipSync} from 'node:zlib';
import {selectCompressedArray} from '../lib/revista/read-records';
import {decodeMatchBrowserRow,type MatchBrowserIndex,type MatchBrowserPartition} from '../lib/match-browser-snapshot';
import type{Match}from'../lib/types';

async function main(){
// Offline, allocation-bounded stress test: no server, API, database or dataset writes.
const factor=Number(process.argv.find(v=>v.startsWith('--factor='))?.split('=')[1]||10);
if(!Number.isInteger(factor)||factor<1||factor>10)throw new Error('factor must be1–10');
const read=<T>(id:string)=>JSON.parse(gunzipSync(readFileSync(`data/reading/${id}.json.gz`)).toString())as T;
const index=read<MatchBrowserIndex>('browser-index'),manifest=read<{version:string}>('manifest');
const partition=read<MatchBrowserPartition>(`browser-${index.partitions.at(-1)!.id}`);
const template=decodeMatchBrowserRow(partition,partition.rows[0]);
const count=index.count*factor;
const started=performance.now();global.gc?.();
const baseline=process.memoryUsage();let peakRss=baseline.rss,peakHeap=baseline.heapUsed,decodedBytes=0;
const sample=()=>{const m=process.memoryUsage();peakRss=Math.max(peakRss,m.rss);peakHeap=Math.max(peakHeap,m.heapUsed);};
const timer=setInterval(sample,10);
async function* rows(){
 yield '[';
 for(let offset=0;offset<count;offset+=64){
  const batch=[];
  for(let i=offset;i<Math.min(count,offset+64);i++)batch.push(JSON.stringify({...template,match_id:`scale-${i}`}));
  const chunk=(offset?',':'')+batch.join(',');decodedBytes+=Buffer.byteLength(chunk);yield chunk;
 }
 yield ']';
}
try{
 const input=Readable.from(rows()).pipe(createGzip({level:1}));
 const result=await selectCompressedArray<Match>(input,row=>row.match_id===`scale-${count-1}`);
 sample();
 if(result.count!==count||result.selected.length!==1||!result.complete)throw new Error('Scale test lost rows');
 const rssBudget=384*1024*1024;if(peakRss>rssBudget)throw new Error(`Streaming RSS ${peakRss} exceeds ${rssBudget}`);
 console.log(JSON.stringify({verified:true,datasetVersion:manifest.version,phase:'streaming detailed shard selection',synthetic:true,factor,baseMatches:index.count,rows:count,decodedBytes,selected:result.selected.length,elapsedMs:Math.round(performance.now()-started),baselineRss:baseline.rss,peakRss,peakHeap,rssBudget,limitations:'Measures full streaming scan only; not complete publication or every statistical aggregate.'}));
}finally{clearInterval(timer);}

}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
