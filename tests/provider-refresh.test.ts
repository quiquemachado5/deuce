import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeProviderRefresh} from '../lib/provider-refresh';
import {hasClosedModernResult} from '../lib/modern-result';
test('refresh replaces newer identities without colliding ATP/WTA ids',()=>{
  const base=[{id:1,tour:'atp',updated_at:'2026-01-01',value:'old'},{id:1,tour:'wta',value:'women'}];
  const merged=mergeProviderRefresh(base,[{id:1,tour:'atp',updated_at:'2026-02-01',value:'new'}],'atp');
  assert.equal(merged.length,2);assert.equal(merged[0].value,'new');assert.equal(merged[1].value,'women');
  assert.equal(mergeProviderRefresh(merged,[{...base[0]}],'atp')[0].value,'new');
  assert.throws(()=>mergeProviderRefresh(base,[{id:2,tour:'wta',value:'wrong'}],'atp'),/circuit/);
});
test('WTA Grand Slams finish in two sets; ATP BO5 needs three',()=>{
  const row={tour:'wta',tournament:'Wimbledon',format:'BO3',outcome:'completed',winner:1,score:{games:[[6,6],[3,4]]}};
  assert.equal(hasClosedModernResult(row),true);
  assert.equal(hasClosedModernResult({...row,tour:'atp',format:'BO5'}),false);
});
