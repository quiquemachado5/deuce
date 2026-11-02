import type { RecordManifest, RecordPages, Snapshot } from './snapshot';
import { compatibleManifest } from './generation';

type PieceReader = (artifact: string) => Promise<RecordPages>;

/** Load both circuit catalogues using the artifact names written by the snapshot builder. */
export async function loadBundledSnapshotPieces(manifest: RecordManifest, read: PieceReader): Promise<Snapshot['pieces']> {
  const atp = manifest.pieces.map(piece => ({ key: piece.id, artifact: `piece-${piece.id}` }));
  const wta = (manifest.circuitPieces?.wta || []).map(piece => ({ key: `wta-${piece.id}`, artifact: `piece-wta-${piece.id}` }));
  const entries = await Promise.all([...atp, ...wta].map(async piece => [piece.key, await read(piece.artifact)] as const));
  return Object.fromEntries(entries);
}

export function expectedBundledPieceCount(manifest: RecordManifest) {
  return manifest.pieces.length + (manifest.circuitPieces?.wta.length || 0);
}

/** Keep current-rule provider data; seed an empty store or migrate old rules. */
export function bundledSeedAction(existing: unknown): 'keep' | 'seed' | 'migrate' {
  if (compatibleManifest(existing)) return 'keep';
  return existing === undefined || existing === null ? 'seed' : 'migrate';
}
