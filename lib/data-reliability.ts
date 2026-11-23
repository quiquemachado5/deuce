import 'server-only';
import {cloudProbeRead} from './cloud-archive';
import {editionCompleteness,type EditionAudit} from './edition-audit';
import {preparedEditionAudit} from './revista/read-records';

const validStatus=(value:unknown)=>{
  const row=value&&typeof value==='object'?value as Record<string,unknown>:{};
  return {status:typeof row.status==='string'?row.status:'unavailable',at:typeof row.at==='string'&&Number.isFinite(Date.parse(row.at))?row.at:null,calls:Number.isSafeInteger(row.calls)?Number(row.calls):undefined,records:Number.isSafeInteger(row.records)?Number(row.records):undefined,checked:Number.isSafeInteger(row.checked)?Number(row.checked):undefined};
};
export function currentEditionIssues(editions:EditionAudit[],year=new Date().getUTCFullYear()){
  return editions.filter(row=>row.year===year).map(row=>({...row,...editionCompleteness(row)})).filter(row=>row.expectedLateRounds&&(row.pending>0||row.missingLateRounds.length>0||row.completeDraw===false)).map(row=>({tour:row.tour||'atp',tournament:row.tournament,year:row.year,category:row.category,pending:row.pending,missingLateRounds:row.missingLateRounds,completed:row.completed,completeDraw:row.completeDraw}));
}
export async function dataReliabilityReport(){
  const [editions,atpQueue,wtaQueue,wiki,official,publish]=await Promise.all([preparedEditionAudit(),cloudProbeRead('free-current-atp'),cloudProbeRead('free-current-wta'),cloudProbeRead('wikipedia-sync-status'),cloudProbeRead('official-records-status'),cloudProbeRead('publish-status')]);
  const issues=currentEditionIssues(editions),queueIds=(value:unknown)=>value&&typeof value==='object'&&Array.isArray((value as {ids?:unknown}).ids)?(value as {ids:string[]}).ids.filter(id=>typeof id==='string').length:0;
  const pendingRepairs={atp:queueIds(atpQueue),wta:queueIds(wtaQueue)};
  return {status:issues.length?'attention':'healthy',at:new Date().toISOString(),year:new Date().getUTCFullYear(),summary:{audited:editions.filter(row=>row.year===new Date().getUTCFullYear()).length,incomplete:issues.length,missingLateRounds:issues.reduce((sum,row)=>sum+row.missingLateRounds.length,0),pendingResults:issues.reduce((sum,row)=>sum+row.pending,0),pendingRepairs:pendingRepairs.atp+pendingRepairs.wta},pendingRepairs,issues,wikimedia:validStatus(wiki),officialRecords:validStatus(official),publication:validStatus(publish)};
}
