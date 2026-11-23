import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAustralianOpenLeader,parseRolandGarrosLeaders} from '../lib/official-records';

test('official honour-roll parsers retain the leader and provenance',()=>{
 const at='2026-11-23T00:00:00.000Z';
 const ao=parseAustralianOpenLeader('<label>Most Titles</label><span class="value">10 - Novak Djokovic (SRB)</span>',{id:'ao-atp',url:'https://ausopen.com/history/honour-roll/mens-singles',tour:'atp',tournament:'Australian Open',publisher:'Australian Open',parser:'ao'},at);
 assert.deepEqual({player:ao.player,titles:ao.titles,source:ao.source},{player:'Novak Djokovic',titles:10,source:'https://ausopen.com/history/honour-roll/mens-singles'});
 const item=(name:string,year:number)=>`<li><p class="player-name">${name}</p><p class="year">${year}</p></li>`;
 const rg=`<main><section class="man-container">${item('Rafael Nadal',2022)}${item('Rafael Nadal',2020)}${item('Novak Djokovic',2021)}</section><section class="woman-container">${item('Chris Evert',1986)}${item('Chris Evert',1985)}${item('Steffi Graf',1987)}</section></main>`;
 assert.deepEqual(parseRolandGarrosLeaders(rg,at).map(row=>[row.tour,row.player,row.titles]),[['atp','Rafael Nadal',2],['wta','Chris Evert',2]]);
});
