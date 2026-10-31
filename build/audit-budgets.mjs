import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root=process.cwd(),next=join(root,'.next'),failures=[];
async function files(dir,extension){
  const found=[];
  for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){
    const path=join(dir,entry.name);
    if(entry.isDirectory())found.push(...await files(path,extension));
    else if(path.endsWith(extension))found.push(path);
  }
  return found;
}
const thresholds={html:450_000,routeCss:650_000,routeJs:1_250_000,desktopVideo:7_000_000,mobileVideo:1_500_000,clientComponents:75};
const htmlFiles=await files(join(next,'server','app'),'.html');
if(!htmlFiles.length)failures.push('No prerendered HTML was found; run the production build first');
for(const path of htmlFiles){
  const body=await readFile(path,'utf8'),htmlBytes=Buffer.byteLength(body);
  const assets=(pattern)=>[...body.matchAll(pattern)].map(match=>match[1]);
  const size=async urls=>(await Promise.all([...new Set(urls)].map(async url=>(await stat(join(next,url.replace(/^\/_next\//,''))).catch(()=>({size:0}))).size))).reduce((sum,value)=>sum+value,0);
  const css=await size(assets(/href="(\/_next\/static\/[^"]+\.css)"/g));
  const js=await size(assets(/src="(\/_next\/static\/[^"]+\.js)"/g));
  const page=relative(join(next,'server','app'),path);
  if(htmlBytes>thresholds.html)failures.push(`${page}: HTML ${htmlBytes} > ${thresholds.html}`);
  if(css>thresholds.routeCss)failures.push(`${page}: CSS ${css} > ${thresholds.routeCss}`);
  if(js>thresholds.routeJs)failures.push(`${page}: JS ${js} > ${thresholds.routeJs}`);
}
for(const [name,maximum] of [['tennis-hero.mp4',thresholds.desktopVideo],['tennis-hero-mobile.mp4',thresholds.mobileVideo]]){
  const bytes=(await stat(join(root,'public','videos',name))).size;
  if(bytes>maximum)failures.push(`${name}: ${bytes} > ${maximum}`);
}
const sources=[...await files(join(root,'app'),'.tsx'),...await files(join(root,'components'),'.tsx')];
let clients=0;
for(const path of sources)if(/^['"]use client['"];?/m.test(await readFile(path,'utf8')))clients++;
if(clients>thresholds.clientComponents)failures.push(`Client Components: ${clients} > ${thresholds.clientComponents}`);
console.log(JSON.stringify({verified:!failures.length,routes:htmlFiles.length,clientComponents:clients,thresholds,failures},null,2));
if(failures.length)process.exitCode=1;
