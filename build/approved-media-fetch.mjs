/** Manual importers declare exact public HTTPS hosts; redirects never extend that trust boundary. */
export function createApprovedFetch(hostnames,{maximumBytes=20*1024*1024,timeoutMs=20000}={}){
 if(!Number.isSafeInteger(maximumBytes)||maximumBytes<1||!Number.isSafeInteger(timeoutMs)||timeoutMs<1)throw Error('Invalid download budget');
 const hosts=new Set(hostnames);
 if(!hosts.size||[...hosts].some(host=>typeof host!=='string'||!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(host)))throw Error('Invalid approved download hosts');
 return async function approvedFetch(raw,options={},fetcher=fetch){
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!hosts.has(url.hostname))throw Error('Unapproved media destination');
  const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs);
  const response=await fetcher(url,{...options,redirect:'manual',signal});
  if(response.status>=300&&response.status<400){await response.body?.cancel();throw Error('Media redirect rejected');}
  if(Number(response.headers.get('content-length'))>maximumBytes){await response.body?.cancel();throw Error('Media response exceeds size budget');}
  if(!response.body)return response;
  const reader=response.body.getReader(),chunks=[];let total=0,rejectAbort;
  const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(signal.reason||new Error('Media download timed out'));signal.addEventListener('abort',rejectAbort,{once:true});if(signal.aborted)rejectAbort();});
  try{
   while(true){const {value,done}=await Promise.race([reader.read(),aborted]);if(done)break;total+=value.byteLength;if(total>maximumBytes)throw Error('Media response exceeds size budget');chunks.push(value);}
  }catch(error){void reader.cancel().catch(()=>{});throw error;}
  finally{signal.removeEventListener('abort',rejectAbort);reader.releaseLock();}
  return new Response(Buffer.concat(chunks),{status:response.status,statusText:response.statusText,headers:response.headers});
 };
}
export const approvedMediaFetch=createApprovedFetch(['commons.wikimedia.org','upload.wikimedia.org','thumb.wikimedia.org']);
