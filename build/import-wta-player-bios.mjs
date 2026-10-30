// Recover compact country metadata from the same official WTA profiles as the photos.
import fs from 'node:fs/promises';

const photos=JSON.parse(await fs.readFile('lib/player-photo-wta.json','utf8'));
const bios=JSON.parse(await fs.readFile('lib/wta-player-bio.json','utf8'));
const entries=Object.entries(photos).filter(([,photo])=>typeof photo.source==='string'&&photo.source.startsWith('https://www.wtatennis.com/players/'));
for(let offset=0;offset<entries.length;offset+=2){
  await Promise.all(entries.slice(offset,offset+2).map(async ([name,photo])=>{
    if(bios[name])return;
    for(let attempt=0;attempt<3;attempt++)try{
      const response=await fetch(photo.source,{headers:{'User-Agent':'Mozilla/5.0 (compatible; DEUCE/1.0)'},signal:AbortSignal.timeout(20_000)});
      if(!response.ok)continue;
      const html=await response.text();
      const country=html.match(/data-player-country="([A-Z]{3})"/)?.[1];
      if(country){bios[name]={country:country.toLowerCase()};break;}
    }catch{ /* A failed profile never invents a country. */ }
  }));
  await new Promise(resolve=>setTimeout(resolve,100));
}
await fs.writeFile('lib/wta-player-bio.json',`${JSON.stringify(bios,null,2)}\n`);
console.log(`${Object.keys(bios).length} verified WTA player countries`);
