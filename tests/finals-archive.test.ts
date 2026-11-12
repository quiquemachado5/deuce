import test from 'node:test';
import assert from 'node:assert/strict';
import {finalsIdentity} from '../lib/finals-identity';
import {finalsArchiveRows} from '../lib/finals-archive';
import {archiveMatches,archiveMatch,isReconstructedDetail} from '../lib/live-tennis';
import {prepareMatch,eligibleMatch,closedSet} from '../lib/quality';
import {canonicalTournamentName} from '../lib/tournament-identity';
import {reconcileSeasonResults} from '../lib/result-refresh';
import {editionReferenceMatches} from '../lib/verified-editions';
import {isInPublicationScope} from '../lib/publication-scope';
test('Finals identities exclude Elite Trophy, WCT, Next Gen and unrelated city tournaments',()=>{
 for(const tournament of ['NextGen Finals','Naples Finals WCT','Zhuhai','Tournament of Champions','Soviet Championships','Ginny Championships'])for(const tour of ['atp','wta'])assert.equal(finalsIdentity({tour,tournament,level:'F',event_date:'2018-11-01'}),null,tour+' '+tournament);
 assert.equal(finalsIdentity({tour:'atp',tournament:'Masters',level:'M',source_id:'atp:1979-605:1',event_date:'1980-01-07'})?.season,1979);
 assert.equal(finalsIdentity({tour:'wta',tournament:'Virginia Slims Championships 1',level:'W',event_date:'1986-03-17'})?.tournament,'WTA Finals · marzo de 1986');
 assert.equal(canonicalTournamentName('WTA Finals',2025,'WTA Finals','wta'),'WTA Finals');
 assert.equal(finalsIdentity({tour:'atp',tournament:'Masters Dec',level:'M',source_id:'atp:1986-605:1'})?.season,1986);
 for(const [source_id,tournament] of [['wta:1972-1038:1','Boca Raton'],['wta:1973-1047:1','Boca Raton'],['wta:1974-1027:1','Los Angeles']])assert.equal(finalsIdentity({tour:'wta',tournament,level:'W',source_id})?.category,'WTA Finals');
 assert.equal(finalsIdentity({tour:'wta',tournament:'Los Angeles',level:'W',source_id:'wta:1973-1005:16'}),null);
});
test('sealed Finals pack contains both tours without duplicate IDs',async()=>{
 const rows=await finalsArchiveRows();assert.ok(rows.length>=1580);assert.equal(new Set(rows.map(e=>e.kind+'|'+e.row.tour+'|'+e.row.id)).size,rows.length);
 assert.ok(rows.some(e=>e.row.tour==='wta'&&String(e.row.scheduled_time).startsWith('2026')));
});
test('Finals seasons include reviewed city aliases and the independently recovered 2015 draw',async()=>{
 const rows=await finalsArchiveRows();
 assert.equal(rows.filter(e=>e.row.tour==='atp'&&finalsIdentity(e.row)?.season===1986).length,15);
 for(const year of [1972,1973,1974])assert.ok(rows.some(e=>e.row.tour==='wta'&&finalsIdentity(e.row)?.season===year));
 const recovered=editionReferenceMatches.filter(m=>m.tour==='wta'&&m.category==='WTA Finals'&&m.year===2015).map(prepareMatch);
 assert.equal(recovered.length,15);assert.ok(recovered.every(eligibleMatch));assert.equal(recovered.filter(m=>m.round==='Fase de grupos').length,12);
 assert.equal(recovered.find(m=>m.round==='Final')?.player1.name,'Agnieszka Radwanska');
 assert.ok(recovered.every(m=>m.context?.resultSource?.startsWith('https://wtafiles.wtatennis.com/')&&m.context?.metadataSources?.length===2));
});
test('1972 preliminary circuit matches remain archived without becoming main-draw Finals wins',async()=>{
 const rows=(await archiveMatches(1972,true)).filter(m=>m.category==='WTA Finals');
 assert.equal(rows.filter(m=>isInPublicationScope(prepareMatch(m))).length,16);
 assert.equal(rows.filter(m=>/^Previa · ronda/.test(m.round)).length,46);
 assert.equal(isInPublicationScope({...rows[0],round:'Q2'}),false);
 assert.equal(isInPublicationScope({...rows[0],round:'Cuartos de final'}),true);
});
test('Tokyo 1970 tiebreak at five-all is valid only in the documented event',async()=>{
 const rows=(await archiveMatches(1970,true)).filter(m=>m.category==='ATP Finals').map(prepareMatch);
 assert.equal(rows.length,15);assert.ok(rows.every(eligibleMatch));assert.ok(rows.every(m=>m.round==='Fase de grupos'));
 assert.equal(closedSet([6,5]),false);
});
test('1986 keeps both WTA championships; five-set finals pass historical validation',async()=>{
 const rows=(await archiveMatches(1986,true)).filter(m=>m.category==='WTA Finals').map(prepareMatch);
 assert.equal(rows.filter(m=>m.round==='Final').length,2);assert.equal(new Set(rows.map(m=>m.tournament)).size,2);assert.ok(rows.every(eligibleMatch));
});
test('modern reconstructed tape never becomes observed pressure data',async()=>{
 const m=await archiveMatch('live-146930');assert.ok(m);const normalized=prepareMatch(m);assert.equal(normalized.point_tape.length,0);assert.equal(normalized.context?.rank1,null);assert.equal(normalized.context?.pointSource,'reconstructed');
});
test('mixed metadata or one synthetic tape row blocks observed-point classification',()=>{
 assert.equal(isReconstructedDetail({meta:{coverage:'from_start',point_source:'reconstructed'}}),true);
 assert.equal(isReconstructedDetail({meta:{coverage:'from_start',point_source:'observed'},tape:[{origin:'observed'},{origin:'reconstructed'}]}),true);
 assert.equal(isReconstructedDetail({meta:{coverage:'from_start',point_source:'observed'},tape:[{origin:'observed'}]}),false);
});
test('Riyadh null-tier recovery does not admit other WTA tournaments',async()=>{
 const rows=[{id:1,tour:'wta',tournament_id:'3195',tournament:'Finals - Riyadh',scheduled_time:'2026-11-10T12:00:00Z',tier:null},{id:2,tour:'wta',tournament_id:'99',tournament:'Some other tournament',scheduled_time:'2026-11-10T12:00:00Z',tier:null}];
 const result=await reconcileSeasonResults(2026,2026,{scope:'wta-main-v2',at:'2026-11-10T00:00:00Z',data:[]},async path=>({data:path.includes('tier=')?[]:rows,meta:{has_more:false,limit:200}}),'wta');
 assert.deepEqual(result.data.map(r=>r.id),[1]);
});
