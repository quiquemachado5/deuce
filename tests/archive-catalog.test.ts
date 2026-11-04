import assert from 'node:assert/strict';
import test from 'node:test';
import {archiveKeyCatalog} from '../lib/archive-catalog';

test('archive catalog inventories operational objects without payload data',()=>{
  const version='a'.repeat(20);
  const catalog=archiveKeyCatalog([
    'reading-v2-manifest',`reading-v2-${version}-pack-0`,'detail-wta-modern-1','archive-wta-1980-W',
    'season-wta-2026','publish-status','wta-season-progress-2025','publish-status',
  ],new Date('2026-11-04T00:00:00.000Z'));
  assert.equal(catalog.objects,7);
  assert.deepEqual(catalog.generationVersions,[version]);
  assert.equal(catalog.categories.operations,1);
  assert.equal(catalog.categories.details,1);
  assert.equal(JSON.stringify(catalog).includes('modern-1'),false);
});
