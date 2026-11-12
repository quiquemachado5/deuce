import {createApprovedFetch} from './approved-media-fetch.mjs';
const fetch=createApprovedFetch(["en.wikipedia.org", "commons.wikimedia.org", "upload.wikimedia.org", "thumb.wikimedia.org"]);
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const input=JSON.parse(await fs.readFile('.deuce-cache/media-review/top200.json','utf8'));
const output='public/images/players/reviewed',manifestPath='lib/player-photo-reviewed.json';
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8').catch(()=>'{}'));
const aliases={'Na Li':'Li Na','Evonne Goolagong':'Evonne Goolagong Cawley','Mima Jausovec':'Mima Jaušovec','Ann Jones':'Ann Jones (tennis)','Barbara Jordan':'Barbara Jordan (tennis)','Chris Oneil':"Chris O'Neil",'Shuai Peng':'Peng Shuai','Julia Goerges':'Julia Görges','Shahar Peer':"Shahar Pe'er",'Kate Makarova':'Ekaterina Makarova','Albert Ramos':'Albert Ramos Viñolas'};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const strip=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&[^;]+;/g,' ').trim();
async function json(url){const response=await fetch(url,{headers:{'User-Agent':'DEUCEArchive photo review (source attribution retained)'},signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error('HTTP '+response.status);return response.json();}
async function info(title){const q=new URLSearchParams({action:'query',format:'json',titles:'File:'+title,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1600'});const payload=await json('https://commons.wikimedia.org/w/api.php?'+q);return Object.values(payload.query?.pages||{})[0]?.imageinfo?.[0];}
await fs.mkdir(output,{recursive:true});let index=0;
const results=[];
await Promise.all(Array.from({length:3},async()=>{while(index<input.length){const row=input[index++],key=row.tour+':'+row.name;try{
  if(manifest[key]){results.push({key,status:'already-reviewed'});continue;}
  if(!row.error&&row.width>=1000&&row.name!=='Pete Sampras'){results.push({key,status:'retained-for-visual-review'});continue;}
  await wait(450);let source=row.photo?.source,title;
  if(row.error||row.name==='Pete Sampras'){
    const summary=await json('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent((aliases[row.name]||row.name).replaceAll(' ','_')));
    const original=summary.originalimage?.source;if(!original)throw Error('No identified photograph');
    title=decodeURIComponent(new URL(original).pathname.split('/').at(-1));source='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(title.replaceAll(' ','_'));
  }else if(source?.includes('commons.wikimedia.org/wiki/File:'))title=decodeURIComponent(source.split('/wiki/File:')[1]);else throw Error('Needs manual source selection');
  let photo=await info(title);if(!photo)throw Error('No source image metadata');
  if(photo.width<1000&&/cropped/i.test(title)){
    const uncut=title.replace(/[_ ,]*\(?cropped\d*\)?/ig,'');if(uncut!==title){const full=await info(uncut);if(full&&full.width>photo.width){photo=full;title=uncut;source='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(title);}}
  }
  const response=await fetch((photo.thumburl||photo.url).split('?')[0],{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Image HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer()),meta=await sharp(bytes).metadata();if(!meta.width||!meta.height||Math.min(meta.width,meta.height)<200)throw Error('Source too small');
  if(!row.error&&row.name!=='Pete Sampras'&&meta.width<=row.width&&meta.height<=row.height){results.push({key,status:'source-resolution-limit',width:meta.width,height:meta.height});continue;}
  const slug=row.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase();const file=row.tour+'-'+slug;
  const detail=await sharp(bytes).rotate().resize({width:1600,withoutEnlargement:true}).webp({quality:87}).toFile(path.join(output,file+'.webp'));
  await sharp(bytes).rotate().resize({width:280,withoutEnlargement:true}).webp({quality:82}).toFile(path.join(output,file+'-small.webp'));
  const extra=photo.extmetadata||{};
  manifest[key]={src:'/images/players/reviewed/'+file+'.webp',thumbnail:'/images/players/reviewed/'+file+'-small.webp',alt:row.name,credit:strip(extra.Artist?.value)+' · '+strip(extra.LicenseShortName?.value)+' · adaptación WebP por DEUCE',source,licenseUrl:extra.LicenseUrl?.value||row.photo?.licenseUrl,width:detail.width,height:detail.height,objectPosition:'50% 24%',mobileObjectPosition:'50% 22%',reviewedAt:new Date().toISOString(),identitySource:row.error||row.name==='Pete Sampras'?'Wikipedia biographical summary; exact image metadata':'Existing attributed source; original resolution restored'};
  results.push({key,status:'replaced',width:detail.width,height:detail.height});
 }catch(error){results.push({key,status:'needs-review',reason:error.message});}}}));
await fs.writeFile(manifestPath+'.tmp',JSON.stringify(manifest,null,2)+'\n');await fs.rename(manifestPath+'.tmp',manifestPath);
await fs.writeFile('.deuce-cache/media-review/restoration-results.json',JSON.stringify(results,null,2));console.log({replacements:Object.keys(manifest).length,unresolved:results.filter(r=>r.status==='needs-review'||r.status==='source-resolution-limit')});
