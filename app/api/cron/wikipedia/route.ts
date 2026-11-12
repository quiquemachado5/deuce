import {authorizedCronRequest} from '@/lib/cron-auth';
import {unauthorizedResponse} from '@/lib/security-events';
import {refreshWikiPlayerContexts} from '@/lib/wikimedia-refresh';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=90;
export async function GET(request:Request){
  if(!authorizedCronRequest(request))return unauthorizedResponse(request,'cron.wikipedia');
  try{return Response.json(await refreshWikiPlayerContexts(),{headers:{'Cache-Control':'no-store'}});}
  catch{console.error('Wikimedia context refresh failed');return Response.json({status:'error',error:'Biographical enrichment deferred; results remain unchanged'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
