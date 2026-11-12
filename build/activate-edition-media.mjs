import {readFile,writeFile,rename} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {gunzipSync} from 'node:zlib';
const root=process.cwd(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async path=>JSON.parse(await readFile(join(root,path),'utf8'));
const manifests=process.argv.slice(2);
if(!manifests.length)throw new Error('Pass reviewed edition media manifests');
const registry=await read('lib/tournament-edition-hero-reviewed.json'),catalog=await read('data/media/tournament-library.json');
const audits=JSON.parse(gunzipSync(await readFile(join(root,'data/reading/audit.json.gz'))).toString()),levels=new Map();
for(const row of audits){const key=`${row.tournament}|${row.year}|${row.tour}`,set=levels.get(key)||new Set();set.add(row.category);levels.set(key,set)}
const keys=new Map(registry.flatMap(row=>row.tours.map(tour=>[`${row.tournament}|${row.year}|${tour}|${row.category||''}`,{...row,tours:[tour]}])));
const library=new Map(catalog.photos.map(photo=>[photo.src,photo]));
let activated=0;
for(const manifest of manifests){
 const rows=await read(manifest),seen=new Set();
 for(const row of rows){
  const {photo}=row;
  if(!Number.isSafeInteger(row.year)||row.year<1968||row.year>new Date().getUTCFullYear()||photo.photoYear!==row.year)throw new Error('Invalid edition year');
  if(!/^\/media\/editions-v31\/[a-z0-9/-]+\.webp$/i.test(photo.src)||resolve(root,'public'+photo.src)!==join(root,'public'+photo.src))throw new Error('Invalid local asset');
  if(new URL(photo.source).protocol!=='https:')throw new Error('Missing HTTPS source');
  const bytes=await readFile(join(root,'public'+photo.src)),meta=await sharp(bytes).metadata();
  if(meta.width<740||meta.width<meta.height*1.15)throw new Error('Insufficient native horizontal photo: '+photo.src);
  for(const tour of row.tours){
   if(!['atp','wta'].includes(tour))throw new Error('Invalid circuit');
   const base=`${row.tournament}|${row.year}|${tour}`,available=levels.get(base)||new Set();
   const category=row.category||(available.size===1?[...available][0]:undefined);
   if(available.size>1&&!category)throw new Error('Ambiguous edition requires a reviewed category: '+base);
   if(category&&available.size&&!available.has(category))throw new Error('Edition category not published: '+base+' '+category);
   const key=base+'|'+(category||'');
   if(seen.has(key))throw new Error('Duplicate manifest edition: '+key);seen.add(key);
   if(category)keys.delete(base+'|');
   keys.set(key,{tournament:row.tournament,year:row.year,tours:[tour],...(category?{category}:{}),...(available.size>1?{requiresCategory:true}:{}),photo});activated++;
  }
  const digest=hash(bytes),thumbnailSrc=photo.src.replace(/\.webp$/,'-small.webp');
  const thumb=await sharp(bytes).resize({width:320,withoutEnlargement:true}).webp({quality:76}).toBuffer();
  await writeFile(join(root,'public'+thumbnailSrc),thumb);
  library.set(photo.src,{id:Number.parseInt(digest.slice(0,12),16),src:photo.src,source:photo.source,originalUrl:row.originalUrl||row.sourceImage||photo.source,sha256:row.sourceSha256||digest,width:meta.width,height:meta.height,bytes:bytes.length,originalWidth:row.originalWidth||row.originalDimensions?.[0]||meta.width,originalHeight:row.originalHeight||row.originalDimensions?.[1]||meta.height,title:photo.alt,description:row.reviewNotes||photo.alt,credit:photo.credit,license:'Fuente registrada; permiso de reutilización no acreditado',licenseUrl:photo.licenseUrl||'',context:{tournament:row.tournament,year:row.year,category:'Hero de edición · '+row.tours.join(' / ').toUpperCase()},reviewStatus:'edition-reviewed',retrievedAt:row.reviewedAt||photo.reviewedAt||new Date().toISOString(),localSha256:digest,thumbnailSrc,thumbnailBytes:thumb.length,thumbnailSha256:hash(thumb)});
 }
}
const heroes=[...keys.values()].sort((a,b)=>a.tournament.localeCompare(b.tournament)||a.year-b.year||a.tours[0].localeCompare(b.tours[0]));
for(const [path,value] of [['data/media/tournament-library.json',{...catalog,photos:[...library.values()]}],['lib/tournament-edition-hero-reviewed.json',heroes]]){
 const temp=join(root,path+'.'+randomUUID()+'.tmp');await writeFile(temp,JSON.stringify(value,null,2)+'\n');await rename(temp,join(root,path));
}
console.log(JSON.stringify({activated,editionCircuitKeys:keys.size,libraryPhotos:library.size}));
