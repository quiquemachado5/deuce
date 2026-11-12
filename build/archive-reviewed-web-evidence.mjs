import {createApprovedFetch} from './approved-media-fetch.mjs';
const fetch=createApprovedFetch(["agerpres.ro", "as.com", "bossopen.com", "desarrollo.mutuamadridopen.com", "dubaidutyfreetennischampionships.com", "dziendobry.tvn.pl", "edgeup.gg", "elpais.com", "en.tennistemple.com", "en.wikipedia.org", "epub.stripes.com", "fieldlevelmedia.com", "hts.hr", "news.rthk.hk", "setlex.co", "sport.sky.de", "sport.sky.it", "wtafiles.wtatennis.com", "www.365scores.com", "www.asbclassic.co.nz", "www.atptour.com", "www.berliner-zeitung.de", "www.erstebank-open.com", "www.eurosport.es", "www.eurosport.fr", "www.glasistre.hr", "www.gulf-times.com", "www.idnes.cz", "www.irozhlas.cz", "www.itftennis.com", "www.lequipe.fr", "www.lta.org.uk", "www.lunosport.com", "www.malaymail.com", "www.moselle-open.com", "www.mundodeportivo.com", "www.mykhel.com", "www.rolandgarros.com", "www.rte.ie", "www.rtve.es", "www.sofascore.com", "www.tennis.com", "www.tennis.com.au", "www.tennisabstract.com", "www.tennisexplorer.com", "www.tennislive.net", "www.tennismajors.com", "www.the-independent.com", "www.tntsports.co.uk", "www.usopen.org", "www.wtatennis.com"]);
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

// Offline audit evidence: never a request to the paid results provider.
const rows=JSON.parse(await readFile('lib/verified-web-2026-11-11.json','utf8'));
const root='data/archive/references/web-2026-11-11';await mkdir(root,{recursive:true});
const previous=await readFile(root+'/manifest.json','utf8').then(JSON.parse).catch(()=>[]);
const existing=new Map(previous.map(row=>[row.url,row]));
const urls=[...new Set(rows.flatMap(row=>[row.source,row.corroboration,...row.evidence]))];
let cursor=0;
await Promise.all(Array.from({length:3},async()=>{while(cursor<urls.length){
 const url=urls[cursor++];if(existing.get(url)?.sha256)continue;
 const id=createHash('sha256').update(url).digest('hex').slice(0,24);
 try{
  const response=await fetch(url,{headers:{'User-Agent':'DEUCEArchive/1.0 (https://deucearchive.com; archival source verification)'},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>12_000_000)throw Error('Evidence response exceeds 12 MB');
  await writeFile(`${root}/${id}.gz`,gzipSync(bytes));
  existing.set(url,{url,file:id+'.gz',retrievedAt:new Date().toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,contentType:response.headers.get('content-type')});
 }catch(error){existing.set(url,{url,retrievedAt:new Date().toISOString(),error:error.message})}
}}));
await writeFile(root+'/manifest.tmp.json',JSON.stringify([...existing.values()],null,2)+'\n');await rename(root+'/manifest.tmp.json',root+'/manifest.json');
console.log(JSON.stringify({cases:rows.length,archived:[...existing.values()].filter(r=>r.sha256).length,unavailable:[...existing.values()].filter(r=>r.error).length,liveTennisCalls:0}));
