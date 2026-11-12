import assert from 'node:assert/strict';
import test from 'node:test';
import {mockMatches} from '../lib/mocks';
import {compileMatchBrowser,decodeMatchBrowserRow} from '../lib/match-browser-snapshot';
import {buildPublicationIndex,comparePublicationIndexes,publicationMatchHash,validPublicationIndex} from '../lib/publication-index';

const source={...mockMatches[0],match_id:'publication-1',tour:'atp' as const,data_source:'api' as const};

test('publication hashes match full and compact public summaries',()=>{
  const browser=compileMatchBrowser([source]);
  const compact=decodeMatchBrowserRow(browser.partitions[0],browser.partitions[0].rows[0]);
  assert.equal(publicationMatchHash(source),publicationMatchHash(compact));
});

test('publication index detects additions and corrections and blocks deletion',()=>{
  const previous=buildPublicationIndex([source]);
  const corrected={...source,context:{...source.context,minutes:123}};
  const added={...source,match_id:'publication-2'};
  const comparison=comparePublicationIndexes(previous,buildPublicationIndex([corrected,added]));
  assert.equal(comparison.delta.corrected,1);
  assert.equal(comparison.delta.added,1);
  assert.ok(comparison.changes.every(row=>/^[a-f0-9]{24}$/.test(row.afterHash)));
  assert.throws(()=>comparePublicationIndexes(previous,buildPublicationIndex([added])),/remove a verified match/);
  assert.equal(validPublicationIndex(previous),true);
});

test('a malformed or duplicate previous index cannot silently hide a published identity',()=>{
 const previous=buildPublicationIndex([source]);
 const duplicate={...previous,count:2,entries:[previous.entries[0],previous.entries[0]]};
 assert.equal(validPublicationIndex(duplicate),false);
 assert.throws(()=>comparePublicationIndexes(duplicate,previous),/invalid/);
 for(const identity of ['atp:','wta:publication-1','atp:a/b','atp:with space'])assert.equal(validPublicationIndex({...previous,entries:[{...previous.entries[0],identity}]}),false);
});
test('a correction moving season invalidates both old and new seasonal aggregates',()=>{
 const previous=buildPublicationIndex([{...source,year:2023}]);
 const next=buildPublicationIndex([{...source,year:2024}]);
 const changed=comparePublicationIndexes(previous,next);
 assert.equal(changed.delta.corrected,1);assert.deepEqual(changed.delta.seasons,['atp:2023','atp:2024']);
});
