import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

// Edition/circuit coverage is measured against editions present in this local
// publication. It is not a claim to cover every historical tennis tournament.
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const manifest=JSON.parse(gunzipSync(await readFile('data/reading/manifest.json.gz')).toString());
const audit=JSON.parse(gunzipSync(await readFile('data/reading/audit.json.gz')).toString());
const registry=await read('lib/tournament-edition-hero-reviewed.json');
const library=await read('data/media/tournament-library.json');
const photos=new Map(library.photos.map(photo=>[photo.src,photo]));
const keys=new Map(),assets=new Map();
for(const row of registry){
 if(row.photo.photoYear!==row.year)throw new Error('Photo year mismatch');
 for(const tour of row.tours){
  const key=[tour,row.tournament,row.year,row.category||''].join('|');
  if(keys.has(key))throw new Error('Duplicate circuit edition: '+key);
  keys.set(key,row.photo);
 }
 if(assets.has(row.photo.src))continue;
 const file='public'+row.photo.src,bytes=await readFile(file),metadata=await sharp(bytes).metadata();
 const catalogue=photos.get(row.photo.src);
 if(!catalogue||metadata.width<740||metadata.width<metadata.height*1.15)throw new Error('Unregistered or insufficient edition photo: '+file);
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(catalogue.localSha256&&catalogue.localSha256!==digest)throw new Error('Media integrity mismatch: '+file);
 assets.set(row.photo.src,{width:metadata.width,height:metadata.height,bytes:bytes.length,sha256:digest});
}
const missing=[],counts={};
for(const edition of audit){
 if(edition.year<2000||edition.year>new Date().getUTCFullYear()||!['Grand Slam','Masters 1000','WTA 1000'].includes(edition.category))continue;
 const group=edition.tour+' '+edition.category,c=counts[group]||{editions:0,photos:0};counts[group]=c;c.editions++;
 const base=[edition.tour,edition.tournament,edition.year].join('|');
 if(keys.has(base+'|'+edition.category)||keys.has(base+'|'))c.photos++;else missing.push({tournament:edition.tournament,year:edition.year,tour:edition.tour,category:edition.category});
}
const report={schema:2,at:new Date().toISOString(),datasetVersion:manifest.version,scope:'Published editions 2000–current; Grand Slams and categories 1000. Cancelled editions are not invented. Images cannot be borrowed across years or circuits.',counts,editionCircuitKeys:keys.size,uniqueHeroAssets:assets.size,libraryPhotos:library.photos.length,heroBytes:[...assets.values()].reduce((n,a)=>n+a.bytes,0),below1200px:[...assets].filter(([,a])=>a.width<1200).map(([src,a])=>({src,width:a.width})),missing};
await writeFile('data/media/edition-photo-coverage-v31.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,missing:missing.length,below1200px:report.below1200px.length}));
