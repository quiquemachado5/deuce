import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptedWikiContext,compareWikiBiography,enrichMatchAges,fetchWikiContexts} from '../lib/wikimedia-context';
import {mockMatches} from '../lib/mocks';

const claim=(value:unknown)=>({mainsnak:{datavalue:{value}}});
const entity={id:'Q100',lastrevid:123,labels:{en:{value:'Player A'}},claims:{P536:[claim('A001')],P569:[claim({time:'+1986-06-03T00:00:00Z',precision:11})]}};
const person={name:'Player A',tour:'atp' as const};
test('biographies require a matching tennis identity, circuit and immutable revision',()=>{
 const context=acceptedWikiContext(person,entity)!;
 assert.equal(context.birthday,'1986-06-03');assert.match(context.source,/oldid=123$/);
 assert.equal(acceptedWikiContext({...person,name:'Another person'},entity),undefined);
 assert.equal(acceptedWikiContext({...person,tour:'wta'},entity),undefined);
 assert.equal(acceptedWikiContext(person,{...entity,claims:{P569:entity.claims.P569}}),undefined);
 const conflicting={...entity,claims:{...entity.claims,P569:[...entity.claims.P569,claim({time:'+1987-06-03T00:00:00Z',precision:11})]}};
 assert.equal(acceptedWikiContext(person,conflicting)?.birthday,undefined);
});
test('playing hand is sporting metadata, units are normalized and conflicting facts stay unresolved',()=>{
 const context=acceptedWikiContext(person,{...entity,claims:{...entity.claims,P552:[claim({id:'Q3039938'})],P741:[claim({id:'Q789447'}),claim({id:'Q14420068'})],P2048:[claim({amount:'+1.85',unit:'http://www.wikidata.org/entity/Q11573'})]}})!;
 assert.equal(context.playingHand,'L');assert.equal(context.backhand,2);assert.equal(context.heightCm,185);
 const review=compareWikiBiography(context,{birthday:'1986-06-03',hand:'R'});
 assert.equal(review.find(row=>row.field==='playingHand')?.state,'conflict');assert.equal(review.find(row=>row.field==='birthday')?.state,'matched');
 const ambiguous=acceptedWikiContext(person,{...entity,claims:{...entity.claims,P2048:[claim({amount:'+175',unit:'http://www.wikidata.org/entity/Q174728'}),claim({amount:'+178',unit:'http://www.wikidata.org/entity/Q174728'})]}})!;
 assert.equal(ambiguous.heightCm,undefined);assert.deepEqual(ambiguous.contestedFields,['heightCm']);
 const general=acceptedWikiContext(person,{...entity,claims:{...entity.claims,P552:[claim({id:'Q3039938'})]}})!;assert.equal(general.playingHand,undefined);
});
test('age enrichment requires an exact valid day, preserves provider ages and circuit separation',()=>{
 const context=acceptedWikiContext(person,entity)!;
 const match={...mockMatches[0],tour:'atp' as const,player1:{name:'Player A',seed:null},context:{date:'2006-06-02',dateLabel:'Fecha del partido'}};
 const contexts={'atp:Player A':context};
 assert.equal(enrichMatchAges([match],contexts)[0].context?.age1,19);
 assert.equal(enrichMatchAges([{...match,context:{...match.context,date:'2006-06-03'}}],contexts)[0].context?.age1,20);
 for(const input of [{...match,tour:'wta' as const},{...match,context:{...match.context,date:'2006-02-30'}},{...match,context:{...match.context,dateLabel:'Inicio de la edición'}}])assert.equal(enrichMatchAges([input],contexts)[0],input);
 const provider={...match,context:{...match.context,age1:21}};assert.equal(enrichMatchAges([provider],contexts)[0],provider);
 assert.equal(enrichMatchAges([match],contexts)[0].context?.metadataSources?.[0].url,context.source);
});
test('public reads respect their request ceiling and preserve prior context on rate limiting',async()=>{
 let calls=0;
 const fetcher:typeof fetch=async()=>{calls++;return Response.json(calls===1?{query:{pages:{1:{title:'Player A',pageprops:{wikibase_item:'Q100'}}}}}:{entities:{Q100:entity}});};
 const result=await fetchWikiContexts([person],{}, {maximumRequests:2,fetcher});assert.equal(calls,2);assert.ok(result.contexts['atp:Player A']);
 const previous=result.contexts;
 const limited=await fetchWikiContexts([person],previous,{maximumRequests:4,fetcher:async()=>new Response('',{status:429})});
 assert.equal(limited.calls,1);assert.match(limited.error!,/429/);assert.deepEqual(limited.contexts,previous);
 calls=0;await fetchWikiContexts([person],{}, {maximumRequests:1,fetcher});assert.equal(calls,0);
});
