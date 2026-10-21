import { pointHeight } from '@/lib/quality'
import { criticalPoints } from '@/lib/editorial'
import type { Point } from '@/lib/types'

export default function DnaStrip({ points, label }: { points: Point[]; label: string }) {
  const known = criticalPoints(points)
  if (!known.length) return null
  const every = Math.ceil(known.length / 180)
  return <div className="dna-strip" role="img" aria-label={`${label}: muestra de ${known.length} bolas de break o de partido documentadas; la altura distingue ambas`}>
    {known.filter((_, index) => index % every === 0).map(point => <i key={point.point_number} className={point.winner === 1 ? 'first' : 'second'} style={{ height: `${pointHeight(point)}%` }} />)}
  </div>
}
