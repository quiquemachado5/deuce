import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveCapacityStatus, parseArchiveStorageReport } from '../lib/cloud-archive';
import { createRemoteProbeCircuit } from '../lib/revista/read-records';

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
