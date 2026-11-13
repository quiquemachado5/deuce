import { DATASET_CACHE_CONTROL } from '@/lib/http-cache';
import { preparedEloProducts, preparedGeneration } from '@/lib/revista/read-records';
import { generationMetadata } from '@/lib/revista/generation';
import { rateLimit } from '@/lib/rate-limit';
import { datasetEtag } from '@/lib/http-cache';

export async function GET(request: Request) {
  const budget = rateLimit(request,'public-api-overview',120,60_000);
  if (!budget.allowed) return Response.json({error:'Rate limit exceeded'},{status:429,headers:{'Retry-After':String(budget.retryAfter)}});
  const [generation,elo] = await Promise.all([preparedGeneration(),preparedEloProducts()]), manifest=generation.manifest, etag = datasetEtag(manifest.version,'api-v1-archive');
  const headers = {'Cache-Control':DATASET_CACHE_CONTROL,'ETag':etag,'X-DEUCE-Dataset-Version':manifest.version,'X-RateLimit-Remaining':String(budget.remaining),'Access-Control-Allow-Origin':'*'};
  if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers});
  return Response.json({
    api:'DEUCE Read API',version:'v1',dataset:{version:manifest.version,generatedAt:manifest.generatedAt,matches:manifest.matchCount,tours:manifest.summary.tours,freshness:generationMetadata(generation).freshness},
    derived:{elo:{modelVersion:elo.modelVersion||null,method:elo.method,calibration:elo.calibration||null,surfaceCalibration:elo.surfaceCalibration||null}},
    attribution:'Data derived from the documented DEUCE archive. Cite the dataset version and request URL.',
    endpoints:{matches:'/api/v1/matches',csv:'/api/v1/matches?format=csv',openapi:'/api/v1/openapi',documentation:'/desarrolladores'},
    upstream:{exposed:false,note:'This API reads immutable DEUCE publication artifacts and never proxies provider credentials or live quota.'},
  },{headers});
}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept, If-None-Match'}})}
