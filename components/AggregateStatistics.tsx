import { withYearGaps } from '@/lib/metric-series'
import MetricVisual from './MetricVisual'
import Link from 'next/link'
import MetricNavigation, { TopicNavigation } from './MetricNavigation'
import { archiveSummary, tournamentInsights } from '@/lib/archive-insights'
import { seasonInsights } from '@/lib/discoveries'
import { tournamentName } from '@/lib/labels'
import { TOURNAMENTS, type Match } from '@/lib/types'
import { ArrowRight } from 'lucide-react'

export default function AggregateStatistics({ matches, scope, query }: {
  matches: Match[]
  scope: 'archivo' | 'torneos'
  query: Record<string, string | undefined>
}) {
  const summary = archiveSummary(matches)
  const requested = summary.observations.find(observation => observation.metric.key === query.metric)
  const group = requested?.metric.group
    || summary.observations.find(observation => observation.metric.group === query.topic)?.metric.group
    || 'Resultados'
  const selected = requested || summary.observations.find(observation => observation.metric.group === group)
  const url = (key: string) => `/patterns?${new URLSearchParams(
    Object.entries({ ...query, scope, metric: key }).filter((entry): entry is [string, string] => !!entry[1]),
  )}`
  const groups = [...new Set(summary.observations.map(observation => observation.metric.group))]
  const rows = scope === 'torneos'
    ? tournamentInsights(matches).flatMap(tournament => {
      const observation = tournament.observations.find(item => item.metric.key === selected?.metric.key)
      return observation ? [{
        ...observation,
        name: tournamentName(tournament.name),
        category: tournament.category,
        slug: TOURNAMENTS.find(item => item.name === tournament.name)?.slug,
      }] : []
    }).sort((first, second) => second.value - first.value)
    : []
  const years = scope === 'archivo' && selected
    ? seasonInsights(matches).flatMap(season => {
      const observation = season.observations.find(item => item.metric.key === selected.metric.key)
      return observation ? [{ year: season.year, ...observation }] : []
    })
    : []
  const subject = matches.find(match => match.match_id === selected?.matchId)
  const timeline = withYearGaps(
    [...new Set(matches.map(match => match.year))]
      .sort((first, second) => first - second)
      .map(year => ({ label: String(year), value: years.find(item => item.year === year)?.value ?? null })),
  )
  const period = matches.length
    ? `${Math.min(...matches.map(match => match.year))}–${Math.max(...matches.map(match => match.year))}`
    : ''
  const max = Math.max(1, ...rows.map(row => row.value), ...years.map(row => row.value))

  return <>
    <TopicNavigation
      selected={group}
      choices={groups.map(item => ({
        key: item,
        label: item,
        count: summary.observations.filter(observation => observation.metric.group === item).length,
        url: url(summary.observations.find(observation => observation.metric.group === item)!.metric.key),
      }))}
    />
    <div className="statistics-layout">
      <MetricNavigation
        selected={selected?.metric.key || ''}
        choices={summary.observations
          .filter(observation => observation.metric.group === group)
          .map(observation => ({
            key: observation.metric.key,
            label: observation.metric.label,
            url: url(observation.metric.key),
          }))}
      />
      <div className="statistics-result">
        {selected ? <>
          <section className="aggregate-lead">
            <h2>{selected.metric.label}</h2>
            {subject && <Link className="figure-player" href={`/match/${subject.match_id}`}>
              {subject.player1.name}<span className="versus"> contra </span>{subject.player2.name}
            </Link>}
            <strong>
              {selected.value.toLocaleString('es-ES')}<small>{selected.metric.unit}</small>
              {selected.denominator !== undefined && <span className="sample-inline">
                {selected.numerator?.toLocaleString('es-ES')} de {selected.denominator.toLocaleString('es-ES')}
              </span>}
            </strong>
            <MetricVisual value={selected.value} unit={selected.metric.unit} />
            <p>{selected.metric.definition}</p>
            <p>{period} · Resultados completados y validados.</p>
            <p className="measure-sample">
              {selected.sample.toLocaleString('es-ES')} partidos medidos
              {selected.denominator
                ? ` · ${selected.numerator?.toLocaleString('es-ES')} de ${selected.denominator.toLocaleString('es-ES')} casos`
                : ''}.
            </p>
            {selected.matchId && <Link className="text-action" href={`/match/${selected.matchId}`}>
              Leer el partido <ArrowRight size={18} />
            </Link>}
          </section>
          {scope === 'torneos' ? <section className="comparison-ledger">
            <h3>Por torneo</h3>
            <p>Cada fila conserva su propia muestra y la categoría publicada.</p>
            {rows.map(row => <div key={`${row.name}-${row.category}`}>
              <Link href={row.slug ? `/partidos?tournament=${row.slug}` : '/partidos'}>
                <strong>{row.name}</strong>
                <small>{row.category} · {row.sample.toLocaleString('es-ES')} partidos</small>
              </Link>
              <b>
                {row.value.toLocaleString('es-ES')}{row.metric.unit}
                {row.denominator !== undefined && <span className="sample-inline">
                  {row.numerator} de {row.denominator}
                </span>}
              </b>
              <i style={{ width: `${row.value / max * 100}%` }} />
            </div>)}
          </section> : years.length > 1 && <section className="year-comparison">
            <h3>Cómo cambia con los años</h3>
            <div
              className="year-chart"
              role="group"
              aria-label={`Evolución anual de ${selected.metric.label}; valores en la tabla siguiente.`}
            >
              {timeline.map(point => {
                const row = years.find(item => String(item.year) === point.label)
                return row ? <Link
                  href={`/patterns?scope=archivo&metric=${selected.metric.key}&year=${row.year}`}
                  title={`${row.year}: ${row.value}${row.metric.unit} · ${row.sample} partidos`}
                  aria-label={`${row.year}: ${row.value}${row.metric.unit}`}
                  key={row.year}
                >
                  <i style={{ height: `${Math.max(1, row.value / max * 100)}%` }} />
                  <span>{row.year}</span>
                </Link> : <span className="metric-gap" key={point.label} aria-hidden="true">
                  <span>{point.label}</span>
                </span>
              })}
            </div>
            <details className="metric-detail">
              <summary>Ver todos los valores por temporada</summary>
              <table>
                <thead><tr><th>Año</th><th>Valor</th><th>Partidos medidos</th></tr></thead>
                <tbody>{[...years].reverse().map(row => <tr key={row.year}>
                  <th>{row.year}</th>
                  <td>{row.value.toLocaleString('es-ES')}{row.metric.unit}</td>
                  <td>{row.sample.toLocaleString('es-ES')}</td>
                </tr>)}</tbody>
              </table>
            </details>
          </section>}
        </> : <p>No hay partidos en esta selección. <Link href="/patterns">Restablecer filtros</Link></p>}
      </div>
    </div>
  </>
}
