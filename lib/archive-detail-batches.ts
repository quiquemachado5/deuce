/** Fetch only remote details absent from the immutable deployment snapshot. */
export async function loadMissingDetails<T>(
  keys: string[],
  bundled: ReadonlySet<string>,
  fetchBatch: (keys: string[]) => Promise<Array<{ key: string; payload: T }>>,
): Promise<Record<string, T>> {
  const missing = [...new Set(keys)].filter(key => !bundled.has(key));
  const result: Record<string, T> = {};
  for (let offset = 0; offset < missing.length; offset += 100) {
    const groups = Array.from({ length: Math.min(4, Math.ceil((missing.length - offset) / 25)) }, (_, i) => missing.slice(offset + i * 25, offset + (i + 1) * 25));
    const pages = await Promise.all(groups.map(fetchBatch));
    for (const row of pages.flat()) result[row.key.slice(7)] = row.payload;
  }
  return result;
}
