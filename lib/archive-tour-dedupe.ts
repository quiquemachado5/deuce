type ArchiveTourRow = {
  tour?: 'atp' | 'wta';
  id?: number | string;
  source_id?: string | null;
  tournament?: string | null;
  event_date?: string | null;
  round?: string | null;
  score?: string | null;
  winner?: { name?: string | null } | null;
  loser?: { name?: string | null } | null;
};

function nameKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function scoreKey(value: string) {
  return value.replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Only identical documented results may share a key. Missing fields stay distinct. */
export function archiveTourDuplicateKey(row: ArchiveTourRow): string | null {
  const { tournament, event_date, round, score } = row;
  const winner = row.winner?.name;
  const loser = row.loser?.name;
  if (!tournament || !event_date || !round || !score || !winner || !loser) return null;
  const pair = [nameKey(winner), nameKey(loser)].sort();
  if (!pair[0] || !pair[1]) return null;
  return JSON.stringify([row.tour === 'wta' ? 'wta' : 'atp', nameKey(tournament), event_date.slice(0, 10), round.toUpperCase(), pair, nameKey(winner), scoreKey(score)]);
}

function sourceOrder(a: ArchiveTourRow, b: ArchiveTourRow) {
  const sourceA = a.source_id || '';
  const sourceB = b.source_id || '';
  if (sourceA && !sourceB) return -1;
  if (sourceB && !sourceA) return 1;
  const bySource = sourceA < sourceB ? -1 : sourceA > sourceB ? 1 : 0;
  if (bySource) return bySource;
  const idA = Number(a.id), idB = Number(b.id);
  if (Number.isFinite(idA) && Number.isFinite(idB)) return idA - idB;
  return String(a.id ?? '') < String(b.id ?? '') ? -1 : String(a.id ?? '') > String(b.id ?? '') ? 1 : 0;
}

/** Keep a deterministic source ID while preserving the original order of all retained rows. */
export function dedupeArchiveTourRows<T extends ArchiveTourRow>(rows: T[]): T[] {
  const canonical = new Map<string, T>();
  for (const row of rows) {
    const key = archiveTourDuplicateKey(row);
    if (!key) continue;
    const existing = canonical.get(key);
    if (!existing || sourceOrder(row, existing) < 0) canonical.set(key, row);
  }
  return rows.filter(row => {
    const key = archiveTourDuplicateKey(row);
    return !key || canonical.get(key) === row;
  });
}
