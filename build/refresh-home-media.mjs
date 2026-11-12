import {createApprovedFetch} from './approved-media-fetch.mjs';
const fetch=createApprovedFetch(["assets.tennismajors.com", "cdn.wearetennis.bnpparibas", "cincinnatiopen.com", "cloudfront-us-east-1.images.arcpublishing.com", "eu-images.contentstack.com", "imageio.forbes.com", "images.prismic.io", "media.gq.com.mx", "media.gqitalia.it", "nbcsports.brightspotcdn.com", "resizer.glanacion.com", "static.independentespanol.com", "upload.wikimedia.org", "www.2playbook.com", "www.datocms-assets.com", "www.lta.org.uk", "www.mccc.mc", "www.performanceinlighting.com", "www.sportesalute.eu"]);
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const catalog=JSON.parse(await fs.readFile(new URL('../lib/home-media-refresh.json',import.meta.url),'utf8'));
const output=new URL('../public/images/home-curated/',import.meta.url);
await fs.mkdir(output,{recursive:true});
let cursor=0;
const requested=process.argv.find(value=>value.startsWith('--only='))?.slice(7).split(',');
const entries=Object.entries(catalog).filter(([key])=>!requested||requested.includes(key));
const failed=[];
await Promise.all(Array.from({length:4},async()=>{
  while(cursor<entries.length){
    const [key,item]=entries[cursor++];
    try{
      const response=await fetch(item.remote,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'DEUCE image ingestion; source attribution in /licencias'}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const input=Buffer.from(await response.arrayBuffer());
      const metadata=await sharp(input).metadata();
      if(!metadata.width||metadata.width<800)throw new Error(`Insufficient resolution: ${metadata.width}`);
      const image=sharp(input).rotate();
      const full=await image.clone().resize({width:1800,withoutEnlargement:true}).webp({quality:88}).toFile(path.join(output.pathname,`${key}.webp`));
      await image.clone().resize({width:600,withoutEnlargement:true}).webp({quality:82}).toFile(path.join(output.pathname,`${key}-small.webp`));
      console.log(`${key}: ${full.width}×${full.height}, ${Math.round(full.size/1024)} KB`);
    }catch(error){failed.push(key);console.error(`${key}: ${error.message}`)}
  }
}));
if(failed.length){console.error(`Failed: ${failed.join(', ')}`);process.exitCode=1;}
