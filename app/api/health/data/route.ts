import {dataReliabilityReport} from '@/lib/data-reliability';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export async function GET(){
  try{const report=await dataReliabilityReport();return Response.json({status:report.status,at:report.at,year:report.year,summary:report.summary},{headers:{'Cache-Control':'public, max-age=0, s-maxage=300, stale-while-revalidate=900'}});}
  catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
