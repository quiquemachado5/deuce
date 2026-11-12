import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const file='data/media/tournament-library.json';
const catalog=JSON.parse(await readFile(file,'utf8'));
const excluded=/donald trump|scoreboards?|\blogo\b|\bsignature\b|\bdiagram\b|\bmap\b|balldose|\bball can/i;
const stem=photo=>photo.title.toLowerCase().replace(/\.(jpe?g|png|webp)$/,'').replace(/\s*[([](?:cropped|crop|edited|edit|retouched)[^\])]*[\])]/g,'').replace(/[ _-]+/g,' ').trim();
const groups=new Map();
for(const photo of catalog.photos){const key=stem(photo);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(photo)}
const removed=[];const kept=[];
for(const group of groups.values()){
 group.sort((a,b)=>b.originalWidth*b.originalHeight-a.originalWidth*a.originalHeight);
 for(const [index,photo]of group.entries()){
  if(excluded.test(photo.title+' '+photo.description)||index){removed.push({source:photo.source,reason:index?'alternate crop of the same source':'outside the tournament photo collection'});continue}
  const bytes=await readFile('public'+photo.src),metadata=await sharp(bytes).metadata();
  if(metadata.width!==photo.width||metadata.height!==photo.height)throw Error('Invalid dimensions: '+photo.src);
  photo.localSha256=createHash('sha256').update(bytes).digest('hex');kept.push(photo);
 }
}
const byTournament={};for(const photo of kept)byTournament[photo.context.tournament]=(byTournament[photo.context.tournament]||0)+1;
catalog.photos=kept;catalog.updatedAt=new Date().toISOString();
await writeFile(file,JSON.stringify(catalog,null,2)+'\n');
const report={at:catalog.updatedAt,photos:kept.length,removed,byTournament,missingOrCorrupt:0,exactEditionBindings:'Only separate, visually reviewed bindings are eligible for edition-specific presentation.',liveTennisCalls:0};
await writeFile('data/media/tournament-library-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({photos:kept.length,removed:removed.length,byTournament,missingOrCorrupt:0}));
