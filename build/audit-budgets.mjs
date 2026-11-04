import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gunzipSync } from 'node:zlib';

const root=process.cwd(),next=join(root,'.next'),failures=[],routes=[];
async function files(dir,extension){
  const found=[];
  for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){
    const path=join(dir,entry.name);
    if(entry.isDirectory())found.push(...await files(path,extension));
    else if(path.endsWith(extension))found.push(path);
  }
  return found;
}
const thresholds={html:450_000,routeCss:650_000,routeJs:1_250_000,sourceCss:1_000_000,sourceCssFile:260_000,desktopVideo:7_000_000,mobileVideo:1_500_000,clientComponents:75,standalone:165_000_000};
const htmlFiles=await files(join(next,'server','app'),'.html');
if(!htmlFiles.length)failures.push('No prerendered HTML was found; run the production build first');
for(const path of htmlFiles){
  const body=await readFile(path,'utf8'),htmlBytes=Buffer.byteLength(body);
  const assets=(pattern)=>[...body.matchAll(pattern)].map(match=>match[1]);
  const size=async urls=>(await Promise.all([...new Set(urls)].map(async url=>(await stat(join(next,url.replace(/^\/_next\//,''))).catch(()=>({size:0}))).size))).reduce((sum,value)=>sum+value,0);
  const css=await size(assets(/href="(\/_next\/static\/[^"]+\.css)"/g));
  const js=await size(assets(/src="(\/_next\/static\/[^"]+\.js)"/g));
  const page=relative(join(next,'server','app'),path);
  routes.push({page,htmlBytes,cssBytes:css,jsBytes:js});
  if(htmlBytes>thresholds.html)failures.push(`${page}: HTML ${htmlBytes} > ${thresholds.html}`);
  if(css>thresholds.routeCss)failures.push(`${page}: CSS ${css} > ${thresholds.routeCss}`);
  if(js>thresholds.routeJs)failures.push(`${page}: JS ${js} > ${thresholds.routeJs}`);
}
for(const [name,maximum] of [['tennis-hero.mp4',thresholds.desktopVideo],['tennis-hero-mobile.mp4',thresholds.mobileVideo]]){
  const bytes=(await stat(join(root,'public','videos',name))).size;
  if(bytes>maximum)failures.push(`${name}: ${bytes} > ${maximum}`);
}
const sources=[...await files(join(root,'app'),'.tsx'),...await files(join(root,'components'),'.tsx')];
const sourceCss=[...await files(join(root,'app'),'.css'),...await files(join(root,'components'),'.css'),...await files(join(root,'styles'),'.css')];
const sourceCssRows=await Promise.all(sourceCss.map(async path=>({path:relative(root,path),bytes:(await stat(path)).size})));
const sourceCssBytes=sourceCssRows.reduce((sum,row)=>sum+row.bytes,0);
if(sourceCssBytes>thresholds.sourceCss)failures.push(`Source CSS: ${sourceCssBytes} > ${thresholds.sourceCss}`);
for(const row of sourceCssRows)if(row.bytes>thresholds.sourceCssFile)failures.push(`${row.path}: source CSS ${row.bytes} > ${thresholds.sourceCssFile}`);
let clients=0;
for(const path of sources)if(/^['"]use client['"];?/m.test(await readFile(path,'utf8')))clients++;
if(clients>thresholds.clientComponents)failures.push(`Client Components: ${clients} > ${thresholds.clientComponents}`);
const standalone=join(next,'standalone');
const standaloneFiles=await files(standalone,'');
const standaloneRelative=new Set(standaloneFiles.map(path=>relative(standalone,path)));
const standaloneBytes=(await Promise.all(standaloneFiles.map(async path=>(await stat(path)).size))).reduce((sum,value)=>sum+value,0);
if(!standaloneFiles.length)failures.push('No standalone deployment was found; run the production build first');
if(standaloneBytes>thresholds.standalone)failures.push(`Standalone deployment: ${standaloneBytes} > ${thresholds.standalone}`);
for(const forbidden of ['.deuce-cache/reading','data/reading/matches.json.gz','node_modules/sharp','node_modules/@img']){
  if(standaloneFiles.some(path=>relative(standalone,path).startsWith(forbidden)))failures.push(`Standalone deployment contains forbidden duplicate: ${forbidden}`);
}
if(standaloneFiles.some(path=>path.endsWith('.nft.json')))failures.push('Standalone deployment contains build-only trace metadata');
for(const required of ['data/reading/manifest.json.gz','data/reading/browser-index.json.gz','data/reading/publication-index.json.gz','data/reading/reconciliation.json.gz']){
  if(!standaloneRelative.has(required))failures.push(`Standalone deployment is missing ${required}`);
}
try{
  const manifest=JSON.parse(gunzipSync(await readFile(join(standalone,'data','reading','manifest.json.gz'))).toString());
  if(!Array.isArray(manifest.matchPartitions)||!manifest.matchPartitions.length)failures.push('Standalone manifest has no full match partitions');
  else for(const partition of manifest.matchPartitions){
    const required=`data/reading/${partition?.id}.json.gz`;
    if(typeof partition?.id!=='string'||!standaloneRelative.has(required))failures.push(`Standalone deployment is missing ${required}`);
  }
}catch{failures.push('Standalone manifest cannot be decoded');}
const sourceWta=(await readdir(join(root,'data','archive','wta')).catch(()=>[])).filter(name=>/^archive-.+\.json\.gz$/.test(name));
for(const name of sourceWta){
  const required=`data/archive/wta/${name}`;
  if(!standaloneRelative.has(required))failures.push(`Standalone deployment is missing ${required}`);
}
routes.sort((a,b)=>b.htmlBytes+b.cssBytes+b.jsBytes-(a.htmlBytes+a.cssBytes+a.jsBytes));
sourceCssRows.sort((a,b)=>b.bytes-a.bytes);
console.log(JSON.stringify({verified:!failures.length,routes:htmlFiles.length,clientComponents:clients,sourceCssBytes,standaloneBytes,thresholds,largestRoutes:routes.slice(0,5),largestSourceCss:sourceCssRows.slice(0,5),failures},null,2));
if(failures.length)process.exitCode=1;
