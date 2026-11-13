import type {RecordManifest,Snapshot} from './snapshot';
/** A record definition remains addressable when a source review leaves no qualifying result. */
export function retainCatalogueDefinitions(snapshot:Pick<Snapshot,'manifest'|'pieces'>,baseline:RecordManifest) {
  for(const tour of ['atp','wta'] as const){
    const current=tour==='atp'?snapshot.manifest.pieces:snapshot.manifest.circuitPieces?.wta;
    if(!current)continue;
    const prior=tour==='atp'?baseline.pieces:baseline.circuitPieces?.wta||[];
    for(const meta of prior){
      if(meta.id==='tal-dia-como-hoy'||current.some(row=>row.id===meta.id))continue;
      current.push({...meta,sample:0,total:0,smallTotal:0,leader:undefined,leaders:[],pagePrior:{},smallPagePrior:{}});
      snapshot.pieces[`${tour==='wta'?'wta-':''}${meta.id}`]={pages:{},smallPages:{}};
    }
  }
}
