import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonCanonical} from '../lib/comparison-canonical';
test('inverted player pairs share one canonical without losing period or competition',()=>{
 const a={a:'Roger Federer',b:'Rafael Nadal',surface:'clay',competition:'Grand Slam',fromYear:'2008',toYear:'2012'};
 const url=comparisonCanonical(a);
 assert.equal(url,comparisonCanonical({...a,a:a.b,b:a.a}));
 assert.equal(url,comparisonCanonical({...a,from:'2008',to:'2012'}));
 assert.notEqual(url,comparisonCanonical({...a,competition:'Masters 1000'}));
 assert.match(url,/from=2008&to=2012/);
 assert.equal(comparisonCanonical({tour:'atp',surface:'all',period:'career'}),'/comparar');
});
