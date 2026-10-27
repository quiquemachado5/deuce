import { assertPublishableArchive } from '../dataset-summary';
import type { Match } from '../types';
import type { RecordManifest } from './snapshot';

/**
 * A production UI build must never replace a newer published archive with an
 * older bundled checkout. Restore the immutable published generation first;
 * the normal release checks still verify every derived record afterwards.
 */
export async function preservePublishedArchive(
  local: Match[],
  published: Pick<RecordManifest, 'matchCount' | 'version'>,
  loadPublished: (version: string) => Promise<Match[] | undefined>,
) {
  if (local.length >= published.matchCount) return local;
  if (!Number.isSafeInteger(published.matchCount) || published.matchCount < 100_000
    || typeof published.version !== 'string' || !published.version) {
    throw new Error('Published archive baseline is invalid');
  }
  const restored = await loadPublished(published.version);
  if (!Array.isArray(restored) || restored.length !== published.matchCount) {
    throw new Error('Cannot restore the published archive baseline');
  }
  assertPublishableArchive(restored, published.matchCount);
  return restored;
}
