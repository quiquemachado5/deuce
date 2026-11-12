import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';
const dir = 'data/archive/refresh', staging = '.deuce-cache/provider-refresh';
await Promise.all([mkdir(dir,{recursive:true}),mkdir(staging,{recursive:true})]);
const key=process.env.TENNIS_API_KEY;if(!key)throw new Error('Missing provider credential');
const base='https://api.livetennisapi.com/api/public/v1';
const max=Number(process.argv.find(arg=>arg.startsWith('--max-calls='))?.split('=')[1]||180);
const first=Number(process.argv.find(arg=>arg.startsWith('--first-year='))?.split('=')[1]||2023);
let calls=0,remaining=0;
async function request(path){
  if(calls>=max||remaining<250&&calls>0)throw new Error('Budget reached; checkpoint preserved');
  await delay(1250);
  const response=await fetch(`${base}${path}`,{headers:{'X-API-Key':key},signal:AbortSignal.timeout(45000)});calls++;
  if(!response.ok)throw new Error(`Provider HTTP ${response.status}; checkpoint preserved`);
  const payload=await response.json();remaining--;return payload;
}
async function atomic(path,body){await writeFile(`${path}.tmp`,body,{mode:0o600});await rename(`${path}.tmp`,path);}
const usage=await request('/usage');remaining=Number(usage.today?.remaining_day??usage.remaining_day??0);
if(remaining<300)throw new Error('Insufficient reserve');
console.log(JSON.stringify({remaining,maxCalls:max,reserve:250}));
for(let year=new Date().getUTCFullYear();year>=first;year--)for(const tour of ['atp','wta']){
  const id=`modern-${year}-${tour}`,path=`${dir}/${id}.json.gz`;
  const saved=await readFile(path).then(buffer=>JSON.parse(gunzipSync(buffer))).catch(()=>null);
  if(saved?.complete&&saved.qualificationPolicy==='exclude-true'&&Date.now()-Date.parse(saved.at)<12*3600_000){console.log(`${id}: already refreshed`);continue;}
  const tiers=tour==='atp'?'grand_slam,atp_1000,atp_500,atp_250':'grand_slam,wta_1000,wta_500,wta_250';
  const query=new URLSearchParams({tour,draw:'singles',tier:tiers,from:`${year}-01-01`,to:`${year}-12-31`,limit:'200'});
  const signature=query.toString();
  const candidate=await readFile(`${staging}/${id}.json.gz`).then(buffer=>JSON.parse(gunzipSync(buffer))).catch(()=>null);
  const checkpoint=candidate?.signature===signature?candidate:{data:[],offset:0,pages:[]};
  let offset=checkpoint.offset,rows=checkpoint.data,pages=checkpoint.pages;
  for(;;){
    query.set('offset',String(offset));const endpoint=`/history/matches?${query}`,payload=await request(endpoint);
    if(!Array.isArray(payload.data)||payload.meta?.offset!==offset||typeof payload.meta?.has_more!=='boolean'||payload.meta?.count!==payload.data.length)throw new Error('Invalid pagination');
    if(payload.data.some(row=>row.tour!==tour||row.is_doubles===true||row.draw!=='singles'))throw new Error('Circuit or discipline contamination');
    rows.push(...payload.data);
    if(new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error('Repeated provider identities; restart this cohort');
    pages.push({endpoint,retrievedAt:new Date().toISOString(),meta:payload.meta});
    offset+=200;
    await atomic(`${staging}/${id}.json.gz`,gzipSync(JSON.stringify({data:rows,offset,pages,signature})));
    if(!payload.meta.has_more)break;
  }
  const principal=rows.filter(row=>row.is_qualifying!==true&&!/qualif/i.test(row.round||''));
  await atomic(path,gzipSync(JSON.stringify({schema:1,qualificationPolicy:'exclude-true',complete:true,tour,year,at:new Date().toISOString(),count:principal.length,data:principal,pages})));
  console.log(JSON.stringify({cohort:id,count:principal.length,downloaded:rows.length,calls,remaining}));
}
