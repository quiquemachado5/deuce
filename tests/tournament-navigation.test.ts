import test from 'node:test';
import assert from 'node:assert/strict';
import { tournamentArchiveOptions } from '../lib/tournament-navigation';
import type { Match } from '../lib/types';

const row=(tour:'atp'|'wta',year:number,category:string)=>({tour,year,category} as Match);

test('tournament navigation isolates edition years and categories by circuit',()=>{
  const options=tournamentArchiveOptions('miami',[
    row('atp',2024,'Masters 1000'),row('atp',2023,'Masters 1000'),
    row('wta',2024,'WTA 1000'),row('wta',2022,'WTA 1000'),
  ],'Masters 1000');
  assert.deepEqual(options.map(option=>[option.tour,option.editions.map(edition=>edition.year)]),[['atp',[2024,2023]],['wta',[2024,2022]]]);
  const women=new URL(options[1].editions[0].href,'https://deuce.test');
  assert.equal(women.searchParams.get('categoria'),'WTA 1000');
  assert.equal(women.searchParams.get('cuadro'),'wta');
  assert.equal(new URL(options[1].summaryHref,'https://deuce.test').searchParams.get('categoria'),'WTA 1000');
});

test('edition navigation preserves its category and falls back only to a category present that year',()=>{
  const [option]=tournamentArchiveOptions('event',[
    row('atp',2024,'ATP 250'),row('atp',2023,'ATP 500'),row('atp',2023,'ATP 250'),
    row('atp',2022,'Masters 1000'),row('atp',2022,'ATP 500'),
  ],'ATP 250');
  assert.deepEqual(option.editions.map(edition=>new URL(edition.href,'https://deuce.test').searchParams.get('categoria')),['ATP 250','ATP 250']);
  assert.equal(tournamentArchiveOptions('empty',[],'Grand Slam').length,0);
});

test('same-city events and mismatched levels cannot switch circuits',()=>{
 assert.deepEqual(tournamentArchiveOptions('paris',[row('atp',2026,'Masters 1000'),row('wta',2014,'WTA 500')],'Masters 1000').map(o=>o.tour),['atp']);
 assert.deepEqual(tournamentArchiveOptions('beijing',[row('atp',2026,'ATP 500'),row('wta',2026,'WTA 1000')],'ATP 500').map(o=>o.tour),['atp']);
 assert.deepEqual(tournamentArchiveOptions('madrid',[row('atp',2026,'Masters 1000'),row('wta',2026,'WTA 1000')],'WTA 1000','wta').map(o=>o.tour),['atp','wta']);
});
