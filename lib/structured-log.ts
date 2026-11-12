import { randomUUID } from 'node:crypto';

export function requestId(request?: Request) {
  const supplied=request?.headers.get('x-request-id');
  return supplied&&/^[a-zA-Z0-9._:-]{1,96}$/.test(supplied)?supplied:randomUUID();
}

/** Logs retain route context, never credentials, query strings or unbounded payloads. */
export function safeLogFields(fields:Record<string,string|number|boolean|null|undefined>){
  return Object.fromEntries(Object.entries(fields).filter(([key])=>!/(?:authorization|password|secret|token|cookie|api.?key)/i.test(key)&&!['at','level','event'].includes(key)).map(([key,value])=>{
    if(typeof value!=='string')return [key,value];
    const safe=value.replace(/https?:\/\/[^\s]+/g,raw=>{try{const url=new URL(raw);url.username='';url.password='';url.search='';url.hash='';return url.toString()}catch{return '[invalid URL]'}}).replace(/(?:Bearer\s+)[^\s]+/gi,'Bearer [redacted]').replace(/([?&](?:token|api.?key|secret|password)=)[^&\s]*/gi,'$1[redacted]').replace(/[\u0000-\u001f\u007f]/g,' ');
    return [key,safe.slice(0,600)];
  }));
}

export function logEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
) {
  const row = JSON.stringify({ ...safeLogFields(fields), at: new Date().toISOString(), level, event:event.slice(0,96) });
  if (level === 'error') console.error(row);
  else if (level === 'warn') console.warn(row);
  else console.info(row);
}
