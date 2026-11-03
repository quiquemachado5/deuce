export type AsyncCacheOptions<T> = {
  /** Estimated bytes or another consistent unit. Zero keeps entry-count-only behavior. */
  maxWeight?: number;
  weight?: (value: T) => number;
};

/** Bounded LRU process cache. Concurrent readers share work; failures can retry. */
export function asyncCache<T>(ttlMs = 300_000, capacity = 24, ttlForValue?: (value: T) => number, options: AsyncCacheOptions<T> = {}) {
  const entries = new Map<string, { expires: number; value: Promise<T>; weight: number }>()
  const counters = { hits: 0, misses: 0, evictions: 0, failures: 0 }
  const maxWeight = Math.max(0, options.maxWeight || 0)
  let weight = 0
  const remove = (key: string, eviction = false) => {
    const entry = entries.get(key)
    if (!entry) return
    entries.delete(key)
    weight = Math.max(0, weight - entry.weight)
    if (eviction) counters.evictions++
  }
  const enforceBounds = () => {
    while (entries.size > capacity || (maxWeight > 0 && weight > maxWeight)) {
      const oldest = entries.keys().next().value
      if (oldest === undefined) break
      remove(oldest, true)
    }
  }
  const read = (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key)
    if (hit && hit.expires > Date.now()) {
      counters.hits++
      entries.delete(key)
      entries.set(key, hit)
      return hit.value
    }
    if (hit) remove(key)
    counters.misses++
    const value = load().then(result => {
      const entry = entries.get(key)
      if (entry?.value === value) {
        entry.expires = Date.now() + (ttlForValue?.(result) ?? ttlMs)
        const nextWeight = Math.max(0, Math.ceil(options.weight?.(result) || 0))
        weight += nextWeight - entry.weight
        entry.weight = nextWeight
        enforceBounds()
      }
      return result
    }).catch(error => {
      counters.failures++
      if (entries.get(key)?.value === value) remove(key)
      throw error
    })
    entries.set(key, { expires: Date.now() + ttlMs, value, weight: 0 })
    enforceBounds()
    return value
  }
  return Object.assign(read, {
    clear: () => { entries.clear(); weight = 0 },
    stats: () => ({ ...counters, entries: entries.size, capacity, weight, maxWeight }),
  })
}
