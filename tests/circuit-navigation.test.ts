import test from 'node:test';
import assert from 'node:assert/strict';
import { circuitSectionHref, globalSearchCircuit, navigationCircuit } from '../lib/circuit-navigation';
import { matchSearchUrl } from '../lib/match-search-url';

test('circuit navigation preserves WTA across every shared archive section',()=>{
  const expected={
    matches:'/buscar?tour=wta',
    records:'/records?tour=wta',
    players:'/jugadores?tour=wta',
    tournaments:'/torneos?circuito=wta',
    compare:'/comparar?tour=wta',
  } as const;
  for(const [section,href] of Object.entries(expected)){
    assert.equal(circuitSectionHref(section as keyof typeof expected,'wta'),href);
  }
  assert.equal(navigationCircuit('/wta',new URLSearchParams()),'wta');
  assert.equal(navigationCircuit('/torneos/roland-garros',new URLSearchParams('cuadro=wta')),'wta');
  assert.equal(navigationCircuit('/match/wta-123',new URLSearchParams()),'wta');
  assert.equal(navigationCircuit('/buscar',new URLSearchParams()),'atp');
});

test('ATP match URLs stay canonical while WTA remains explicit',()=>{
  assert.equal(matchSearchUrl({tour:'atp',q:'Nadal'}),'/buscar?q=Nadal');
  assert.equal(matchSearchUrl({tour:'wta',q:'Swiatek'}),'/buscar?tour=wta&q=Swiatek');
  assert.equal(matchSearchUrl({tour:'all',q:'final'}),'/buscar?tour=all&q=final');
});

test('global search spans both circuits only outside a circuit section',()=>{
  assert.equal(globalSearchCircuit('/',new URLSearchParams()),'all');
  assert.equal(globalSearchCircuit('/info',new URLSearchParams()),'all');
  assert.equal(globalSearchCircuit('/buscar',new URLSearchParams('tour=all')),'all');
  assert.equal(globalSearchCircuit('/buscar',new URLSearchParams()),'atp');
  assert.equal(globalSearchCircuit('/records',new URLSearchParams('tour=wta')),'wta');
  assert.equal(globalSearchCircuit('/torneos/wimbledon',new URLSearchParams('cuadro=wta')),'wta');
  assert.equal(globalSearchCircuit('/wimbledon/2025',new URLSearchParams()),'atp');
  assert.equal(globalSearchCircuit('/match/wta-123',new URLSearchParams()),'wta');
});
