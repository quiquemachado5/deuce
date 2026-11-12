import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import nextConfig from '../next.config';
import {createRequire} from 'node:module';
import {boundedDatasetCacheControl,DATASET_CACHE_CONTROL,datasetEtag,versionedJson} from '../lib/http-cache';

test('mutable dataset URLs cannot retain a day or week of stale statistical results',()=>{
 for(const policy of ['public, s-maxage=86400, stale-while-revalidate=604800','public, max-age=31536000, immutable',undefined])assert.equal(boundedDatasetCacheControl(policy),DATASET_CACHE_CONTROL);
 assert.equal(boundedDatasetCacheControl('public, s-maxage=60, stale-while-revalidate=120'),'public, max-age=0, s-maxage=60, stale-while-revalidate=120');
 assert.equal(boundedDatasetCacheControl('private, no-store'),'private, no-store');
 const request=new Request('https://deuce.test/api/test');
 const first=versionedJson(request,{version:'old'},{version:'old',scope:'x',route:'test',started:performance.now(),cacheControl:'public, s-maxage=86400, stale-while-revalidate=604800'});
 assert.equal(first.headers.get('Cache-Control'),DATASET_CACHE_CONTROL);
 const staleRequest=new Request(request.url,{headers:{'If-None-Match':datasetEtag('old','x')}});
 const current=versionedJson(staleRequest,{version:'new'},{version:'new',scope:'x',route:'test',started:performance.now()});
 assert.equal(current.status,200);assert.notEqual(current.headers.get('ETag'),first.headers.get('ETag'));
 const unchanged=versionedJson(new Request(request.url,{headers:{'If-None-Match':current.headers.get('ETag')!}}),{}, {version:'new',scope:'x',route:'test',started:performance.now()});
 assert.equal(unchanged.status,304);assert.equal(unchanged.headers.get('Cache-Control'),DATASET_CACHE_CONTROL);
});
test('unversioned media revalidates and reverse proxy never replaces application cache headers',async()=>{
 const headers=await nextConfig.headers!();
 for(const path of ['/images/:path*','/media/:path*','/videos/:path*'])assert.equal(headers.find(row=>row.source===path)?.headers.find(row=>row.key==='Cache-Control')?.value,'public, max-age=86400, must-revalidate');
 assert.match(headers.find(row=>row.source==='/fonts/:path*')?.headers.find(row=>row.key==='Cache-Control')?.value||'',/immutable/);
 for(const path of ['ops/oracle/Caddyfile','ops/vps/Caddyfile']){try{assert.doesNotMatch(readFileSync(path,'utf8'),/header(?:_down)?\s+(?:[-+]?Cache-Control|\{[^}]*Cache-Control)/i);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
});

test('framework HTML and RSC ISR headers have a bounded stale window',()=>{
 const require=createRequire(import.meta.url);
 const {getCacheControlHeader}=require('next/dist/server/lib/cache-control')as{getCacheControlHeader:(v:{revalidate:number;expire:number})=>string};
 assert.equal(nextConfig.expireTime,600);
 assert.equal(getCacheControlHeader({revalidate:300,expire:nextConfig.expireTime!}),'s-maxage=300, stale-while-revalidate=300');
 assert.equal(getCacheControlHeader({revalidate:0,expire:nextConfig.expireTime!}),'private, no-cache, no-store, max-age=0, must-revalidate');
});
