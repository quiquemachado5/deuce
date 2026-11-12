import test from 'node:test';
import assert from 'node:assert/strict';
import {safeLogFields,requestId,logEvent} from '../lib/structured-log';
test('logs remove credentials, private URL state, controls and oversized fields',()=>{
 const safe=safeLogFields({apiKey:'private',cookie:'session',authorization:'secret',url:'https://user:pass@example.com/path?token=private#fragment',message:'Bearer private\nnext',huge:'x'.repeat(2000)});
 assert.equal(safe.apiKey,undefined);assert.equal(safe.cookie,undefined);assert.equal(safe.authorization,undefined);
 assert.equal(safe.url,'https://example.com/path');assert.equal(safe.message,'Bearer [redacted] next');assert.equal((safe.huge as string).length,600);
});
test('untrusted request IDs cannot be reflected as invalid response headers',()=>{
 assert.equal(requestId(new Request('https://deuce.test',{headers:{'x-request-id':'valid-request:4'}})),'valid-request:4');
 assert.match(requestId(new Request('https://deuce.test',{headers:{'x-request-id':'<invalid>'}})),/^[a-f0-9-]{36}$/);
});
test('caller fields cannot overwrite the structured event envelope',()=>{
 const original=console.info,lines:string[]=[];console.info=x=>lines.push(String(x));
 try{logEvent('info','actual.event',{event:'spoofed',level:'error',at:'fake'});const row=JSON.parse(lines[0]);assert.equal(row.event,'actual.event');assert.equal(row.level,'info');assert.notEqual(row.at,'fake');}finally{console.info=original;}
});
