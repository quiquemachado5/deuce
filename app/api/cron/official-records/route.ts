import {authorizedCronRequest} from '@/lib/cron-auth';
import {refreshOfficialRecordEvidence} from '@/lib/official-records';
import {unauthorizedResponse} from '@/lib/security-events';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=120;
export async function GET(request:Request){
  if(!authorizedCronRequest(request))return unauthorizedResponse(request,'cron.official-records');
  try{return Response.json(await refreshOfficialRecordEvidence(),{headers:{'Cache-Control':'no-store'}});}
  catch{console.error('Official record evidence refresh failed');return Response.json({status:'deferred',error:'Official evidence refresh deferred'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
