import 'server-only';
import {bioKey,mergeBio,playerBiography,type PlayerBio} from './player-bio';
import {publishedWikiContexts} from './wikimedia-refresh';

/** Profiles read the last published cache only; no visitor request reaches Wikimedia. */
export async function publishedPlayerBiography(name:string,tour:'atp'|'wta'='atp'):Promise<PlayerBio|undefined>{
  const base=playerBiography(name,tour),contexts=await publishedWikiContexts();
  const exact=contexts[`${tour}:${name}`]||Object.values(contexts).find(row=>row.tour===tour&&bioKey(row.name)===bioKey(name));
  if(!exact)return base;
  return mergeBio(base,{...(exact.birthday?{birthday:exact.birthday}:{}),...(exact.playingHand?{hand:exact.playingHand}:{}),...(exact.backhand?{backhand:exact.backhand}:{}),...(exact.heightCm?{heightCm:exact.heightCm}:{})});
}
