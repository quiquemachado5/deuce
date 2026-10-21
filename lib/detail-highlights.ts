type Measured = { key: string; value: number }

// Editorial priority, not a claim of statistical significance. Rates arrive with
// the existing analytics engine's minimum sample; missing observations stay out.
const playerChapters = [
  ['two-set-comebacks', 'matchpoint-rescues', 'first-set-comebacks', 'five-set-wins'],
  ['top10-wins', 'number-one-wins', 'finals', 'slam-finals', 'opponents'],
  ['five-set-rate', 'tiebreak-rate', 'thirty-all-games', 'aces-per-match', 'deciding-rate', 'straight-set-rate'],
]
const editionChapters = [
  ['comeback-share', 'two-down-share', 'final-comeback-share'],
  ['longest', 'most-games'],
  ['tiebreak-share', 'deciding-share', 'aces-average', 'straight-share'],
]
export function detailHighlights<T extends Measured>(items: T[], scope: 'player' | 'edition'): T[] {
  const available = new Map(items.filter(item => Number.isFinite(item.value) && item.value > 0).map(item => [item.key, item]))
  return (scope === 'player' ? playerChapters : editionChapters).flatMap(chapter => {
    const key = chapter.find(candidate => available.has(candidate))
    return key ? [available.get(key)!] : []
  })
}
