import { createHash } from 'node:crypto';
import { asyncCache } from '../async-cache';

export type ArtifactPacks = Record<string, string>;
export type ArtifactPack = { artifacts: Record<string, unknown> };
const manifests = new Map<string, ArtifactPacks>();
const packs = asyncCache<ArtifactPack | undefined>(300_000, 24);

/** Packs reduce Blob uploads without changing logical artifact identities. */
export async function* packArtifacts(rows: AsyncIterable<[string, unknown]>, maximumBytes = 8_000_000) {
  let artifacts: Record<string, unknown> = {}, bytes = 0;
  const pack = () => {
    const payload = { artifacts };
    return { id: `pack-${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`, payload };
  };
  for await (const [id, value] of rows) {
    const size = Buffer.byteLength(JSON.stringify({ [id]: value }));
    if (bytes && bytes + size > maximumBytes) { yield pack(); artifacts = {}; bytes = 0; }
    artifacts[id] = value; bytes += size;
  }
  if (bytes) yield pack();
}

export function registerArtifactPacks(version: string, mapping?: ArtifactPacks) {
  if (!mapping) return;
  if (manifests.size >= 3 && !manifests.has(version)) manifests.delete(manifests.keys().next().value!);
  manifests.set(version, mapping);
}

export async function readSnapshotArtifact(key: string, read: (key: string) => Promise<unknown>) {
  const match = /^reading-v2-([a-f0-9]{20})-(.+)$/.exec(key);
  const packId = match && manifests.get(match[1])?.[match[2]];
  if (!match || !packId) return read(key);
  if (!/^pack-[a-f0-9]{64}$/.test(packId)) return undefined;
  const packKey = `reading-v2-${match[1]}-${packId}`;
  const payload = await packs(packKey, async () => {
    const value = await read(packKey) as ArtifactPack | undefined;
    if (!value?.artifacts || createHash('sha256').update(JSON.stringify(value)).digest('hex') !== packId.slice(5)) throw new Error('Snapshot pack checksum mismatch');
    return value;
  });
  return payload?.artifacts[match[2]];
}

export function clearArtifactPacks() { packs.clear(); manifests.clear(); }
