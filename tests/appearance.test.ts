import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appearanceMode,courtSeason} from '../lib/appearance';
test('appearance defaults safely without accepting arbitrary stored values',()=>{assert.equal(appearanceMode(null),'classic');assert.equal(appearanceMode('dark'),'classic');assert.equal(appearanceMode('season'),'season')});
test('presentation calendar has explicit UTC clay and grass boundaries',()=>{
 for(const [date,season] of [['2026-03-31','hard'],['2026-04-01','clay'],['2026-06-07','clay'],['2026-06-08','grass'],['2026-07-14','grass'],['2026-07-15','hard'],['2027-01-01','hard']] as const)assert.equal(courtSeason(new Date(date+'T12:00:00Z')),season);
});
