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
  const [editions,atpQueue,wtaQueue,wiki,official,publish,atpSync,wtaSync,atpConflicts,wtaConflicts,atpDraw,wtaDraw]=await Promise.all([
    preparedEditionAudit(),cloudProbeRead('free-current-atp'),cloudProbeRead('free-current-wta'),cloudProbeRead('wikipedia-sync-status'),cloudProbeRead('official-records-status'),cloudProbeRead('publish-status'),
    cloudProbeRead('sync-status'),cloudProbeRead('wta-sync-status'),cloudProbeRead('result-conflicts-atp'),cloudProbeRead('result-conflicts-wta'),cloudProbeRead('result-draw-audit-atp'),cloudProbeRead('result-draw-audit-wta'),
  ]);
  const issues=currentEditionIssues(editions),queueIds=(value:unknown)=>value&&typeof value==='object'&&Array.isArray((value as {ids?:unknown}).ids)?(value as {ids:string[]}).ids.filter(id=>typeof id==='string').length:0;
  const pendingRepairs={atp:queueIds(atpQueue),wta:queueIds(wtaQueue)};
  const entries=(value:unknown)=>value&&typeof value==='object'&&Array.isArray((value as {entries?:unknown}).entries)?(value as {entries:unknown[]}).entries.length:0;
  const incompleteDraws=(value:unknown)=>value&&typeof value==='object'&&Array.isArray((value as {editions?:unknown}).editions)?(value as {editions:{complete?:unknown}[]}).editions.filter(row=>row?.complete===false).length:0;
  const source=(value:unknown)=>{const row=value&&typeof value==='object'?value as Record<string,unknown>:{};return {...validStatus(row),confirmed:Number.isSafeInteger(row.confirmed)?Number(row.confirmed):0,provisional:Number.isSafeInteger(row.provisional)?Number(row.provisional):0,conflicts:Number.isSafeInteger(row.conflicts)?Number(row.conflicts):0,evidence:row.probe&&typeof row.probe==='object'&&typeof (row.probe as Record<string,unknown>).evidence==='string'?(row.probe as Record<string,unknown>).evidence:'unavailable'};};
  const sourceConflicts=entries(atpConflicts)+entries(wtaConflicts),sourceIncompleteDraws=incompleteDraws(atpDraw)+incompleteDraws(wtaDraw);
  return {status:issues.length||sourceConflicts||sourceIncompleteDraws?'attention':'healthy',at:new Date().toISOString(),year:new Date().getUTCFullYear(),summary:{audited:editions.filter(row=>row.year===new Date().getUTCFullYear()).length,incomplete:issues.length,missingLateRounds:issues.reduce((sum,row)=>sum+row.missingLateRounds.length,0),pendingResults:issues.reduce((sum,row)=>sum+row.pending,0),pendingRepairs:pendingRepairs.atp+pendingRepairs.wta,sourceConflicts,sourceIncompleteDraws},pendingRepairs,issues,sources:{atp:source(atpSync),wta:source(wtaSync)},wikimedia:validStatus(wiki),officialRecords:validStatus(official),publication:validStatus(publish)};
}
