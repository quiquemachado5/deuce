import assert from 'node:assert/strict';
import test from 'node:test';
import { countryFlagDescriptor } from '../components/PlayerFlag';
import { countryLabel } from '../lib/player-bio';

test('country flags use local assets, safe emoji fallbacks and neutral historic badges', () => {
  assert.deepEqual(countryFlagDescriptor('esp'), { kind: 'asset', iso: 'es' });
  assert.deepEqual(countryFlagDescriptor('ven'), { kind: 'emoji', iso: 've', value: '🇻🇪' });
  assert.deepEqual(countryFlagDescriptor('yug'), { kind: 'neutral', code: 'YUG' });
  assert.deepEqual(countryFlagDescriptor('wor'), { kind: 'neutral', code: 'WOR' });
  assert.equal(countryLabel('ven'), 'Venezuela');
  assert.equal(countryLabel('tch'), 'Checoslovaquia (histórica)');
});
