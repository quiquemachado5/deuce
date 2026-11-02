import test from 'node:test';
import assert from 'node:assert/strict';
import { circuitSectionHref, navigationCircuit } from '../lib/circuit-navigation';
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
});
