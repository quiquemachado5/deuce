import type {RecordManifest} from './revista/snapshot';
import type {PublicArchiveProducts} from './public-archive-products';
export const PUBLIC_ARCHIVE_SCHEMA=2;
/** Counters are computed by the publisher from the actual arrays before moving the pointer. */
export function validPublicArchiveProof(value:unknown,manifest:RecordManifest):value is PublicArchiveProducts{
 if(!value||typeof value!=='object')return false;
 const data=value as PublicArchiveProducts,proof=data.integrity;
 return data.schema===PUBLIC_ARCHIVE_SCHEMA&&data.version===manifest.version&&!!proof
  &&proof.matches===manifest.matchCount&&proof.playerParticipations===manifest.matchCount*2
  &&proof.competition===(manifest.competitionCount||0)&&Number.isSafeInteger(proof.players)&&proof.players>0
  &&!!data.players&&typeof data.players==='object'&&!Array.isArray(data.players)&&Object.keys(data.players).length===proof.players
  &&Array.isArray(data.coverage)&&data.coverage.every(row=>Number.isSafeInteger(row.matches)&&row.matches>=0)
  &&data.coverage.reduce((sum,row)=>sum+row.matches,0)===manifest.matchCount;
}
