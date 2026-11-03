import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { archiveCapacityStatus, parseArchiveStorageReport } from '../lib/cloud-archive';
import { browserIndexMatchesManifest, browserPartitionMatchesManifest, createRemoteProbeCircuit, fullPartitionMatchesManifest, selectCompressedArray } from '../lib/revista/read-records';
import { compileMatchBrowser } from '../lib/match-browser-snapshot';
import { mockMatches } from '../lib/mocks';
import { partitionMatches } from '../lib/revista/snapshot';
import type { Match } from '../lib/types';

test('remote manifest failures open a bounded circuit and a success closes it', () => {
  let time = 1_000;
  const circuit = createRemoteProbeCircuit(() => time, [100, 500]);

  assert.equal(circuit.canAttempt(), true);
  circuit.failed();
  assert.deepEqual(circuit.state(), { failures: 1, retryAt: 1_100 });
  assert.equal(circuit.canAttempt(), false);

  time = 1_100;
  assert.equal(circuit.canAttempt(), true);
  circuit.failed();
  assert.deepEqual(circuit.state(), { failures: 2, retryAt: 1_600 });

  time = 1_600;
  circuit.succeeded();
  assert.deepEqual(circuit.state(), { failures: 0, retryAt: 0 });
  assert.equal(circuit.canAttempt(), true);
});

test('browser and full shards reject same-count partition metadata swaps', () => {
  const matches:Match[]=[
    {...mockMatches[0],match_id:'partition-atp',tour:'atp',year:2024,data_source:'api'},
    {...mockMatches[0],match_id:'partition-wta',tour:'wta',year:2024,data_source:'api'},
  ];
  const browser=compileMatchBrowser(matches);
  const matchPartitions=partitionMatches(matches).map(group=>group.meta);
  const manifest={matchCount:matches.length,matchPartitions};
  assert.equal(browserIndexMatchesManifest(browser.index,manifest),true);

  const staleIndex={...browser.index,partitions:browser.index.partitions.map(partition=>partition.tour==='atp'
    ? {...partition,id:'matches-atp-2010s',fromYear:2010,toYear:2019}
    : partition)};
  assert.equal(browserIndexMatchesManifest(staleIndex,manifest),false);
  const swappedCircuitIndex={...browser.index,partitions:browser.index.partitions.map(partition=>({
    ...partition,tour:partition.tour==='atp'?'wta' as const:'atp' as const,
  }))};
  assert.equal(browserIndexMatchesManifest(swappedCircuitIndex,manifest),false);

  const atpMeta=matchPartitions.find(partition=>partition.tour==='atp')!;
  const atpBrowser=browser.partitions.find(partition=>partition.tour==='atp')!;
  assert.equal(browserPartitionMatchesManifest(atpBrowser,atpMeta),true);
  assert.equal(browserPartitionMatchesManifest({...atpBrowser,tour:'wta'},atpMeta),false);
  assert.equal(fullPartitionMatchesManifest([matches[0]],atpMeta),true);
  assert.equal(fullPartitionMatchesManifest([matches[1]],atpMeta),false);
});

test('detailed shards can be selected without materialising the complete JSON array', async () => {
  const rows=[
    {id:'first',label:'Llave { dentro } y acento á'},
    {id:'wanted',label:'texto con \\"comillas\\"'},
    {id:'last',label:'fin'},
  ];
  const compressed=gzipSync(JSON.stringify(rows));
  const complete=await selectCompressedArray<{id:string;label:string}>(Readable.from([compressed]),row=>row.id==='wanted');
  assert.deepEqual(complete,{selected:[rows[1]],count:3,complete:true});
  const early=await selectCompressedArray<{id:string;label:string}>(Readable.from([compressed]),row=>row.id==='first',true);
  assert.deepEqual(early,{selected:[rows[0]],count:1,complete:false});
});

test('archive capacity is fail-closed when storage cannot be measured', () => {
  const report = { relationBytes: 80, payloadBytes: 60, objects: 2, snapshots: 1, details: 1 };

  assert.equal(archiveCapacityStatus(undefined, 100), 'unknown');
  assert.equal(archiveCapacityStatus(report, Number.NaN), 'unknown');
  assert.equal(archiveCapacityStatus(report, 100), 'available');
  assert.equal(archiveCapacityStatus({ ...report, relationBytes: 100 }, 100), 'full');
  assert.equal(parseArchiveStorageReport([{
    relation_bytes: '80',
    payload_bytes: '60',
    object_count: 2,
    snapshot_count: 1,
    detail_count: 1,
  }])?.relationBytes, 80);
  assert.equal(parseArchiveStorageReport([{
    relation_bytes: 80,
    payload_bytes: 60,
    object_count: 2,
    snapshot_count: 1,
  }]), undefined);
  assert.equal(parseArchiveStorageReport([{
    relation_bytes: null,
    payload_bytes: 60,
    object_count: 2,
    snapshot_count: 1,
    detail_count: 1,
  }]), undefined);
  assert.equal(parseArchiveStorageReport([{
    relation_bytes: -1,
    payload_bytes: 60,
    object_count: 2,
    snapshot_count: 1,
    detail_count: 1,
  }]), undefined);
});
