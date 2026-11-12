import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedMediaFetch} from '../build/approved-media-fetch.mjs';
test('media research refuses private, credentialed and lookalike destinations before fetching',async()=>{
 for(const url of ['http://commons.wikimedia.org/a','https://127.0.0.1/a','https://commons.wikimedia.org.evil.test/a','https://user:pass@upload.wikimedia.org/a','https://upload.wikimedia.org:4430/a'])await assert.rejects(approvedMediaFetch(url,{},()=>{assert.fail('network must not run')}),/Unapproved/);
});
test('redirects and oversized bodies cannot bypass the download boundary',async()=>{
 await assert.rejects(approvedMediaFetch('https://upload.wikimedia.org/a',{},async()=>new Response(null,{status:302,headers:{location:'http://169.254.169.254/'}})),/redirect/);
 await assert.rejects(approvedMediaFetch('https://upload.wikimedia.org/a',{},async()=>new Response('x',{headers:{'content-length':String(21*1024*1024)}})),/size/);
 await assert.rejects(approvedMediaFetch('https://upload.wikimedia.org/a',{},async()=>new Response(new Uint8Array(21*1024*1024))),/size/);
});
test('approved responses remain readable and HTTP limits propagate',async()=>{
 const response=await approvedMediaFetch('https://commons.wikimedia.org/w/api.php',{},async(_url,options)=>{assert.equal(options.redirect,'manual');return Response.json({ok:true})});
 assert.deepEqual(await response.json(),{ok:true});
 const limited=await approvedMediaFetch('https://commons.wikimedia.org/w/api.php',{},async()=>new Response('limited',{status:429}));assert.equal(limited.status,429);
});

test('explicit importer profiles cannot follow redirects or inherit an unlimited caller timeout',async()=>{
 const {createApprovedFetch}=await import('../build/approved-media-fetch.mjs');
 const request=createApprovedFetch(['www.wtatennis.com','photoresources.wtatennis.com'],{maximumBytes:8,timeoutMs:25});
 await assert.rejects(()=>request('https://www.wtatennis.com/players',{},async()=>new Response(null,{status:302,headers:{location:'http://169.254.169.254/'}})),/redirect/);
 await assert.rejects(()=>request('https://photoresources.wtatennis.com/photo',{},async()=>new Response(new Uint8Array(9))),/size budget/);
 const controller=new AbortController();let keepAlive=setTimeout(()=>{},1000);
 try{await assert.rejects(()=>request('https://www.wtatennis.com/players',{signal:controller.signal},async()=>new Response(new ReadableStream({pull(){return new Promise(()=>{})}}))),e=>e.name==='TimeoutError');}finally{clearTimeout(keepAlive);}
 await assert.rejects(()=>request('https://www.wtatennis.com.evil.example/players'),/Unapproved/);
 assert.throws(()=>createApprovedFetch(['127.0.0.1']),/Invalid/);
});
