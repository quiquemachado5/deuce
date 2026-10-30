type Row = {id:unknown;outcome?:string;scheduled_time?:string};
/** Changed results first, then rotate recent details by their last successful refresh. */
export function detailRefreshPlan<T extends Row>(rows:T[],previous:Map<string,T>,exists:(id:string)=>boolean,checked:Record<string,string>,now=Date.now(),needsRepair:(row:T)=>boolean=()=>false,keyOf:(row:T)=>string=row=>String(row.id)) {
  return rows.filter(r=>r.outcome==='completed').map(row=>{
    const id=keyOf(row),changed=JSON.stringify(previous.get(id))!==JSON.stringify(row);
    const recent=Date.parse(row.scheduled_time||'')>now-7*86400000;
    const missingDetail=!exists(id);
    return {row,priority:needsRepair(row)&&missingDetail?0:changed?1:missingDetail?2:3,recent,checked:Date.parse(checked[id]||'')||0};
  }).filter(x=>x.priority<3||x.recent).sort((a,b)=>a.priority-b.priority||a.checked-b.checked||String(b.row.scheduled_time).localeCompare(String(a.row.scheduled_time))).map(x=>x.row);
}
