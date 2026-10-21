import MetricVisual from './MetricVisual'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { StatisticItem } from './StatisticGroups'

/** Available findings, with definitions and sample sizes kept next to each measure. */
export default function DetailFindings({ items, title, id = 'hallazgos' }: { items: StatisticItem[]; title: string; id?: string }) {
  if (!items.length) return null
  return <section className="detail-findings editorial-section" id={id} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{title}</h2>
    <div className="finding-ledger">{items.map(item => <article key={item.key}>
      <strong className="finding-value">{item.value.toLocaleString('es-ES')}<small>{item.unit}</small></strong>
      <h3>{item.label}</h3>
      <p>{item.sample}</p><MetricVisual value={item.value} unit={item.unit} trend={item.trend} trendLabel={item.trendLabel}/>
      <p className="finding-definition">{item.definition}</p>
      {item.href && <Link href={item.href}>Explorar el dato <ArrowRight size={16} aria-hidden="true" /></Link>}
    </article>)}</div>
  </section>
}
