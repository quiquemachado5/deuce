import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {approvedMediaFetch as fetch} from './approved-media-fetch.mjs';
const catalogFile='data/media/tournament-library.json',indexFile='data/media/edition-hero-candidates.json';
const catalog=JSON.parse(await readFile(catalogFile,'utf8'));
const checkpoint=await readFile(indexFile,'utf8').then(JSON.parse).catch(()=>({schema:1,photos:[],searched:[],errors:[]}));
const players=JSON.parse(gunzipSync(await readFile('.deuce-cache/reading/players.json.gz')).toString());
const fold=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const names=players.map(p=>({name:fold(p.name),tour:p.tour})).filter(p=>p.name.split(' ').length>1).sort((a,b)=>b.name.length-a.name.length);
const strip=x=>String(x||'').replace(/<[^>]*>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim();
const excluded=/qualif|qualies|\bafc\b|football|soccer|golf|badminton|webm|sticker|web summit|overlook|medal|agricultur|next generation|next gen|\bwmq\b|\bwmq\d|exterior|outside|spectator|crowd|audience|ballgirls?|ballboys?|line judge|water bottle|entrance|memorial|statue|\blogo\b|press conference|garden square|on the hill|pickleball|emhoff|donald trump/i;
const aliases={'Australian Open':['australian open','aus open','rod laver arena'],'Roland Garros':['roland garros','french open'],'Wimbledon':['wimbledon'],'US Open':['us open'],'ATP Finals':['atp finals','world tour finals'],'WTA Finals':['wta finals','wta championships'],'Indian Wells':['indian wells'],'Miami':['miami open','miami masters'],'Monte Carlo':['monte carlo'],'Madrid':['madrid open','madrid masters'],'Rome':['italian open','rome masters','internazionali'],'Canada':['canadian open','rogers cup','national bank open'],'Cincinnati':['cincinnati open','cincinnati masters'],'Shanghai':['shanghai masters'],'Paris':['paris masters']};
Object.assign(aliases,{Barcelona:['barcelona open','trofeo conde de godo'],Rotterdam:['rotterdam open','abn amro'],Dubai:['dubai tennis','dubai championships'],Acapulco:['mexican open','abierto mexicano'],Basel:['swiss indoors','basel'],Vienna:['vienna open','erste bank'],Halle:['halle open','gerry weber','noventi open','terra wortmann'],Stuttgart:['stuttgart open','mercedes cup','boss open'],"Queen's Club":['queens club','aegon championships','cinch championships'],Tokyo:['japan open','rakuten japan'],Beijing:['china open'],Brisbane:['brisbane international'],Auckland:['asb classic','auckland open'],Doha:['qatar open','qatar exxonmobil','qatar total']});
const queries=[];
if(process.argv.includes('--scope=secondary'))for(let year=2025;year>=2010;year--)for(const tournament of ['Barcelona','Rotterdam','Dubai','Acapulco','Basel','Vienna','Halle','Stuttgart',"Queen's Club",'Tokyo','Beijing','Brisbane','Auckland','Doha'])queries.push({tournament,year});
else {
for(let year=2025;year>=2000;year--)for(const tournament of ['Australian Open','Roland Garros','Wimbledon','US Open'])queries.push({tournament,year});
for(let year=2025;year>=2015;year--)for(const tournament of ['ATP Finals','WTA Finals','Indian Wells','Miami','Monte Carlo','Madrid','Rome','Canada','Cincinnati','Shanghai','Paris'])queries.push({tournament,year});
for(let year=1999;year>=1968;year--)for(const tournament of ['Australian Open','Roland Garros','Wimbledon','US Open'])queries.push({tournament,year});
}
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
function candidate(photo,task){
 const text=strip(photo.title+' '+photo.description);const normalized=fold(text);
 if(excluded.test(text)||!normalized.includes(String(task.year))||!aliases[task.tournament]?.some(a=>normalized.includes(a)))return null;
 const identified=new Set(names.filter(p=>normalized.includes(p.name)).map(p=>p.tour));
 let tours=[...identified];
 // A mixed page description must never overwrite an identified player's circuit.
 if(!identified.size){if(/women|ladies|wta/i.test(text)&&!/men.s|gentlemen|atp/i.test(text))tours=['wta'];else if(/men.s|gentlemen|atp/i.test(text)&&!/women|ladies|wta/i.test(text))tours=['atp'];}
 if(identified.size>1)return null;
 if(!tours.length&&/court|arena|stadium|centre|central/i.test(text))tours=['atp','wta'];
 if(!tours.length)return null;
 const heroKey=task.tournament+'|'+task.year;
 return {key:heroKey,tournament:task.tournament,year:task.year,tours,photo:{src:photo.src,alt:strip(photo.description)||photo.title,credit:photo.credit+' · '+photo.license,source:photo.source,licenseUrl:photo.licenseUrl,photoYear:task.year,objectPosition:'50% 45%',mobileObjectPosition:'50% 40%'},sourceTitle:photo.title,validation:'explicit tournament/year in source metadata; circuit from named player or event; visual review required'};
}
for(const photo of catalog.photos){const task=photo.context;const item=candidate(photo,task);if(item&&!checkpoint.photos.some(p=>p.key===item.key&&p.tours.some(t=>item.tours.includes(t))))checkpoint.photos.push(item)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const save=async()=>{checkpoint.updatedAt=new Date().toISOString();await writeFile(indexFile,JSON.stringify(checkpoint,null,2)+'\n');await writeFile(catalogFile,JSON.stringify(catalog,null,2)+'\n')};
await mkdir('data/media',{recursive:true});
const maxQueries=Number(process.argv.find(a=>a.startsWith('--max-queries='))?.split('=')[1]||180);let calls=0,downloaded=0;
for(const task of queries){
 const key=task.tournament+'|'+task.year;if(calls>=maxQueries)break;
 if(checkpoint.searched.includes(key)||checkpoint.photos.filter(p=>p.key===key).flatMap(p=>p.tours).filter((v,i,a)=>a.indexOf(v)===i).length===2)continue;
 try{
  const url=new URL('https://commons.wikimedia.org/w/api.php');url.search=new URLSearchParams({action:'query',format:'json',generator:'search',gsrnamespace:'6',gsrlimit:'18',gsrsearch:`intitle:${task.year} "${aliases[task.tournament][0]}" -qualifying -spectators -exterior`,prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'1400'});
  calls++;const response=await fetch(url,{headers:{'User-Agent':'DEUCEArchive/1.0 (https://deucearchive.com; edition media research)'},signal:AbortSignal.timeout(20000)});
  if(response.status===429){checkpoint.errors.push({key,error:'rate limited; checkpoint preserved'});break}if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json();if(json.error)throw Error(json.error.info);
  for(const page of Object.values(json.query?.pages||{})){
   const info=page.imageinfo?.[0],meta=info?.extmetadata||{};if(!info||page.title.match(/\.(pdf|djvu)$/i)||info.width<1000||info.height<650||!/^CC (?:BY|0)|Public domain/i.test(meta.LicenseShortName?.value||''))continue;
   let photo=catalog.photos.find(p=>p.source===info.descriptionurl);
   const description=strip(meta.ImageDescription?.value);const provisional={title:page.title,description,context:task};const item=candidate({...provisional,...photo},task);if(!item||checkpoint.photos.some(p=>p.key===key&&p.tours.some(t=>item.tours.includes(t))))continue;
   if(!photo){const r=await fetch(info.thumburl||info.url,{headers:{'User-Agent':'DEUCEArchive/1.0'},signal:AbortSignal.timeout(20000)});if(!r.ok)continue;const bytes=Buffer.from(await r.arrayBuffer());const hash=sha(bytes),src='/images/tournament-library/'+hash.slice(0,24)+'.webp';const main=await sharp(bytes).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();await writeFile('public'+src,main);const metadata=await sharp(main).metadata();const thumbnailSrc=src.replace('.webp','-small.webp'),thumb=await sharp(main).resize({width:480,height:480,fit:'inside'}).webp({quality:76}).toBuffer();await writeFile('public'+thumbnailSrc,thumb);
    photo={id:page.pageid,src,source:info.descriptionurl,originalUrl:info.url,sha256:hash,width:metadata.width,height:metadata.height,bytes:main.length,originalWidth:info.width,originalHeight:info.height,title:page.title.replace(/^File:/,''),description,credit:strip(meta.Artist?.value),license:meta.LicenseShortName.value,licenseUrl:meta.LicenseUrl?.value,context:{...task,category:'Wikimedia search: explicit edition'},reviewStatus:'edition-metadata-associated',retrievedAt:new Date().toISOString(),localSha256:sha(main),thumbnailSrc,thumbnailBytes:thumb.length,thumbnailSha256:sha(thumb)};catalog.photos.push(photo);downloaded++;
   }
   checkpoint.photos.push(candidate(photo,task));
  }
  checkpoint.searched.push(key);await save();if(calls%10===0)console.log(JSON.stringify({calls,downloaded,candidates:checkpoint.photos.length,editions:new Set(checkpoint.photos.map(p=>p.key)).size}));await sleep(650);
 }catch(e){checkpoint.errors.push({key,error:e.message});await save()}
}
await save();console.log(JSON.stringify({calls,downloaded,candidates:checkpoint.photos.length,editions:new Set(checkpoint.photos.map(p=>p.key)).size,library:catalog.photos.length,liveTennisCalls:0}));
