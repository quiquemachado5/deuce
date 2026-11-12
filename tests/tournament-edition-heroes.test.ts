import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import heroes from '../lib/tournament-edition-hero-reviewed.json';
import {editionHeroPhotoForTournament,createEditionHeroResolver,type ReviewedEditionHero} from '../lib/tournament-media';
test('edition hero images have unique circuit/edition keys, local assets and provenance',()=>{
 const keys=new Set<string>();
 for(const row of heroes){
  assert.ok(existsSync('public'+row.photo.src),row.photo.src);
  assert.ok(row.photo.source.startsWith('https://'));
  assert.equal(row.photo.photoYear,row.year);
  for(const tour of row.tours){const key=`${row.tournament}|${row.year}|${tour}|${(row as {category?:string}).category||'unambiguous'}`;assert.ok(!keys.has(key),key);keys.add(key);}
 }
 assert.ok(heroes.length>=60);
});
test('a missing edition or the other circuit never receives a borrowed photo',()=>{
 assert.ok(editionHeroPhotoForTournament('Miami',2025,'wta'));
 assert.equal(editionHeroPhotoForTournament('Miami',1968,'wta'),null);
 assert.equal(editionHeroPhotoForTournament('Monte Carlo',2023,'wta'),null);
 assert.ok(editionHeroPhotoForTournament('Monte Carlo',2023,'atp'));
});
test('all four Grand Slams have edition-specific heroes for both circuits from 2000, excluding cancelled Wimbledon 2020',()=>{
 for(const tournament of ['Australian Open','Roland Garros','Wimbledon','US Open'])for(let year=2000;year<=2026;year++)for(const tour of ['atp','wta'] as const){
  if(tournament==='Wimbledon'&&year===2020)continue;
  const photo=editionHeroPhotoForTournament(tournament,year,tour);assert.ok(photo,`${tournament}|${year}|${tour}`);
  assert.equal(photo.photoYear,year);
 }
});

test('edition media never crosses historical categories, even when only one draw has a reviewed photo',()=>{
 const photo={src:'/pan-pacific.webp',alt:'Pan Pacific',credit:'Official',source:'https://example.com/pan-pacific'};
 const other={...photo,src:'/japan-open.webp'};
 const row={tournament:'Tokyo',year:2017,tours:['wta'],category:'WTA 500',requiresCategory:true,photo}as ReviewedEditionHero;
 const one=createEditionHeroResolver([row]);
 assert.equal(one('Tokyo',2017,'wta','WTA 500'),photo);
 assert.equal(one('Tokyo',2017,'wta','WTA 250'),null);
 assert.equal(one('Tokyo',2017,'wta'),null);
 assert.equal(one('Tokyo',2017,'atp','WTA 500'),null);
 const two=createEditionHeroResolver([row,{...row,category:'WTA 250',photo:other}]);
 assert.equal(two('Tokyo',2017,'wta','WTA 250'),other);
 assert.equal(two('Tokyo',2017,'wta','WTA 500'),photo);
 assert.equal(two('Tokyo',2017,'wta'),null);
 const mixed=createEditionHeroResolver([row,{...row,category:undefined,photo:other}]);
 assert.equal(mixed('Tokyo',2017,'wta','WTA 250'),null);
 const duplicate=createEditionHeroResolver([row,{...row,photo:other}]);
 assert.equal(duplicate('Tokyo',2017,'wta','WTA 500'),null);
 const unambiguous=createEditionHeroResolver([{...row,tournament:'Miami',requiresCategory:false}]);
 assert.equal(unambiguous('Miami',2017,'wta'),photo);
 assert.equal(unambiguous('Miami',2017,'wta','WTA 250'),null);
 const legacy=createEditionHeroResolver([{...row,tournament:'Miami',category:undefined,requiresCategory:false}]);
 assert.equal(legacy('Miami',2017,'wta'),photo);
 assert.equal(legacy('Miami',2017,'wta','WTA 1000'),photo);
});

test('reviewed heroes with multiple historical draws require the canonical category at lookup',()=>{
 const audit=JSON.parse(gunzipSync(readFileSync('data/reading/audit.json.gz')).toString())as{tournament:string;year:number;tour:string;category:string}[];
 const categories=new Map<string,Set<string>>();
 for(const row of audit){const key=`${row.tournament}|${row.year}|${row.tour}`;const values=categories.get(key)||new Set<string>();values.add(row.category);categories.set(key,values);}
 for(const raw of heroes){const row=raw as ReviewedEditionHero;for(const circuit of row.tours){const key=`${row.tournament}|${row.year}|${circuit}`;const values=categories.get(key);if(!values||values.size<2)continue;assert.ok(row.category&&values.has(row.category),`Missing reviewed category: ${key}`);assert.equal(row.requiresCategory,true,`Ambiguous draw must require category: ${key}`);assert.equal(editionHeroPhotoForTournament(row.tournament,row.year,circuit as'atp'|'wta'),null);for(const category of values)if(category!==row.category)assert.notEqual(editionHeroPhotoForTournament(row.tournament,row.year,circuit as'atp'|'wta',category)?.src,row.photo.src);}}
});
