import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const references=JSON.parse(await readFile('lib/verified-web-2026-11-11.json','utf8'));
const read=async key=>JSON.parse(gunzipSync(await readFile(`data/reading/${key}.json.gz`)).toString());
const manifest=await read('manifest');
const played=(await Promise.all(manifest.matchPartitions.map(part=>read(part.key||part.id))));
const all=[...played.flat(),...await read('competition')];
const selected=all.filter(m=>references.some(ref=>m.match_id===`reference-${ref.id}`));
if(selected.length!==references.length)throw Error(`Published ${selected.length}/${references.length} repairs`);
if(new Set(selected.map(m=>`${m.tour}:${m.match_id}`)).size!==selected.length)throw Error('Duplicate repair ids');
for(const ref of references){
 const match=selected.find(m=>m.match_id===`reference-${ref.id}`);
 if(match.tour!==ref.tour||match.year!==ref.year||match.tournament!==ref.tournament||match.context?.resultSource!==ref.source)throw Error('Repair identity drift: '+ref.id);
 const sources=[match.context.resultSource,...(match.context.metadataSources||[]).map(s=>s.url)];
 const hosts=new Set(sources.map(url=>new URL(url).hostname.replace(/^www\./,'')));
 if(hosts.size<3)throw Error('Missing published corroboration: '+ref.id);
 if(ref.status==='Walkover'&&(match.final_score||match.score_summary.games.length||match.point_tape.length||match.statistics.length))throw Error('Invented tennis in walkover: '+ref.id);
 if(ref.status==='Finished'&&(match.status!=='Finished'||match.score_summary.games.length<2))throw Error('Played result omitted: '+ref.id);
}
console.log(JSON.stringify({version:manifest.version,publishedRepairs:selected.length,distinctCircuitIdentities:true,threeSourceHosts:true,played:selected.filter(m=>m.status==='Finished').length,terminal:selected.filter(m=>m.status!=='Finished').length,liveTennisCalls:0}));
