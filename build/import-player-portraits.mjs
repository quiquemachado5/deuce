// Explicitly reviewed Commons files only. This is a manual import, never a build-time crawl.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const sources=JSON.parse(await fs.readFile('lib/player-photo-sources.json','utf8'));
const directory='public/images/players/documented';await fs.mkdir(directory,{recursive:true});
const manifest={};
for(const item of sources){
 if(!/^(CC BY(?:-SA)?|CC0)/.test(item.license)||!item.licenseUrl||!item.author||!new URL(item.url).hostname.endsWith('.wikimedia.org'))throw Error('Unverified photo: '+item.name);
 const slug=item.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
 const full=path.join(directory,slug+'.webp'),small=path.join(directory,slug+'-small.webp');
 let exists=true;try{await fs.access(full);await fs.access(small);}catch{exists=false;}
 if(!exists){const response=await fetch(item.url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'DEUCEArchive/1.0 (github.com/quiquemachado5/deuce)'}});if(!response.ok)throw Error(item.name+': HTTP '+response.status);const buffer=Buffer.from(await response.arrayBuffer());await sharp(buffer).rotate().resize({width:900,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:83}).toFile(full);await sharp(buffer).rotate().resize({width:240,height:300,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toFile(small);}
 manifest[item.name]={src:'/images/players/documented/'+slug+'.webp',thumbnail:'/images/players/documented/'+slug+'-small.webp',alt:item.name+(item.photoYear?' · '+item.photoYear:''),credit:item.author+' · '+item.license+' · versión WebP por DEUCE',source:item.source,licenseUrl:item.licenseUrl,...(item.photoYear?{photoYear:item.photoYear}:{}),objectPosition:'50% 20%'};
 console.log(item.name);if(!exists)await new Promise(resolve=>setTimeout(resolve,3000));
}
await fs.writeFile('lib/player-photo-additions.json',JSON.stringify(manifest,null,2)+'\n');
