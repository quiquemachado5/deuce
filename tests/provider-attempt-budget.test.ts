import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveProviderAttempt,reconcileProviderAttempts,ProviderAttemptBudgetExceeded} from '../lib/provider-attempt-budget';
const now=Date.parse('2026-11-12T10:00:00Z');
const quota=(remaining:number|null,used:number)=>({today:{remaining_day:remaining,used_day:used,reset_at:'2026-11-12T22:00:00Z'}});
test('a fresh ledger allows only a usage probe until quota is known',()=>{
 assert.throws(()=>reserveProviderAttempt(undefined,false,now),ProviderAttemptBudgetExceeded);
 const probe=reserveProviderAttempt(undefined,true,now);assert.equal(probe.attempts,1);
 assert.throws(()=>reserveProviderAttempt(probe,false,now),ProviderAttemptBudgetExceeded);
 const known=reconcileProviderAttempts(probe,quota(210,100),now);assert.equal(known.verified,true);
 assert.equal(reserveProviderAttempt(known,false,now).remaining,209);
});
test('physical retries consume the reserve even if callers count one logical request',()=>{
 let ledger=reconcileProviderAttempts(reserveProviderAttempt(undefined,true,now),quota(202,100),now);
 ledger=reserveProviderAttempt(ledger,false,now);assert.equal(ledger.remaining,201);
 ledger=reserveProviderAttempt(ledger,false,now);assert.equal(ledger.remaining,200);
 assert.throws(()=>reserveProviderAttempt(ledger,false,now),e=>e instanceof ProviderAttemptBudgetExceeded&&e.reason==='reserve');
});
test('daily cap includes provider usage and reservations; failed attempts are not refunded',()=>{
 let ledger=reconcileProviderAttempts(reserveProviderAttempt(undefined,true,now),quota(900,398),now);
 ledger=reserveProviderAttempt(ledger,false,now);ledger=reserveProviderAttempt(ledger,false,now);
 assert.equal(ledger.usedEstimate,400);
 assert.throws(()=>reserveProviderAttempt(ledger,true,now),e=>e instanceof ProviderAttemptBudgetExceeded&&e.reason==='daily-cap');
 const lower=reconcileProviderAttempts(ledger,quota(900,1),now);assert.equal(lower.usedEstimate,400);
});
test('provider reset starts a new probe-only day, not a silently verified quota',()=>{
 const exhausted=reconcileProviderAttempts(reserveProviderAttempt(undefined,true,now),quota(0,1000),now);
 assert.throws(()=>reserveProviderAttempt(exhausted,true,now));
 const later=Date.parse('2026-11-12T22:00:01Z'),probe=reserveProviderAttempt(exhausted,true,later);
 assert.equal(probe.attempts,1);assert.equal(probe.verified,false);
 assert.throws(()=>reserveProviderAttempt(probe,false,later));
});
test('malformed stored state or unknown remaining quota fails closed',()=>{
 assert.throws(()=>reserveProviderAttempt({schema:1},true,now),/Invalid/);
 const probe=reserveProviderAttempt(undefined,true,now),unverified=reconcileProviderAttempts(probe,{},now);
 assert.equal(unverified.verified,false);assert.throws(()=>reserveProviderAttempt(unverified,false,now));
 const unlimited=reconcileProviderAttempts(probe,quota(null,399),now);
 assert.equal(reserveProviderAttempt(unlimited,false,now).usedEstimate,400);
 assert.throws(()=>reserveProviderAttempt({...unlimited,usedEstimate:400},false,now));
});
