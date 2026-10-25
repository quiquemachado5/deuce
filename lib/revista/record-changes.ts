import type { RecordManifest, Snapshot } from './snapshot';

export type LeaderChange = {
  id: string; title: string; observedAt: string; fromVersion: string; toVersion: string;
  before: { names: string[]; value: number }; after: { names: string[]; value: number };
};
/** Observations of the published archive, not a fabricated history of sporting records. */
export function attachRecordChanges(previous: RecordManifest | null | undefined, current: RecordManifest): RecordManifest {
  if (!previous || previous.rulesVersion !== current.rulesVersion) return current;
  const history = previous.leaderChanges || [];
  if (previous.version === current.version) return { ...current, leaderChanges: history };
  const changes: LeaderChange[] = [];
  for (const next of current.pieces) {
    const before = previous.pieces.find(piece => piece.id === next.id);
    // Older snapshots did not retain ties. Do not pretend the first row was the only leader.
    if (!before?.leaders?.length || !next.leaders?.length || before.minimum !== next.minimum) continue;
    const a = before.leaders.map(row => row.name).sort(), b = next.leaders.map(row => row.name).sort();
    if (before.leader?.value === next.leader?.value && JSON.stringify(a) === JSON.stringify(b)) continue;
    changes.push({ id: next.id, title: next.title, observedAt: current.generatedAt, fromVersion: previous.version, toVersion: current.version,
      before: { names: a, value: before.leaders[0].value }, after: { names: b, value: next.leaders[0].value } });
  }
  return { ...current, leaderChanges: [...changes, ...history].slice(0, 60) };
}

export function assertSnapshotIntegrity(snapshot: Pick<Snapshot, 'manifest' | 'pieces'>) {
  for (const meta of snapshot.manifest.pieces) {
    if (!Number.isFinite(meta.sample) || meta.sample < 0 || !Number.isFinite(meta.minimum) || meta.minimum < 0) throw new Error(`Invalid sample: ${meta.id}`);
    const piece = snapshot.pieces[meta.id];
    if (!piece) throw new Error(`Missing statistic: ${meta.id}`);
    for (const rows of [piece.pages, piece.smallPages]) for (const page of Object.values(rows)) for (const row of page) {
      if (!Number.isFinite(row.value) || !Number.isFinite(row.sample) || row.sample < 0) throw new Error(`Non-finite statistic: ${meta.id}`);
      if (meta.percent && (row.value < 0 || row.value > 100 || row.sample <= 0)) throw new Error(`Invalid percentage: ${meta.id}`);
    }
  }
}
