import assert from 'node:assert/strict';
import test from 'node:test';
import {mockMatches} from '../lib/mocks';
import {compileMatchBrowser} from '../lib/match-browser-snapshot';
import {cachedMatchBrowserQuery} from '../lib/match-browser-query-cache';
import {warmPublishedNavigation} from '../lib/publication-warmup';

test('browser query cache shares work and separates circuit, filters and generation',async()=>{
 const partitions=compileMatchBrowser([{...mockMatches[0],tour:'atp',match_id:'cache-match'}]).partitions;let loads=0;
 const load=async()=>{loads++;return partitions;};
 const source={version:'cache-first',source:'bundled',tour:'atp'};
 const [a,b]=await Promise.all([cachedMatchBrowserQuery(source,{},load),cachedMatchBrowserQuery(source,{},load)]);
 assert.equal(loads,1);assert.deepEqual(a,b);
 await cachedMatchBrowserQuery({...source,tour:'wta'},{},async()=>{loads++;return [];});assert.equal(loads,2);
 await cachedMatchBrowserQuery(source,{surface:'grass'},load);assert.equal(loads,3);
 await cachedMatchBrowserQuery({...source,version:'cache-next'},{},load);assert.equal(loads,4);
 await cachedMatchBrowserQuery(source,{},load,4,3);assert.equal(loads,5);
});
test('publication warming uses only sequential local read routes and continues after failures',async()=>{
 const calls:string[]=[];let active=0,max=0;
 const request=(async(input)=>{const url=String(input);calls.push(url);active++;max=Math.max(max,active);await Promise.resolve();active--;if(url.endsWith('/api/overview'))throw new Error('temporary');return new Response('ready',{status:200});}) as typeof fetch;
 const result=await warmPublishedNavigation(3000,request);
 assert.equal(max,1);assert.equal(result.length,5);assert.equal(result[0].status,0);assert.ok(result.slice(1).every(row=>row.status===200));
 assert.ok(calls.every(url=>url.startsWith('http://127.0.0.1:3000/')&&!url.includes('/api/cron/')));
});
