/** Bounded, process-local cache. Concurrent readers share work; failures can retry. */
export function asyncCache<T>(ttlMs = 300_000, capacity = 24, ttlForValue?: (value: T) => number) {
  const entries = new Map<string, { expires: number; value: Promise<T> }>()
  const read = (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key)
    if (hit && hit.expires > Date.now()) return hit.value
    if (entries.size >= capacity) entries.delete(entries.keys().next().value!)
    const value = load().then(result => {
      const entry = entries.get(key)
      if (entry?.value === value) entry.expires = Date.now() + (ttlForValue?.(result) ?? ttlMs)
      return result
    }).catch(error => {
      if (entries.get(key)?.value === value) entries.delete(key)
      throw error
    })
    entries.set(key, { expires: Date.now() + ttlMs, value })
    return value
  }
  return Object.assign(read, { clear: () => entries.clear() })
}
