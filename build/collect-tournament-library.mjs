import {approvedMediaFetch as fetch} from './approved-media-fetch.mjs';
import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

// Wikimedia only. Never invokes the results provider. Checkpoints contain the
// source category, attribution and original dimensions, not inferred winners.
const root = new URL('../data/media/', import.meta.url);
const output = new URL('../public/images/tournament-library/', import.meta.url);
await mkdir(root, {recursive:true}); await mkdir(output, {recursive:true});
const file = new URL('tournament-library.json', root);
const catalog = await readFile(file, 'utf8').then(JSON.parse).catch(()=>({schema:1,photos:[],categories:[],errors:[]}));
const maximum = Number(process.argv.find(v=>v.startsWith('--max='))?.split('=')[1]||1200);
const ua = 'DEUCEArchive/1.0 (https://deucearchive.com; historical tennis image catalog)';
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
let requestTurn=Promise.resolve();
async function request(url, json=false) {
 for(let attempt=0;attempt<3;attempt++) {
  const turn=requestTurn;requestTurn=requestTurn.then(()=>sleep(500));await turn;
  const response=await fetch(url,{headers:{'User-Agent':ua},signal:AbortSignal.timeout(30000)});
  if(response.ok)return json?response.json():Buffer.from(await response.arrayBuffer());
  if(![429,502,503,504].includes(response.status)||attempt===2)throw Error('HTTP '+response.status);
  await sleep(response.status===429?30000*(attempt+1):2000*(attempt+1));
 }
}
const api=params=>request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',...params}),true);
const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
async function save(){const temporary=new URL('tournament-library.tmp.json',root);catalog.updatedAt=new Date().toISOString();await writeFile(temporary,JSON.stringify(catalog,null,2)+'\n');await rename(temporary,file)}
const known=new Set(catalog.photos.map(p=>p.source));
const hashes=new Set(catalog.photos.map(p=>p.sha256));
const done=new Set(catalog.categories);
const seeds=[];
for(let year=2025;year>=2018;year--)for(const [tournament,name]of [['ATP Finals','ATP Finals'],['WTA Finals','WTA Finals'],['Madrid','Madrid Open'],['Rome','Italian Open (tennis)'],['Indian Wells','Indian Wells Masters'],['Miami','Miami Open'],['Cincinnati','Cincinnati Open'],['Shanghai','Shanghai Masters'],['Paris','Paris Masters'],['Monte Carlo','Monte-Carlo Masters'],['Canada','Canadian Open (tennis)'],['Beijing','China Open (tennis)'],['Dubai','Dubai Tennis Championships'],['Halle','Halle Open'],['Barcelona','Barcelona Open Banc Sabadell']])seeds.push({category:`Category:${year} ${name}`,tournament,year,depth:0});
for(let year=2025;year>=2000;year--)for(const [tournament,name]of [['Roland Garros','Roland Garros'],['Wimbledon','Wimbledon Championships'],['Australian Open','Australian Open'],['US Open','US Open (tennis)'],['ATP Finals','ATP Finals'],['WTA Finals','WTA Finals']])seeds.push({category:`Category:${year} ${name}`,tournament,year,depth:0});
let acquired=0;
while(seeds.length&&acquired<maximum){
 const task=seeds.shift();if(done.has(task.category))continue;
 try{
  let cursor;const files=[];
  do{
   const data=await api({list:'categorymembers',cmtitle:task.category,cmlimit:'500',...(cursor?{cmcontinue:cursor}:{})});
   if(data.error)throw Error(data.error.info);
   for(const member of data.query?.categorymembers||[]){if(member.ns===6&&/\.(jpe?g|png|webp)$/i.test(member.title))files.push(member.title);else if(member.ns===14&&task.depth<2)seeds.push({...task,category:member.title,depth:task.depth+1});}
   cursor=data.continue?.cmcontinue;await sleep(100);
  }while(cursor);
  for(let offset=0;offset<files.length&&acquired<maximum;offset+=40){
   const data=await api({prop:'imageinfo',titles:files.slice(offset,offset+40).join('|'),iiprop:'url|size|extmetadata',iiurlwidth:'1400'});
   const candidates=Object.values(data.query?.pages||{}).filter(p=>p.imageinfo?.length);
   let index=0;
   await Promise.all(Array.from({length:3},async()=>{
    while(index<candidates.length&&acquired<maximum){
     const page=candidates[index++],info=page.imageinfo[0],meta=info.extmetadata||{};
     if(/donald trump|scoreboards?|\blogo\b|\bsignature\b|\bdiagram\b|\bmap\b|balldose/i.test(page.title)||known.has(info.descriptionurl)||info.width<1000||info.height<600||!/^CC (?:BY|0)|Public domain/i.test(meta.LicenseShortName?.value||''))continue;
     known.add(info.descriptionurl);
     try{
      const bytes=await request(info.thumburl||info.url),hash=createHash('sha256').update(bytes).digest('hex');if(hashes.has(hash))continue;
      const local=hash.slice(0,24)+'.webp';const result=await sharp(bytes).rotate().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toFile(new URL(local,output).pathname);
      hashes.add(hash);acquired++;
      catalog.photos.push({id:page.pageid,src:'/images/tournament-library/'+local,source:info.descriptionurl,originalUrl:info.url,sha256:hash,width:result.width,height:result.height,bytes:result.size,originalWidth:info.width,originalHeight:info.height,title:page.title.replace(/^File:/,''),description:strip(meta.ImageDescription?.value),credit:strip(meta.Artist?.value),license:meta.LicenseShortName?.value,licenseUrl:meta.LicenseUrl?.value,context:{tournament:task.tournament,year:task.year,category:task.category},reviewStatus:'category-associated',retrievedAt:new Date().toISOString()});
      if(acquired%25===0)console.log(JSON.stringify({acquired,total:catalog.photos.length,category:task.category}));
     }catch(error){catalog.errors.push({source:info.descriptionurl,error:error.message});known.delete(info.descriptionurl)}
    }
   }));await save();await sleep(150);
  }
  // Do not checkpoint a partially consumed category as finished.
  if(acquired<maximum){done.add(task.category);catalog.categories.push(task.category)}await save();
 }catch(error){catalog.errors.push({category:task.category,error:error.message});await save();console.log('Category deferred: '+task.category+' '+error.message)}
}
await save();console.log(JSON.stringify({acquired,total:catalog.photos.length,errors:catalog.errors.length,liveTennisCalls:0}));
