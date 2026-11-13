import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gunzipSync } from 'node:zlib';

const root=process.cwd(),next=join(root,'.next'),failures=[],warnings=[],routes=[];
async function files(dir,extension){
  const found=[];
  for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){
    const path=join(dir,entry.name);
    if(entry.isDirectory())found.push(...await files(path,extension));
    else if(entry.isSymbolicLink())continue;
    else if(path.endsWith(extension))found.push(path);
  }
  return found;
}
// These ceilings are a ratchet over the verified production bundle, not aspirational
// targets. Keep enough headroom for deterministic minifier differences between local
// and CI builds while still failing any meaningful regression.
const thresholds={html:450_000,routeCss:650_000,routeJs:1_250_000,sourceCss:1_200_000,sourceCssFile:240_000,heroPoster:100_000,clientComponents:62,standalone:200_000_000,applicationAndBaseData:165_000_000,navigationCompressed:32_000_000,productCompressed:16_000_000,productInflated:64_000_000};
const warn=(name,value,maximum)=>{const utilization=value/maximum;if(utilization>=.85)warnings.push(`${name}: ${(utilization*100).toFixed(1)}% of budget (${value}/${maximum})`);return utilization;};
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
  warn(`${page} HTML`,htmlBytes,thresholds.html);warn(`${page} CSS`,css,thresholds.routeCss);warn(`${page} JS`,js,thresholds.routeJs);
}
const posterBytes=(await stat(join(root,'public','videos','tennis-hero-poster.webp'))).size;
if(posterBytes>thresholds.heroPoster)failures.push(`tennis-hero-poster.webp: ${posterBytes} > ${thresholds.heroPoster}`);
const sources=[...await files(join(root,'app'),'.tsx'),...await files(join(root,'components'),'.tsx')];
const sourceCss=[...await files(join(root,'app'),'.css'),...await files(join(root,'components'),'.css'),...await files(join(root,'styles'),'.css')];
const sourceCssRows=await Promise.all(sourceCss.map(async path=>({path:relative(root,path),bytes:(await stat(path)).size})));
const sourceCssBytes=sourceCssRows.reduce((sum,row)=>sum+row.bytes,0);
if(sourceCssBytes>thresholds.sourceCss)failures.push(`Source CSS: ${sourceCssBytes} > ${thresholds.sourceCss}`);
warn('Source CSS',sourceCssBytes,thresholds.sourceCss);
for(const row of sourceCssRows)if(row.bytes>thresholds.sourceCssFile)failures.push(`${row.path}: source CSS ${row.bytes} > ${thresholds.sourceCssFile}`);
let clients=0;
for(const path of sources)if(/^['"]use client['"];?/m.test(await readFile(path,'utf8')))clients++;
if(clients>thresholds.clientComponents)failures.push(`Client Components: ${clients} > ${thresholds.clientComponents}`);
warn('Client Components',clients,thresholds.clientComponents);
const standalone=join(next,'standalone');
const standaloneFiles=await files(standalone,'');
const standaloneRelative=new Set(standaloneFiles.map(path=>relative(standalone,path)));
const standaloneBytes=(await Promise.all(standaloneFiles.map(async path=>(await stat(path)).size))).reduce((sum,value)=>sum+value,0);
// Entity projections trade bounded server storage for request-time CPU. Keep
// the existing application/base-data limit unchanged and budget projections
// separately; none of these bytes become browser JavaScript.
const navigationFiles=standaloneFiles.filter(path=>/^data\/reading\/navigation-(?:index|entity-[a-f0-9]+)\.json\.gz$/.test(relative(standalone,path)));
const navigationCompressed=(await Promise.all(navigationFiles.map(async path=>(await stat(path)).size))).reduce((sum,size)=>sum+size,0);
const applicationAndBaseDataBytes=standaloneBytes-navigationCompressed;
if(applicationAndBaseDataBytes>thresholds.applicationAndBaseData)failures.push(`Application and base data: ${applicationAndBaseDataBytes} > ${thresholds.applicationAndBaseData}`);
if(navigationCompressed>thresholds.navigationCompressed)failures.push(`Navigation projections: ${navigationCompressed} > ${thresholds.navigationCompressed}`);
if(!navigationFiles.length)failures.push('Navigation projections are missing from standalone');
if(!standaloneFiles.length)failures.push('No standalone deployment was found; run the production build first');
if(standaloneBytes>thresholds.standalone)failures.push(`Standalone deployment: ${standaloneBytes} > ${thresholds.standalone}`);
warn('Standalone deployment',standaloneBytes,thresholds.standalone);
for(const forbidden of ['.deuce-cache/reading','data/reading/matches.json.gz','node_modules/sharp','node_modules/@img']){
  if(standaloneFiles.some(path=>relative(standalone,path).startsWith(forbidden)))failures.push(`Standalone deployment contains forbidden duplicate: ${forbidden}`);
}
if(standaloneFiles.some(path=>path.endsWith('.nft.json')))failures.push('Standalone deployment contains build-only trace metadata');
for(const required of ['data/reading/manifest.json.gz','data/reading/browser-index.json.gz','data/reading/publication-index.json.gz','data/reading/reconciliation.json.gz','data/reading/edition-products.json.gz','data/reading/player-directory.json.gz','data/reading/search-products.json.gz','data/reading/elo-products.json.gz','data/reading/time-machine.json.gz']){
  if(!standaloneRelative.has(required))failures.push(`Standalone deployment is missing ${required}`);
}
const productNames=['edition-products','player-directory','search-products','elo-products','time-machine'];
let productCompressed=0,productInflated=0;
for(const name of productNames){const body=await readFile(join(root,'data','reading',`${name}.json.gz`)).catch(()=>null);if(!body){failures.push(`Missing published product: ${name}`);continue}productCompressed+=body.byteLength;productInflated+=gunzipSync(body).byteLength;}
if(productCompressed>thresholds.productCompressed)failures.push(`Published products compressed: ${productCompressed} > ${thresholds.productCompressed}`);
if(productInflated>thresholds.productInflated)failures.push(`Published products inflated: ${productInflated} > ${thresholds.productInflated}`);
warn('Published products compressed',productCompressed,thresholds.productCompressed);warn('Published products inflated',productInflated,thresholds.productInflated);
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
console.log(JSON.stringify({verified:!failures.length,routes:htmlFiles.length,clientComponents:clients,sourceCssBytes,standaloneBytes,applicationAndBaseDataBytes,navigationCompressed,productCompressed,productInflated,thresholds,largestRoutes:routes.slice(0,5),largestSourceCss:sourceCssRows.slice(0,5),warnings,failures},null,2));
if(failures.length)process.exitCode=1;
