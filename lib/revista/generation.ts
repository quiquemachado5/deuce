import { isDeepStrictEqual } from 'node:util';
import type { Match } from '../types';
import type { PlayerRecord } from '../season-analytics';
import { summarizeDataset } from '../dataset-summary';
import { SNAPSHOT_SCHEMA, RULES_VERSION, type RecordManifest } from './snapshot';

export type FallbackReason = 'remote-unavailable' | 'remote-incompatible' | 'remote-incomplete' | 'not-published';
export type GenerationStatus = { source: 'bundled' | 'remote'; fallbackReason?: FallbackReason };
export type PreparedGeneration = GenerationStatus & {
  manifest: RecordManifest;
  matches: () => Promise<Match[]>;
  records: () => Promise<PlayerRecord[]>;
};

export function compatibleManifest(value: unknown): value is RecordManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as RecordManifest;
  return m.schema === SNAPSHOT_SCHEMA && m.rulesVersion === RULES_VERSION && m.mode === 'ARCHIVO REAL'
    && typeof m.version === 'string' && /^[a-f0-9]{20}$/.test(m.version)
    && typeof m.generatedAt === 'string' && Number.isFinite(Date.parse(m.generatedAt))
    && Number.isSafeInteger(m.matchCount) && m.matchCount > 0
    && Array.isArray(m.pieces) && Array.isArray(m.years) && Array.isArray(m.eraCuts)
    && !!m.summary && Array.isArray(m.summary.years) && !!m.summary.surfaces;
}

/** Select a whole generation, never a new manifest with old matches or players. */
export async function selectGeneration(
  bundled: PreparedGeneration,
  candidate: unknown,
  loadRemote: (manifest: RecordManifest) => Promise<{ matches: unknown; records: unknown }>,
  configured: boolean,
): Promise<PreparedGeneration> {
  if (!configured) return bundled;
  const fallback = (reason: FallbackReason) => ({ ...bundled, fallbackReason: reason });
  if (candidate === undefined) return fallback('remote-unavailable');
  if (candidate === null) return fallback('not-published');
  if (typeof candidate === 'object' && candidate && 'generatedAt' in candidate && typeof candidate.generatedAt === 'string'
    && Date.parse(candidate.generatedAt) <= Date.parse(bundled.manifest.generatedAt)) return bundled;
  if (!compatibleManifest(candidate)) return fallback('remote-incompatible');
  if (candidate.version === bundled.manifest.version || Date.parse(candidate.generatedAt) <= Date.parse(bundled.manifest.generatedAt)) return bundled;
  try {
    const { matches, records } = await loadRemote(candidate);
    if (!Array.isArray(matches) || matches.length !== candidate.matchCount || !Array.isArray(records) || !records.length) return fallback('remote-incomplete');
    const rows = matches as Match[], players = records as PlayerRecord[];
    if (rows.some(match => match.data_source === 'mock') || new Set(rows.map(match => match.match_id)).size !== rows.length
      || players.reduce((sum, player) => sum + player.played, 0) !== rows.length * 2
      || !isDeepStrictEqual(summarizeDataset(rows), candidate.summary)) return fallback('remote-incomplete');
    return { manifest: candidate, source: 'remote', matches: async () => rows, records: async () => players };
  } catch { return fallback('remote-incomplete'); }
}

export function generationMetadata(generation: Pick<PreparedGeneration, 'manifest' | 'source' | 'fallbackReason'>) {
  return { datasetVersion: generation.manifest.version, rulesVersion: generation.manifest.rulesVersion,
    generatedAt: generation.manifest.generatedAt, source: generation.source, fallbackReason: generation.fallbackReason || null };
}
