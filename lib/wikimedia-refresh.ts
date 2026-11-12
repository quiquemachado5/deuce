import 'server-only';
import seed from './player-wikimedia-context.json';
import {cloudRead,cloudWrite} from './cloud-archive';
import {acquireArchiveLease} from './archive-store';
import {preparedPlayerRecords} from './revista/read-records';
import {fetchWikiContexts,compareWikiBiography,type WikiContextIndex,type WikiPerson} from './wikimedia-context';
import {providerPlayerBiography} from './player-bio';
import {withOperationHistory} from './archive-operations';

export async function publishedWikiContexts():Promise<WikiContextIndex>{
  const stored=await cloudRead('wikipedia-player-context').catch(()=>undefined);
  return {...seed,...stored?.contexts};
}
export async function refreshWikiPlayerContexts(){
  const release=await acquireArchiveLease('wikipedia-context',90);if(!release)return {status:'busy',calls:0};
  try{
    const stored=await cloudRead('wikipedia-player-context');
    const checked:Record<string,string>=stored?.checked||{};
    const previous=await publishedWikiContexts(),state=await cloudRead('wikipedia-sync-status'),now=new Date(),at=now.toISOString();
    const {records}=await preparedPlayerRecords();
    const stale=(person:WikiPerson)=>{const key=person.tour+':'+person.name,last=previous[key]?.checkedAt||checked[key];return !last||Date.parse(last)<now.getTime()-(previous[key]?90:30)*86400_000;};
    const roster=records.filter(person=>stale({name:person.name,tour:person.tour||'atp'})).sort((a,b)=>b.played-a.played);
    const people=(['atp','wta'] as const).flatMap(tour=>roster.filter(person=>(person.tour||'atp')===tour).slice(0,10).map(person=>({name:person.name,tour})));
    const result=await fetchWikiContexts(people,previous,{maximumRequests:4,pauseMs:500});
    const review=people.flatMap(person=>{
      const context=result.contexts[person.tour+':'+person.name];
      return context?[{name:person.name,tour:person.tour,comparisons:compareWikiBiography(context,providerPlayerBiography(person.name,person.tour)||{}),contestedFields:context.contestedFields||[],source:context.source}]:[];
    });
    const comparisons=review.flatMap(person=>person.comparisons);
    const verification={matched:comparisons.filter(row=>row.state==='matched').length,missingProvider:comparisons.filter(row=>row.state==='missing-provider').length,conflicts:comparisons.filter(row=>row.state==='conflict').length,contestedWikidata:review.filter(row=>row.contestedFields.length).length};
    if(!result.error)for(const person of people)checked[person.tour+':'+person.name]=at;
    await cloudWrite('wikipedia-player-context',{at,checked,contexts:result.contexts});
    await cloudWrite('wikipedia-biography-review',{at,summary:verification,people:review});
    const status={status:result.error?'deferred':'success',at,calls:result.calls,checked:people.length,accepted:Object.keys(result.contexts).length,unresolved:result.unresolved.length,verification,...(result.error?{message:result.error}:{})};
    await cloudWrite('wikipedia-sync-status',withOperationHistory(state,status));return status;
  }finally{await release();}
}
