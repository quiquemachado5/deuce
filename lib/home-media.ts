import catalog from './home-media-refresh.json';
import type { Photo } from './imagery';

export type HomeMediaKey=keyof typeof catalog;
export function homePhoto(key:HomeMediaKey):Photo{
  const item=catalog[key];
  if(key==='wimbledon')return {src:'/images/home-curated/wimbledon-final-2023.webp',thumbnail:'/images/home-curated/wimbledon-final-2023-small.webp',alt:item.alt,credit:item.credit,source:item.source,licenseUrl:'https://creativecommons.org/licenses/by-sa/2.0/',objectPosition:item.focus,mobileObjectPosition:item.focus};
  return {src:`/images/home-curated/${key}.webp`,thumbnail:`/images/home-curated/${key}-small.webp`,alt:item.alt,credit:item.credit,source:item.source,objectPosition:item.focus,mobileObjectPosition:item.focus,caption:'Selección fotográfica de la portada. Fuente editorial conservada; consultar las condiciones del titular.'};
}
const playerKeys:Record<string,HomeMediaKey>={'Roger Federer':'federer','Rafael Nadal':'nadal','Novak Djokovic':'djokovic','Andy Murray':'murray','Serena Williams':'serena','Chanda Rubin':'rubin','Daniela Hantuchova':'hantuchova','Daniela Hantuchová':'hantuchova','Ugo Humbert':'humbert'};
export function homePlayerPhoto(name:string):Photo|null{const key=playerKeys[name];return key?homePhoto(key):null;}
export const homePhotoCredits=Object.entries(catalog).map(([key,item])=>({key:`home-${key}`,name:`Portada · ${item.name}`,photo:homePhoto(key as HomeMediaKey),kind:item.kind as 'players'|'courts'}));
