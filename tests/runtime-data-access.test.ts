import test from 'node:test';
import assert from 'node:assert/strict';
import { mockMatches } from '../lib/mocks';
import { mergeTournamentEditionDetails } from '../lib/tournament-edition-data';
import { circuitMatchContext } from '../lib/match-context';
import { preparedMatch, preparedMatchDetail } from '../lib/revista/read-records';

test('edition detail preserves statistics while history and the second circuit remain navigable', () => {
  const detailed={...mockMatches[0],match_id:'edition-atp',tour:'atp' as const,year:2026};
  const summary={...detailed,statistics:[],point_tape:[]};
  const otherCircuit={...summary,match_id:'edition-wta',tour:'wta' as const};
  const otherYear={...summary,match_id:'edition-old',year:2025};
  const selected=mergeTournamentEditionDetails([summary,otherCircuit,otherYear],[detailed],[],2026,'atp');
  assert.deepEqual([...new Set(selected.map(match=>match.year))].sort(),[2025,2026]);
  assert.deepEqual(new Set(selected.map(match=>match.tour)),new Set(['atp','wta']));
  assert.strictEqual(selected.find(match=>match.match_id==='edition-atp'),detailed);
  assert.ok(selected.find(match=>match.match_id==='edition-atp')!.statistics.length>0);
  assert.ok(selected.find(match=>match.match_id==='edition-atp')!.point_tape.length>0);
  assert.equal(selected.find(match=>match.match_id==='edition-wta')!.statistics.length,0);
});

test('relationship context keeps competition-only matches inside their circuit', () => {
  const atp={...mockMatches[0],match_id:'context-atp',tour:'atp' as const};
  const wta={...mockMatches[0],match_id:'context-wta',tour:'wta' as const};
  const competition={...wta,match_id:'competition-only'};
  assert.deepEqual(circuitMatchContext([atp,wta],competition).map(match=>match.match_id),['context-wta']);
});

test('detail consumers share one cached loader and do not invoke context construction', () => {
  assert.strictEqual(preparedMatch,preparedMatchDetail);
});
