import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {finalsIdentity} from '../lib/finals-identity';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- persisted raw provider boundary.
type Row=Record<string,any>;
async function main(){
 const key=process.env.TENNIS_API_KEY;if(!key)throw new Error('Missing provider credential');
 const cache=join(process.cwd(),'.deuce-cache/finals-download'),details=join(process.cwd(),'data/archive/details');
 await mkdir(cache,{recursive:true});await mkdir(details,{recursive:true});
 const lock=join(cache,'enrichment.lock');const handle=await open(lock,'wx');await handle.writeFile(String(process.pid));
 let calls=0,downloaded=0,nextAt=0;
 const maximum=Math.min(650,Math.max(0,Number(process.argv.find(arg=>arg.startsWith('--max-calls='))?.split('=')[1]||600)));
 const reserve=200;let remaining=0;
 const checkpoint=()=>writeFile(join(cache,'enrichment.json'),JSON.stringify({at:new Date().toISOString(),calls,downloaded,remaining,reserve},null,2));
 try{
  const request=async(path:string)=>{
   if(calls>=maximum||path!=='/usage'&&remaining<=reserve+1)throw new Error('Quota reserve reached; checkpoint retained');
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,nextAt-Date.now())));nextAt=Date.now()+1150;calls++;
   const response=await fetch('https://api.livetennisapi.com/api/public/v1'+path,{headers:{'X-API-Key':key},signal:AbortSignal.timeout(25000)});remaining=Math.max(0,remaining-1);
   if(!response.ok)throw new Error('Provider '+response.status+'; stopped without automatic retries');
   return response.json();
  };
  const usage=await request('/usage');remaining=Number(usage.today?.remaining_day??usage.remaining_day);if(!Number.isFinite(remaining)||remaining<reserve+10)throw new Error('Provider quota unavailable or below reserve');
  const pack=JSON.parse(gunzipSync(await readFile(join(process.cwd(),'data/archive/finals/results.json.gz'))).toString());
  const queue=(pack.data as {kind:'archive'|'modern';row:Row}[]).filter(entry=>entry.kind==='modern'||(finalsIdentity(entry.row)?.season||0)>=1991).sort((a,b)=>(finalsIdentity(b.row)?.season||0)-(finalsIdentity(a.row)?.season||0)||String(a.row.round_code||a.row.round).localeCompare(String(b.row.round_code||b.row.round))||String(a.row.tour).localeCompare(String(b.row.tour)));
  for(const entry of queue){
   const prefix=(entry.row.tour==='wta'?'wta-':'')+entry.kind+'-'+entry.row.id,file=join(details,prefix+'.json.gz');if(existsSync(file))continue;
   if(calls+2>=maximum||remaining<=reserve+3)break;
   if(downloaded&&downloaded%40===0){const usage=await request('/usage');remaining=Number(usage.today?.remaining_day??usage.remaining_day);if(!Number.isFinite(remaining))throw new Error('Quota reconciliation failed')}
   const path=entry.kind==='archive'?'/history/archive/matches/'+entry.row.id:'/history/matches/'+entry.row.id;
   const detail=await request(path),identity=detail.match||detail;
   if(Number(identity.id)!==entry.row.id||identity.tour&&identity.tour!==entry.row.tour)throw new Error('Detail identity mismatch');
   await writeFile(file+'.tmp',gzipSync(JSON.stringify(detail)));await rename(file+'.tmp',file);downloaded++;
   await checkpoint();if(downloaded%25===0)console.log(JSON.stringify({downloaded,calls,remaining}));
  }
  await checkpoint();console.log(JSON.stringify({status:'checkpoint-saved',downloaded,calls,remaining,reserve}));
 }finally{await handle.close();await unlink(lock)}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Finals enrichment failed');process.exitCode=1});
