import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSeasonAnalytics} from '../lib/season-analytics';
import {mockMatches} from '../lib/mocks';
import type {Match} from '../lib/types';
import {compileNavigationProducts,navigationKey,buildTournamentOverview} from '../lib/navigation-products';
import {decodeMatchBrowserRow} from '../lib/match-browser-snapshot';
import {createPrefetchBudget,prefetchPath} from '../lib/navigation-prefetch';
import {observeClientTelemetry,renderPrometheusMetrics,telemetryRoute} from '../lib/runtime-metrics';
const fixture=(id:string,tour:'atp'|'wta',year:number,extra:Partial<Match>={}):Match=>({...mockMatches[0],match_id:id,tour,year,tournament:'Wimbledon',category:'Grand Slam',round:'Final',player1:{name:'One',seed:null},player2:{name:'Two',seed:null},winner:1,status:'finished',context:{format:tour==='wta'?'BO3':'BO5'},statistics:[],point_tape:[],score_summary:{...mockMatches[0].score_summary,games:extra.winner===2?[[4,6],[4,6],[4,6]]:tour==='wta'?[[6,4],[6,4]]:[[6,4],[6,4],[6,4]]},...extra});
test('entity projections preserve every identity across decades and isolate ATP/WTA',()=>{
 const matches=[fixture('a','atp',2000),fixture('b','atp',2026),fixture('c','wta',2026)];
 const products=compileNavigationProducts(matches,buildSeasonAnalytics(matches).players),entities=new Map(products.entities());
 assert.equal(products.index.count,3);
 const player=entities.get(products.index.players[navigationKey('atp','One')])!;
 assert.equal(player.record?.played,2);assert.equal(player.partition.fromYear,2000);assert.equal(player.partition.toYear,2026);
 assert.deepEqual(new Set(player.partition.rows.map(row=>decodeMatchBrowserRow(player.partition,row).match_id)),new Set(['a','b']));
 const women=entities.get(products.index.players[navigationKey('wta','One')])!;
 assert.deepEqual(women.partition.rows.map(row=>row[0]),['c']);
 const event=entities.get(products.index.tournaments[navigationKey('atp','Wimbledon')])!;
 assert.equal(event.overviews!['Grand Slam'].pieces.titles[0].value,2);
 assert.equal(event.overviews!['Grand Slam'].pieces.titles[0].proof,undefined);
 assert.deepEqual(compileNavigationProducts(matches).index,products.index);
});
test('precalculated tournament overview keeps category scope and completed results',()=>{
 const matches=[fixture('final','atp',2020),fixture('other','atp',2021,{round:'Semifinal',winner:2})];
 const overview=buildTournamentOverview(matches);
 assert.equal(overview.games,60);assert.equal(overview.sets,6);
 assert.deepEqual(overview.years,[2021,2020]);assert.equal(overview.editions[2020],1);
 assert.deepEqual(overview.finals,['final']);assert.equal(overview.pieces.titles[0].value,1);
 assert.deepEqual(overview.decades,[[2020,2]]);
});
test('prefetch preserves array filters, rejects external URLs and retries stale/invalidated routes',()=>{
 assert.equal(prefetchPath({pathname:'/partidos',query:{tour:'wta',year:[2023,2024]},hash:'#x'}),'/partidos?tour=wta&year=2023&year=2024');
 assert.equal(prefetchPath('//evil.test'),null);assert.equal(prefetchPath('https://evil.test'),null);
 const budget=createPrefetchBudget(100,2);assert.ok(budget.claim('/a',1));assert.equal(budget.claim('/a',2),false);
 assert.ok(budget.claim('/a',102));budget.invalidate('/a');assert.ok(budget.claim('/a',103));
 budget.claim('/b',104);budget.claim('/c',105);assert.ok(budget.claim('/a',106));
});
test('navigation telemetry has bounded route families and distinguishes filters from loading shells',()=>{
 assert.equal(telemetryRoute('/jugadores/private-name?q=secret'),'/jugadores/:slug');
 observeClientTelemetry({kind:'navigation',navigationType:'filter-transition',value:250,path:'/comparar?a=secret',device:'mobile'});
 assert.match(renderPrometheusMetrics(),/metric="filter-transition",device="mobile"/);
});
