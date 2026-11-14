import {createHash} from 'node:crypto';
import type {Match} from '../types';
import type {RecordManifest,RecordPages,RecordMeta} from './snapshot';
import type {Era} from './records';
export type ReusableRecords={meta:RecordMeta[];pieces:Record<string,RecordPages>};
export type CompilationBaseline={atp?:ReusableRecords;wta?:ReusableRecords;eras?:Record<string,Era[]>};
export type CompilationState={inputs:{atp:string;wta:string};fullVerifiedAt:string;reusedCircuits:('atp'|'wta')[]};
const ignored=new Set(['provider_revision','raw_fixture','raw_point_tape','resultReviewedAt','retrieved_at']);
function stable(value:unknown):unknown{
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key,item])=>!ignored.has(key)&&item!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stable(item)]));
 return value;
}
export function statisticInputHash(matches:Match[],rules:string,year:number){
 const hash=createHash('sha256').update(`compiler-v1:${rules}:${year}`);
 for(const match of [...matches].sort((a,b)=>a.match_id.localeCompare(b.match_id)))hash.update(JSON.stringify(stable(match))).update('\n');
 return hash.digest('hex');
}
export function compilationPlan(matches:Match[],previous:RecordManifest,now:Date){
 const inputs={atp:statisticInputHash(matches.filter(match=>match.tour!=='wta'),previous.rulesVersion,now.getUTCFullYear()),wta:statisticInputHash(matches.filter(match=>match.tour==='wta'),previous.rulesVersion,now.getUTCFullYear())};
 const old=previous.compilation;
 const verifiedAt=old?Date.parse(old.fullVerifiedAt):NaN;
 const verifyFull=!old||!Number.isFinite(verifiedAt)||now.getTime()-verifiedAt>=7*86400_000;
 const unchanged=(['atp','wta'] as const).filter(tour=>old?.inputs[tour]===inputs[tour]);
 return{inputs,unchanged,reuse:verifyFull?[]:unchanged,verifyFull,fullVerifiedAt:verifyFull?now.toISOString():old!.fullVerifiedAt};
}
/** Periodic full builds must agree with reused statistics before publication. */
export function assertCompilationEquivalent(pieces:Record<string,RecordPages>,baseline:CompilationBaseline){
 for(const tour of ['atp','wta'] as const)for(const [id,before] of Object.entries(baseline[tour]?.pieces||{})){
  if(id.endsWith('tal-dia-como-hoy'))continue;
  const after=pieces[id];
  if(!after||JSON.stringify(stable(before))!==JSON.stringify(stable(after)))throw new Error(`Incremental statistic differs from full rebuild: ${id}`);
 }
}
