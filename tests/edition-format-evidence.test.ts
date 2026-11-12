import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {auditEditions,editionCompleteness,normalizeEditionAudits,type EditionAudit} from '../lib/edition-audit';
import {mockMatches} from '../lib/mocks';
import evidence from '../lib/edition-format-evidence.json';
const audit=(extra:Partial<EditionAudit>):EditionAudit=>({tournament:'Ordinary',tour:'wta',year:2021,category:'WTA 500',sourceRows:26,completed:24,terminal:2,pending:0,hasFinal:false,rounds:{'3':12,'4':8,'5':4,'6':2},expectedLateRounds:false,missingLateRounds:[],completeDraw:null,...extra});

test('documented unplayed finals do not manufacture a missing match or certify the other branches',()=>{
 for(const [tournament,year]of [['Grampians Trophy',2021],['Scottsdale',2000]]as const){
  const result=normalizeEditionAudits([audit({tournament,year})])[0];
  assert.equal(result.sourceRows,26);assert.equal(result.finalStatus,'not-played');
  assert.deepEqual(result.missingLateRounds,[]);assert.equal(result.completeDraw,null);
  assert.equal(result.formatSources?.length,2);assert.equal(result.hasFinal,false);
  assert.deepEqual(editionCompleteness({...result,rounds:{'5':4,'6':1}}).missingLateRounds,['1 semifinal']);
  assert.equal(editionCompleteness({...result,rounds:{'5':4,'6':2,'7':1}}).completeDraw,false);
 }
 assert.deepEqual(editionCompleteness(audit({})).missingLateRounds,['1 final']);
});

test('ATP Cup rounds count individual singles in a team competition, not ATP250 knockout matches',()=>{
 for(const year of [2020,2021,2022]){
  const rounds:Record<string,number>=year===2020?{'0.5':72,'5':8,'6':4,'7':2}:{'0.5':year===2021?24:48,'6':4,'7':2};
  const input=audit({tournament:'Cup',tour:'atp',year,category:'ATP 250',rounds});
  const result=normalizeEditionAudits([input])[0];
  assert.equal(result.category,'ATP Cup');assert.equal(result.sourceCategory,'ATP 250');
  assert.equal(result.competitionFormat,'team-singles');assert.deepEqual(result.missingLateRounds,[]);
  assert.equal(result.completeDraw,null);assert.equal(result.sourceRows,input.sourceRows);
  assert.equal(editionCompleteness({...result,rounds:{...rounds,'6':3}}).completeDraw,false);
 }
 assert.equal(normalizeEditionAudits([audit({tournament:'Cup',tour:'wta',year:2021})])[0].category,'WTA 500');
 assert.equal(normalizeEditionAudits([audit({tournament:'Cup',tour:'atp',year:2019,category:'ATP 250'})])[0].category,'ATP 250');
});

test('AO1977 occurrences stay separate by recorded month, including both circuits',()=>{
 const matches=[];
 for(const tour of ['atp','wta']as const)for(const date of ['1977-01-03','1977-12-19'])for(const [round,count]of [['Quarterfinal',4],['Semifinal',2],['Final',1]]as const)for(let i=0;i<count;i++)matches.push({...mockMatches[0],tour,year:1977,category:'Grand Slam',tournament:'Australian Open',match_id:`${tour}-${date}-${round}-${i}`,round,status:'Finished',winner:1 as const,score_summary:{...mockMatches[0].score_summary,games:tour==='atp'?[[6,4],[6,3],[6,4]]:[[6,4],[6,3]]},context:{date}});
 const result=auditEditions(matches);
 assert.equal(result.length,4);assert.equal(result.reduce((s,a)=>s+a.sourceRows,0),28);
 assert.deepEqual(new Set(result.map(a=>a.occurrence)),new Set(['1977-01','1977-12']));
 assert.ok(result.every(a=>a.completeDraw===null&&a.missingLateRounds.length===0));
 assert.equal(normalizeEditionAudits(result).length,4);
 const old=audit({tournament:'Australian Open',year:1977,category:'Grand Slam',rounds:{'5':8,'6':4,'7':2}});
 assert.equal(normalizeEditionAudits([old])[0].completeDraw,null);
 const missing=auditEditions(matches.slice(1)).find(a=>a.sourceRows===6)!;
 assert.equal(missing.completeDraw,false);assert.deepEqual(missing.missingLateRounds,['1 cuarto']);
});

