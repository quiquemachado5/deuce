import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const file='data/media/tournament-library.json',catalog=JSON.parse(await readFile(file,'utf8'));
let index=0;
await Promise.all(Array.from({length:4},async()=>{while(index<catalog.photos.length){const photo=catalog.photos[index++];const src=photo.src.replace(/\.webp$/,'-small.webp');const bytes=await sharp('public'+photo.src).resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:76}).toBuffer();await writeFile('public'+src,bytes);Object.assign(photo,{thumbnailSrc:src,thumbnailBytes:bytes.length,thumbnailSha256:createHash('sha256').update(bytes).digest('hex')})}}));
await writeFile(file,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({photos:catalog.photos.length,sourceBytes:catalog.photos.reduce((s,p)=>s+p.bytes,0),thumbnailBytes:catalog.photos.reduce((s,p)=>s+p.thumbnailBytes,0)}));
