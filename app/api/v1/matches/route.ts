import { generationMetadata } from '@/lib/revista/generation';
import { DATASET_CACHE_CONTROL } from '@/lib/http-cache';
import { preparedMatchBrowser } from '@/lib/revista/read-records';
import { queryMatchBrowserPage } from '@/lib/match-browser-snapshot';
import { rateLimit } from '@/lib/rate-limit';
import { datasetEtag } from '@/lib/http-cache';
import { csvCell } from '@/lib/csv';

const invalidLength=(value:string|null,max:number)=>value!==null&&value.length>max;
const integer=(value:string|null,min:number,max:number,defaultValue?:number)=>{
  if(value===null)return {value:defaultValue};
  if(!/^\d+$/.test(value))return {error:true};
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>=min&&parsed<=max?{value:parsed}:{error:true};
};

export async function GET(request: Request) {
  const budget=rateLimit(request,'public-api-matches',90,60_000);
  if(!budget.allowed)return Response.json({error:'Rate limit exceeded'},{status:429,headers:{'Retry-After':String(budget.retryAfter)}});
  const url=new URL(request.url),p=url.searchParams,tourValue=p.get('tour')||'atp',format=p.get('format')||'json';
  if(!['atp','wta','all'].includes(tourValue))return Response.json({error:'Invalid tour. Use atp, wta or all.'},{status:400,headers:{'Access-Control-Allow-Origin':'*'}});
  if(!['json','csv'].includes(format))return Response.json({error:'Invalid format. Use json or csv.'},{status:400,headers:{'Access-Control-Allow-Origin':'*'}});
  const surface=p.get('surface');if(surface&&!['hard','clay','grass','carpet','unknown'].includes(surface))return Response.json({error:'Invalid surface.'},{status:400,headers:{'Access-Control-Allow-Origin':'*'}});
  for(const [name,max] of [['player',100],['tournament',100],['category',80],['round',80],['q',120]] as const)if(invalidLength(p.get(name),max))return Response.json({error:`Invalid ${name}. Maximum length is ${max}.`},{status:400,headers:{'Access-Control-Allow-Origin':'*'}});
  const yearValue=integer(p.get('year'),1968,2100),limitValue=integer(p.get('limit'),1,100,25),pageValue=integer(p.get('page'),1,1000,1);
  if(yearValue.error)return Response.json({error:'Invalid year. Use an integer from 1968 to 2100.'},{status:400,headers:{'Access-Control-Allow-Origin':'*'}});
  if(limitValue.error)return Response.json({error:'Invalid limit. Use an integer from 1 to 100.'},{status:400,headers:{'Access-Control-Allow-Origin':'*'}});
  if(pageValue.error)return Response.json({error:'Invalid page. Use an integer from 1 to 1000.'},{status:400,headers:{'Access-Control-Allow-Origin':'*'}});
  const tour=tourValue as 'atp'|'wta'|'all';
  const limit=limitValue.value!,page=pageValue.value!,year=yearValue.value;
  const browser=await preparedMatchBrowser(tour,year,year);
  const result=queryMatchBrowserPage(browser.partitions,{q:p.get('q')?.slice(0,120)||undefined,player:p.get('player')?.slice(0,100)||undefined,year,tournament:p.get('tournament')?.slice(0,100)||undefined,category:p.get('category')?.slice(0,80)||undefined,surface:(surface||undefined) as 'hard'|'clay'|'grass'|'carpet'|'unknown'|undefined,round:p.get('round')?.slice(0,80)||undefined},page,limit);
  const scope=[...p.entries()].sort().map(row=>row.join('=')).join('&'),etag=datasetEtag(browser.manifest.version,`api-v1-matches:${scope}`);
  const headers=new Headers({'Cache-Control':DATASET_CACHE_CONTROL,'ETag':etag,'X-DEUCE-Dataset-Version':browser.manifest.version,'X-DEUCE-Attribution':'DEUCE archive; cite dataset version and request URL','X-RateLimit-Remaining':String(budget.remaining),'Access-Control-Allow-Origin':'*'});
  if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers});
  if(format==='csv'){
    headers.set('Content-Type','text/csv; charset=utf-8');headers.set('Content-Disposition',`attachment; filename="deuce-matches-${browser.manifest.version}.csv"`);
    const columns=['match_id','tour','year','tournament','category','round','surface','player1','player2','winner','score'];
    const body=[columns.join(','),...result.matches.map(match=>[match.match_id,match.tour,match.year,match.tournament,match.category,match.round,match.surface,match.player1.name,match.player2.name,match.winner,match.final_score].map(csvCell).join(','))].join('\n');
    return new Response(`\uFEFF${body}\n`,{headers});
  }
  return Response.json({apiVersion:'v1',...generationMetadata(browser),attribution:'DEUCE archive; cite datasetVersion and this request URL.',page,limit,total:result.total,matches:result.matches},{headers});
}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept, If-None-Match'}})}
