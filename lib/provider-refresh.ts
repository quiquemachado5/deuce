type Row = { id?: unknown; tour?: unknown; updated_at?: unknown; result_restated_at?: unknown; [key: string]: unknown };

/** Refreshes replace identities, never circuits. An older download cannot undo a restatement. */
export function mergeProviderRefresh<T extends Row>(baseline: readonly T[], refreshed: readonly T[], tour: 'atp'|'wta'): T[] {
  const rows = new Map(baseline.map(row => [`${row.tour || 'atp'}:${row.id}`, row]));
  for (const row of refreshed) {
    if (row.tour !== tour || row.id == null) throw new Error('Invalid circuit or identity in provider refresh');
    const key = `${tour}:${row.id}`, previous = rows.get(key);
    const time = (value: T) => Math.max(0, ...[value.updated_at, value.result_restated_at].map(at => Date.parse(String(at || '')) || 0));
    if (!previous || time(row) >= time(previous)) rows.set(key, row);
  }
  return [...rows.values()];
}
