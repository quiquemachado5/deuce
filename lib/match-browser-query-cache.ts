import 'server-only';
import {asyncCache} from './async-cache';
import {queryMatchBrowser,type BrowserFilter,type MatchBrowserPartition} from './match-browser-snapshot';
const results=asyncCache<ReturnType<typeof queryMatchBrowser>>(86_400_000,48,undefined,{maxWeight:16*1024*1024,weight:value=>JSON.stringify(value).length*2});
/** Cache the bounded result, and do not open decade shards on a cache hit. */
export function cachedMatchBrowserQuery(source:{version:string;source:string;tour:string},filter:BrowserFilter,load:()=>Promise<MatchBrowserPartition[]>,dailyLimit=2,seasonLimit=3){
 const scope=Object.fromEntries(Object.entries(filter).sort(([a],[b])=>a.localeCompare(b)));
 const key=JSON.stringify([source.version,source.source,source.tour,scope,dailyLimit,seasonLimit]);
 return results(key,async()=>queryMatchBrowser(await load(),filter,dailyLimit,seasonLimit));
}
