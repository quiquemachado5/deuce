import {preparedGeneration} from '@/lib/revista/read-records';
export const dynamic='force-dynamic';
/** Public readiness exposes no storage, host, quota, backup or scheduler internals. */
export async function GET(){
 try{
  const {manifest,fallbackReason}=await preparedGeneration();
  const ready=manifest.matchCount>0&&!fallbackReason;
  return Response.json({status:ready?'ready':'degraded',datasetVersion:manifest.version},{status:ready?200:503,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
