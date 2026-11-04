export const ARCHIVE_CATALOG_SCHEMA=1;

const category=(key:string)=>{
  if(key==='reading-v2-manifest'||key.startsWith('reading-v2-'))return 'publication';
  if(key.startsWith('detail-'))return 'details';
  if(key.startsWith('archive-wta-'))return 'wta-history';
  if(key.startsWith('season-')||key.startsWith('wta-season-'))return 'seasons';
  if(key.endsWith('-status')||key==='provider-quota-status')return 'operations';
  if(key.includes('progress')||key.endsWith('-state')||key.endsWith('-index'))return 'checkpoints';
  return 'other';
};

/** Compact operational inventory; it contains keys/counts, never match data. */
export function archiveKeyCatalog(keys:readonly string[],now=new Date()){
  const unique=[...new Set(keys)].sort(),categories:Record<string,number>={};
  const generationVersions=new Set<string>();
  for(const key of unique){
    const group=category(key);categories[group]=(categories[group]||0)+1;
    const version=/^reading-v2-([a-f0-9]{20})-/.exec(key)?.[1];if(version)generationVersions.add(version);
  }
  return {schema:ARCHIVE_CATALOG_SCHEMA,at:now.toISOString(),objects:unique.length,categories,generationVersions:[...generationVersions].sort()};
}
