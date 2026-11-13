import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { internalRequest } from '../ops/internal-request.mjs'
import { activePublicationLease } from '../ops/release-policy.mjs'

async function server(t, handler) {
 const s=http.createServer(handler);await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>{s.closeAllConnections();s.close()});return `http://127.0.0.1:${s.address().port}`
}
test('internal publication waits for delayed headers and preserves non-success status',async t=>{
 const url=await server(t,(_q,r)=>setTimeout(()=>{r.writeHead(503);r.end('{"status":"busy"}')},40));
 assert.deepEqual(await internalRequest(url,{timeoutMs:1000}),{status:503,body:'{"status":"busy"}'});
});
test('internal publication has an absolute deadline and response byte limit',async t=>{
 const url=await server(t,(_q,r)=>setTimeout(()=>r.end('large body'),80));
 await assert.rejects(internalRequest(url,{timeoutMs:15}),/deadline exceeded/);
 await assert.rejects(internalRequest(url,{timeoutMs:1000,maximumBytes:2}),/exceeds limit/);
});
test('watchdog defers only a running publication with a fresh live bounded lease',()=>{
 const now=Date.now(),p={status:'running',attemptAt:new Date(now-1000).toISOString()},l={owner:'writer',expiresAt:new Date(now+5000).toISOString()};
 assert.equal(activePublicationLease(p,l,now),true);
 for(const [publication,lease] of [[{...p,status:'error'},l],[{...p,attemptAt:new Date(now-900001).toISOString()},l],[p,{...l,expiresAt:new Date(now-1).toISOString()}],[p,{...l,expiresAt:new Date(now+900001).toISOString()}],[p,{}]])assert.equal(activePublicationLease(publication,lease,now),false);
});
