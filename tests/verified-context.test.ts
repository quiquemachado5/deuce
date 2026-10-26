import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mockMatches } from '../lib/mocks';
import { verifiedContext, matchContextReferences } from '../lib/verified-context';
import { playerPhoto } from '../lib/player-imagery';
import additions from '../lib/player-photo-additions.json';
import type { Match } from '../lib/types';
const base=mockMatches[0];
test('verified match dates require both identities, the edition and the score',()=>{
 const ref=matchContextReferences[0];
 const match:Match={...base,tournament:ref.tournament,year:ref.year,player1:{name:ref.players[0],seed:null},player2:{name:ref.players[1],seed:null},score_summary:{...base.score_summary,games:ref.games},context:{date:'2008-06-23',dateLabel:'Inicio del torneo'}};
 assert.equal(verifiedContext(match).context?.date,'2008-07-06');
 assert.equal(verifiedContext({...match,year:2007}).context?.date,'2008-06-23');
 assert.equal(verifiedContext({...match,player2:{name:'Other',seed:null}}).context?.date,'2008-06-23');
 assert.equal(verifiedContext({...match,score_summary:{...match.score_summary,games:[[6,4],[6,4],[6,4]]}}).context?.date,'2008-06-23');
 const reverse={...match,player1:match.player2,player2:match.player1,score_summary:{...match.score_summary,games:ref.games.map(([a,b])=>[b,a])}};
 assert.equal(verifiedContext(reverse).context?.date,'2008-07-06');
});
test('enrichment preserves exact dates and known measurements and is idempotent',()=>{
 const ref=matchContextReferences[1];const match:Match={...base,tournament:ref.tournament,year:ref.year,player1:{name:ref.players[0],seed:null},player2:{name:ref.players[1],seed:null},score_summary:{...base.score_summary,games:ref.games},context:{date:ref.date,dateLabel:'Fecha del partido',minutes:665}};
 const enriched=verifiedContext(match);assert.equal(enriched.context?.endDate,'2010-06-24');assert.equal(enriched.context?.minutes,665);assert.deepEqual(verifiedContext(enriched),enriched);
});
test('edition classifications do not extrapolate and Davis surfaces remain unknown',()=>{
 const match:Match={...base,tournament:'Canada',year:2026,category:'ATP Tour · nivel no especificado',surface:'unknown'};
 assert.equal(verifiedContext(match).category,'Masters 1000');assert.equal(verifiedContext({...match,year:1980}).category,match.category);
 const davis=verifiedContext({...match,tournament:'Davis Cup - World Group'});assert.equal(davis.category,'Copa Davis');assert.equal(davis.surface,'unknown');
});
test('documented portraits resolve archive spellings and preserve source and licence',()=>{
 for(const photo of Object.values(additions)){assert.ok(existsSync('public'+photo.src),photo.src);assert.ok(existsSync('public'+photo.thumbnail));assert.match(photo.source,/commons.wikimedia.org/);assert.ok(photo.licenseUrl);assert.match(photo.credit,/CC/);}
 for(const name of ['Ilie Nastase','Bjorn Borg','Wojtek Fibak','Zeljko Franulovic','Vincent Spadea','Àlex Corretja'])assert.ok(playerPhoto(name),name);
});
