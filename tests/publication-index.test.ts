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