test('format evidence retains two independent hosts and immutable archived body hashes',()=>{
 const manifest=JSON.parse(readFileSync('data/archive/references/edition-format-v31/sources.json','utf8'));
 for(const rule of evidence.rules){
  assert.ok(new Set(rule.sources.map(url=>new URL(url).hostname)).size>=2);
  // Blocked providers remain declared, not falsely represented as archived.
  for(const source of manifest.sources.filter((s:{url:string;file?:string})=>rule.sources.includes(s.url)&&s.file)){
   const body=gunzipSync(readFileSync(`data/archive/references/edition-format-v31/${source.file}`));
   assert.equal(createHash('sha256').update(body).digest('hex'),source.sha256);
  }
 }
});

test('Adelaide2023 repeated tournaments split into recorded week occurrences without claiming complete certification',()=>{
 const matches=[];
 for(const tour of ['atp','wta']as const)for(const date of ['2023-01-02','2023-01-09'])for(const [round,count]of [['Quarterfinal',4],['Semifinal',2],['Final',1]]as const)for(let i=0;i<count;i++)matches.push({...mockMatches[0],tour,year:2023,tournament:'Adelaide 2',category:tour==='atp'?'ATP 250':'WTA 500',match_id:`${tour}-${date}-${round}-${i}`,round,status:'Finished',winner:1 as const,score_summary:{...mockMatches[0].score_summary,games:[[6,4],[6,3]]},context:{date}});
 const result=auditEditions(matches);assert.equal(result.length,4);assert.equal(result.reduce((s,a)=>s+a.sourceRows,0),28);assert.deepEqual(new Set(result.map(a=>a.occurrence)),new Set(['2023-week-1','2023-week-2']));assert.ok(result.every(a=>a.completeDraw===null&&a.missingLateRounds.length===0));
 const missing=auditEditions(matches.slice(1)).find(a=>a.sourceRows===6)!;assert.equal(missing.completeDraw,false);
});

test('historical result fixes retain full independent draw captures and their hashes',()=>{
 const manifest=JSON.parse(readFileSync('data/archive/references/edition-format-v31/sources.json','utf8'));
 for(const id of ['us1972-lequipe','us1972-wikipedia-de','ao1975-wikipedia']){
  const source=manifest.sources.find((s:{id:string;file?:string})=>s.id===id&&s.file);assert.ok(source,`Missing archived source ${id}`);
  const body=gunzipSync(readFileSync(`data/archive/references/edition-format-v31/${source.file}`));assert.equal(createHash('sha256').update(body).digest('hex'),source.sha256);
  assert.ok(body.length>10000);
 }
 const html=gunzipSync(readFileSync('data/archive/references/edition-format-v31/us1972-lequipe.html.gz')).toString();const fixture=html.slice(html.indexOf('title="Owens"'),html.indexOf('title="Owens"')+3300);assert.match(fixture,/title="Davidson"/);
 const home=fixture.match(/TennisScore__score--home[\s\S]*?<!--\]-->/)?.[0]||'';const away=fixture.match(/TennisScore__score--away[\s\S]*?<!--\]-->/)?.[0]||'';
 const numbers=(value:string)=>[...value.matchAll(/<span[^>]*>(\d+)<\/span>/g)].map(m=>Number(m[1]));assert.deepEqual(numbers(home),[4,6,6,6,3]);assert.deepEqual(numbers(away),[6,7,3,4,6]);
});
