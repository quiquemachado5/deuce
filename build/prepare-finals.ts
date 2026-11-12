import {readFile,readdir,mkdir,writeFile,rename} from 'node:fs/promises';
import {join,relative,basename} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {finalsIdentity} from '../lib/finals-identity';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw source archive, validated before sealing.
type Row=Record<string,any>;
const root=process.cwd(),downloads=join(root,'.deuce-cache/finals-download'),directory=join(root,'data/archive/finals');
const data:{kind:'archive'|'modern';row:Row;source:{file:string;sha256:string;pointer:string;endpoint:string}}[]=[];
const ids=new Map<string,string>();
const hash=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
async function add(file:string,kind:'archive'|'modern',endpoint:string,expectedTour?:string){
 const bytes=await readFile(file),page=JSON.parse((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
 let sourceFile=file,sourceBytes=bytes;
 if(file.startsWith(downloads+'/')){
  sourceFile=join(directory,'sources',basename(file)+'.gz');sourceBytes=gzipSync(bytes);
  await writeFile(sourceFile+'.tmp',sourceBytes);await rename(sourceFile+'.tmp',sourceFile);
 }
 if(!Array.isArray(page.data)||page.complete===false||page.count!==undefined&&page.count!==page.data.length)throw new Error('Incomplete Finals source: '+relative(root,file));
 for(const [index,row] of page.data.entries()){
  if(expectedTour&&row.tour&&row.tour!==expectedTour)throw new Error('Circuit contamination');
  const identity=finalsIdentity({...row,tour:row.tour||expectedTour});if(!identity)continue;
  if(!Number.isSafeInteger(row.id)||row.id<1)throw new Error('Invalid provider identity');
  const key=[kind,identity.tour,row.id].join(':'),signature=hash(JSON.stringify(row));
  if(ids.has(key)){if(ids.get(key)!==signature)throw new Error('Conflicting Finals observation: '+key);continue}
  ids.set(key,signature);data.push({kind,row:{...row,tour:identity.tour},source:{file:relative(root,sourceFile),sha256:hash(sourceBytes),pointer:'/data/'+index,endpoint}});
 }
}
async function main(){
await mkdir(join(directory,'sources'),{recursive:true});
const catalog=await readFile(join(downloads,'tournament-3195.json'));
await writeFile(join(directory,'sources','tournament-3195.json.gz'),gzipSync(catalog));
// Validate the downloaded pagination as a whole before accepting its rows.
let total:number|undefined,next=0;
for(const offset of [0,200,400]){
 const file=join(downloads,`atp-history-${offset}.json`),page=JSON.parse(await readFile(file,'utf8'));
 if(page.meta?.offset!==offset||page.meta?.count!==page.data?.length||page.meta?.has_more!==(offset<400)||total!==undefined&&page.meta.total!==total)throw new Error('Unsealed ATP Finals pagination');
 total=page.meta.total;next+=page.data.length;
 await add(file,'archive',`/history/archive/matches?tour=atp&level=F&from=1968-01-01&to=2022-12-31&limit=200&offset=${offset}`,'atp');
}
if(next!==total)throw new Error('ATP Finals source total mismatch');
for(const file of (await readdir(join(root,'data/archive/lists'))).filter(name=>/^archive-\d{4}-M-\d+\.json\.gz$/.test(name)))await add(join(root,'data/archive/lists',file),'archive','/history/archive/matches?tour=atp&level=M','atp');
for(const file of (await readdir(join(root,'data/archive/wta'))).filter(name=>/^archive-\d{4}-(F|W)\.json\.gz$/.test(name)))await add(join(root,'data/archive/wta',file),'archive','/history/archive/matches?tour=wta','wta');
for(const tour of ['atp','wta']){
 const file=join(downloads,`${tour}-modern-0.json`),page=JSON.parse(await readFile(file,'utf8'));
 if(page.meta?.has_more!==false||page.meta?.offset!==0)throw new Error('Incomplete modern Finals page');
 await add(file,'modern',`/history/matches?tour=${tour}&tier=${tour}_finals&draw=singles&from=2023-01-01&to=2026-12-31&limit=200&offset=0`,tour);
}
const current=JSON.parse(await readFile(join(downloads,'wta-2026-window.json'),'utf8'));
if(current.meta?.has_more!==false||current.meta?.count!==current.data.length)throw new Error('Incomplete 2026 Finals date window');
await add(join(downloads,'wta-2026-window.json'),'modern','/history/matches?tour=wta&draw=singles&from=2026-11-08&to=2026-11-11&limit=200&offset=0','wta');
// The feed omits RR on some modern editions. Derive it only when all twelve
// edges form two six-match groups (allowing one alternate), with one final and two semis.
const modernEditions=new Map<string,typeof data>();
for(const entry of data){const id=finalsIdentity(entry.row)!;if(id.tour==='atp'&&id.season<=1971)entry.row={...entry.row,round:'RR',_deuce_round_evidence:{method:'official-all-round-robin-format',source:'https://www.nittoatpfinals.com/en/heritage/results-1970-1999'}}}
for(const entry of data.filter(entry=>entry.kind==='modern')){const id=finalsIdentity(entry.row)!;const key=id.tour+'|'+id.season;modernEditions.set(key,[...(modernEditions.get(key)||[]),entry])}
for(const entries of modernEditions.values()){
 const unknown=entries.filter(entry=>!entry.row.round_code),edges=unknown.map(({row})=>[row.players?.p1?.name,row.players?.p2?.name]);
 const graph=new Map<string,Set<string>>();for(const [a,b] of edges){if(!a||!b)continue;graph.set(a,new Set([...(graph.get(a)||[]),b]));graph.set(b,new Set([...(graph.get(b)||[]),a]))}
 const components:string[][]=[],seen=new Set<string>();for(const name of graph.keys()){if(seen.has(name))continue;const pending=[name],component:string[]=[];while(pending.length){const next=pending.pop()!;if(seen.has(next))continue;seen.add(next);component.push(next);pending.push(...graph.get(next)!)}components.push(component)}
 const firstSemi=entries.filter(e=>e.row.round_code==='SF').map(e=>String(e.row.scheduled_time)).sort()[0];
 if(entries.length===15&&unknown.length===12&&entries.filter(e=>e.row.round_code==='F').length===1&&entries.filter(e=>e.row.round_code==='SF').length===2&&components.length===2&&components.every(c=>c.length>=4&&c.length<=5&&c.every(name=>(graph.get(name)?.size||0)<=4)&&edges.filter(edge=>c.includes(edge[0])).length===6)&&new Set(edges.map(pair=>pair.sort().join('|'))).size===12&&unknown.every(e=>String(e.row.scheduled_time)<firstSemi)){
  for(const entry of unknown)entry.row={...entry.row,round_code:'RR',_deuce_round_evidence:{method:'two-disjoint-six-match-groups-with-alternates',source:entry.row.tour==='atp'?'https://www.nittoatpfinals.com/en/event/rules-and-format':'https://www.wtatennis.com/wta-finals'}};
 }
}
data.sort((a,b)=>String(a.row.tour).localeCompare(String(b.row.tour))||a.kind.localeCompare(b.kind)||a.row.id-b.row.id);
const at=new Date().toISOString(),payload={schema:1,complete:true,count:data.length,at,sha256:hash(JSON.stringify(data)),sources:['https://docs.livetennisapi.com/historical-results-archive.html','https://www.nittoatpfinals.com/en/heritage/results-1970-1999','https://wtafiles.wtatennis.com/pdf/publications/WTAMG25_WTAFinals.pdf'],data};
await mkdir(directory,{recursive:true});
await writeFile(join(directory,'results.json.gz.tmp'),gzipSync(JSON.stringify(payload)));await rename(join(directory,'results.json.gz.tmp'),join(directory,'results.json.gz'));
const groups=new Map<string,number>();for(const entry of data){const id=finalsIdentity(entry.row)!;const key=[id.tour,id.season,id.tournament].join('|');groups.set(key,(groups.get(key)||0)+1)}
const report={schema:1,at,count:data.length,byTour:Object.fromEntries(['atp','wta'].map(tour=>[tour,data.filter(entry=>entry.row.tour===tour).length])),editions:[...groups].sort().map(([edition,rows])=>({edition,rows})),excluded:['Next Gen Finals','WCT Finals','WTA Elite Trophy / Zhuhai / Tournament of Champions'],certification:'Provider results imported; completeness by historical format requires independent edition certification.'};
await writeFile(join(directory,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({count:report.count,byTour:report.byTour,editions:groups.size}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Finals preparation failed');process.exitCode=1});
