type Href=string|{pathname?:string|null;search?:string|null;query?:string|Record<string,unknown>|null;hash?:string|null};
export function prefetchPath(href:Href){
 if(typeof href==='string')return href.startsWith('/')&&!href.startsWith('//')?href.split('#')[0]:null;
 if(!href.pathname?.startsWith('/')||href.pathname.startsWith('//'))return null;
 const query=new URLSearchParams();
 if(typeof href.query==='string')return href.pathname+(href.search||`?${href.query}`);
 for(const [key,value] of Object.entries(href.query||{}))for(const item of Array.isArray(value)?value:[value])if(item!==undefined&&item!==null)query.append(key,String(item));
 return href.pathname+(href.search||(query.size?`?${query}`:''));
}
/** TTL and invalidation release a route; old intent cannot pin stale data. */
export function createPrefetchBudget(ttl=60_000,capacity=64){
 const entries=new Map<string,number>();
 return {claim(path:string,now=Date.now()){
  if((entries.get(path)||0)>now)return false;
  entries.delete(path);entries.set(path,now+ttl);
  while(entries.size>capacity)entries.delete(entries.keys().next().value!);
  return true;
 },invalidate(path:string){entries.delete(path);}};
}
