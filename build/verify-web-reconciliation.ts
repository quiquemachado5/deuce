import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import references from '../lib/verified-season-results.json';

const root='data/archive/references/season-reconciliation';
async function main(){
  let sources=0;
  for(const [name,prefix] of [['manifest.json',''],['secondary-manifest.json','tml-'],['independent-manifest.json','odds-']] as const){
    const rows=JSON.parse(await readFile(join(root,name),'utf8')) as {tour:string;year:number;sha256?:string;error?:string}[];
    for(const row of rows){
      if(row.error)continue;
      const bytes=gunzipSync(await readFile(join(root,`${prefix}${row.tour}-${row.year}.csv.gz`)));
      if(createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw new Error(`Changed source: ${prefix}${row.tour}-${row.year}`);
      if(!bytes.toString().startsWith('tourney_id,'))throw new Error('Invalid season schema');
      sources++;
    }
  }
  const draws=JSON.parse(await readFile(join(root,'tnt/manifest.json'),'utf8')) as {year:number;tournament:string;sha256?:string;url:string;error?:string}[];
  for(const row of draws){
    if(row.error||!row.sha256)continue;
    const slug=new URL(row.url).pathname.split('/')[2];
    const bytes=gunzipSync(await readFile(join(root,'tnt',`wta-${row.year}-${slug.replace(/^wta-/,'')}.html.gz`)));
    if(createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw new Error(`Changed draw source: ${row.url}`);
    sources++;
  }
  const round2=JSON.parse(await readFile(join(root,'round2/manifest.json'),'utf8')) as {name:string;url:string;sha256?:string;error?:string}[];
  for(const row of round2){
    if(row.error||!row.sha256)continue;
    const bytes=await readFile(join(root,'round2',row.name+'.pdf'));
    if(createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw new Error(`Changed primary PDF: ${row.name}`);
    if(!bytes.subarray(0,4).equals(Buffer.from('%PDF')))throw new Error(`Invalid PDF: ${row.name}`);
    sources++;
  }
  const scope=JSON.parse(await readFile('lib/reviewed-fixture-scope.json','utf8')) as {matchId:string;tour:string;source:string;corroboration:string}[];
  const cases=JSON.parse(await readFile(join(root,'round2/case-review.json'),'utf8')) as {startingPending:number;corrected:number;reclassified:number;pending:number;cases:{matchId:string;outcome:string}[]};
  if(cases.cases.length!==cases.startingPending||new Set(cases.cases.map(row=>row.matchId)).size!==cases.startingPending||cases.corrected+cases.reclassified+cases.pending!==cases.startingPending)throw new Error('Unbalanced case review');
  for(const row of scope){
    if(!row.source.startsWith('https://www.usopen.org/')||!row.corroboration.startsWith('https://'))throw new Error(`Missing invitation evidence: ${row.matchId}`);
    if(!cases.cases.some(item=>item.matchId===row.matchId&&item.outcome==='outside-main-draw'))throw new Error(`Missing scope review: ${row.matchId}`);
  }
  const evidence=JSON.parse(await readFile(join(root,'verified-evidence.json'),'utf8')) as {canonicalSeason?:number;match:{match_id:string;tour:string;year:number};evidence:Record<string,unknown>}[];
  const identities=new Set<string>();
  for(const row of references){
    const key=`${row.tour}:${row.year}:${row.matchId}`;
    if(identities.has(key))throw new Error(`Duplicate correction: ${key}`);
    identities.add(key);
    if(!evidence.some(proof=>proof.match.match_id===row.matchId&&proof.match.tour===row.tour&&(proof.canonicalSeason||proof.match.year)===row.year&&Object.keys(proof.evidence).length))throw new Error(`Missing evidence: ${key}`);
    if(!row.source.startsWith('https://')||!row.corroboration.startsWith('https://'))throw new Error(`Missing source: ${key}`);
    if((row.tour==='wta')!==row.matchId.startsWith('wta-'))throw new Error(`Circuit collision: ${key}`);
  }
  console.log(JSON.stringify({verified:true,corrections:references.length,hashedSeasonSources:sources,liveTennisCalls:0}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
