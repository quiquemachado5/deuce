import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,isAbsolute,resolve} from 'node:path';
import {createHash} from 'node:crypto';

export const sharedBucketCapacity=32_768;
export type RateLimitBudget={allowed:boolean;remaining:number;retryAfter:number};
type Handle={db:DatabaseSync;lastPrune:number};
const handles=new Map<string,Handle>();
let failures=0;
const cooldowns=new Map<string,number>();
const rejected:RateLimitBudget={allowed:false,remaining:0,retryAfter:1};

/** One writable local volume, shared by every Node worker/container on this host. */
export function sharedRateLimitPath(env:Partial<NodeJS.ProcessEnv>=process.env):string|undefined {
 if(env.DEUCE_RATE_LIMIT_DB?.trim())return env.DEUCE_RATE_LIMIT_DB.trim();
 if(env.DEUCE_ARCHIVE_DIR?.trim())return resolve(env.DEUCE_ARCHIVE_DIR,'.runtime','rate-limits.sqlite');
 return undefined;
}
function database(path:string):Handle {
 const existing=handles.get(path);if(existing)return existing;
 if(!isAbsolute(path)||path.includes('\0'))throw new Error('Rate limiter requires an absolute shared path');
 mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);
 try{
  chmodSync(path,0o600);
  db.exec('PRAGMA busy_timeout=25; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA cache_size=-256; PRAGMA journal_size_limit=1048576; PRAGMA wal_autocheckpoint=64; PRAGMA max_page_count=2048;');
  db.exec('CREATE TABLE IF NOT EXISTS buckets (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL) WITHOUT ROWID; CREATE INDEX IF NOT EXISTS bucket_expiry ON buckets(reset_at);');
 }catch(error){db.close();throw error;}
 const handle={db,lastPrune:0};handles.set(path,handle);return handle;
}

/** Single SQLite statement serializes increments across processes; storage/busy errors never fall back to memory. */
export function sharedRateLimit(path:string,key:string,limit:number,windowMs:number,now=Date.now()):RateLimitBudget {
 if(!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(windowMs)||windowMs<1||windowMs>86_400_000)return rejected;
 if((cooldowns.get(path)||0)>Date.now())return rejected;
 try{
  const handle=database(path);
  if(now-handle.lastPrune>=30_000){
   // Each sweep is bounded even if the database contains old entries from many workers.
   handle.db.prepare('DELETE FROM buckets WHERE key IN (SELECT key FROM buckets WHERE reset_at<=? LIMIT 1024)').run(now);handle.lastPrune=now;
  }
  const hash=createHash('sha256').update(key).digest('hex');
  const row=handle.db.prepare(`INSERT INTO buckets(key,count,reset_at)
   SELECT ?,1,? WHERE EXISTS(SELECT 1 FROM buckets WHERE key=?) OR (SELECT COUNT(*) FROM buckets)<?
   ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,
   reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END
   RETURNING count,reset_at`).get(hash,now+windowMs,hash,sharedBucketCapacity,now,now) as {count:number;reset_at:number}|undefined;
  if(!row)return rejected;
  return {allowed:row.count<=limit,remaining:Math.max(0,limit-row.count),retryAfter:Math.max(1,Math.ceil((row.reset_at-now)/1000))};
 }catch{
  failures++;cooldowns.set(path,Date.now()+1000);return rejected;
 }
}
export function sharedRateLimitDiagnostics(path:string|undefined){
 try{const handle=path?handles.get(path):undefined;return {entries:handle?Number(handle.db.prepare('SELECT COUNT(*) AS total FROM buckets').get()?.total||0):0,capacity:sharedBucketCapacity,evictions:0,failures,shared:1};}catch{return{entries:0,capacity:sharedBucketCapacity,evictions:0,failures:failures+1,shared:1};}
}
/** Close handles for isolated tests and graceful lifecycle changes; persisted budgets are deliberately retained. */
export function closeSharedRateLimitHandles(){for(const handle of handles.values())handle.db.close();handles.clear();cooldowns.clear();failures=0;}
