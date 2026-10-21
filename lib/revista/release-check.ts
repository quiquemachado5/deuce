import type { RecordManifest } from './snapshot';

/** Intentional reductions require review, never an unnoticed degraded build. */
export function assertReleaseCoverage(previous: RecordManifest, current: RecordManifest) {
  if (!Number.isSafeInteger(previous.matchCount) || !Array.isArray(previous.pieces)) throw new Error('Published baseline is invalid');
  if (current.matchCount < previous.matchCount) throw new Error('Release would lose published matches');
  for (const metric of previous.pieces.filter(piece => piece.measured)) {
    const next = current.pieces.find(piece => piece.id === metric.id);
    if (!next || next.sample < metric.sample) throw new Error(`Release would lose measured coverage: ${metric.id}`);
  }
}
